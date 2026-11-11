// Book › a team (web `TeamList`): the people in it, free ones first. Add
// people, then send them one booking request.
import { router, Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LiveGate, useMessage, useRefresh } from '@/data';
import {
  FAMILIES,
  areaOf,
  firstName,
  joinNames,
  money,
  openAnswer,
  rankTalent,
  standing,
  standingLabel,
  workedWith,
  type Data,
  type Member,
  type Service,
  type Standing,
} from '@/domain';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import {
  Badge,
  Button,
  ChipGroup,
  Empty,
  Icon,
  Photo,
  Screen,
  StickyAction,
  Text,
  Ticket,
  type IconName,
} from '@/ui';

import { parseWhen, savedWhen, setWhen as keepWhen, whenDays, whenParams, type When } from './when';
import { WhenBar } from './WhenBar';

const ANY = '__any';

export function TeamList({ team, dates, time }: { team: string; dates?: string; time?: string }) {
  const t = useTheme();
  const family = FAMILIES[team];
  const header = (
    <Stack.Screen
      options={{
        title: family ? team : '',
        headerLargeTitleEnabled: true,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: t.c.page },
        headerLargeTitleStyle: { fontFamily: fonts.serif, color: t.c.text },
      }}
    />
  );
  return (
    <LiveGate header={header} loading={{ count: 3 }}>
      {({ data, me }) =>
        family ? (
          <TeamListBody data={data} venue={me.id} team={team} dates={dates} time={time} header={header} />
        ) : (
          <Screen>
            {header}
            <Empty
              title="Team not found"
              action={{ label: 'Back to Book', onPress: () => (router.canGoBack() ? router.back() : router.navigate('/v/book')) }}
            />
          </Screen>
        )
      }
    </LiveGate>
  );
}

function TeamListBody({
  data,
  venue,
  team,
  dates,
  time,
  header,
}: {
  data: Data;
  venue: string;
  team: string;
  dates?: string;
  time?: string;
  header: ReactNode;
}) {
  const t = useTheme();
  const refresh = useRefresh();
  const [when, setWhenState] = useState<When>(() => parseWhen(dates, time) ?? savedWhen());
  const [role, setRole] = useState<string | undefined>();
  const [picked, setPicked] = useState<string[]>([]);
  const family = FAMILIES[team];

  const days = whenDays(when);
  const { free, unavailable } = rankTalent(data, venue, team, role, days);
  const people = [...free, ...unavailable];
  const names = picked.map((id) => {
    const m = data.members.find((x) => x.id === id);
    return m ? firstName(m) : 'Someone';
  });
  const toNames = picked.length > 2 ? `${picked.length} people` : joinNames(names);

  const change = (next: When) => {
    setWhenState(next);
    keepWhen(next);
    // Keep the route in step without reloading the list.
    if (next.dates.length) router.setParams(whenParams(next));
  };

  return (
    <Screen
      {...refresh}
      gap="lg"
      footer={
        picked.length > 0 ? (
          <StickyAction
            primary={{
              label: `Send booking request to ${toNames}`,
              onPress: () =>
                router.push({
                  pathname: '/compose',
                  params: { team, to: picked.join(','), ...(role ? { position: role } : {}) },
                }),
            }}
          />
        ) : undefined
      }
    >
      {header}
      <Text variant="callout" color="muted" tabular style={{ marginTop: -t.space.sm }}>
        {`${free.length} available`}
      </Text>
      <WhenBar value={when} onChange={change} />
      <ChipGroup
        accessibilityLabel="Position"
        options={[{ value: ANY, label: 'Any position' }, ...family.roles.map((r) => ({ value: r, label: r }))]}
        value={role ?? ANY}
        allowDeselect={false}
        onChange={(v) => setRole(!v || v === ANY ? undefined : v)}
      />
      {people.length === 0 ? (
        <Empty icon="people" title="Nobody in this team yet" />
      ) : (
        people.map((p) => (
          <TalentCard
            key={p.id}
            data={data}
            venue={venue}
            talent={p}
            days={days}
            picked={picked.includes(p.id)}
            onPick={(on) => setPicked(on ? [...picked, p.id] : picked.filter((id) => id !== p.id))}
          />
        ))
      )}
      <Ticket
        onPress={() => router.push({ pathname: '/compose', params: { team } })}
        accessibilityLabel={`Can’t find anyone? Post a job for ${role ? `every ${role}` : `all ${team} staff`}`}
      >
        <View style={[styles.row, { gap: t.space.md }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline">Can’t find anyone?</Text>
            <Text variant="subhead" color="muted">
              {`Post a job for ${role ? `every ${role}` : `all ${team} staff`}`}
            </Text>
          </View>
          <Icon name="forward" size={14} color="faint" weight="semibold" />
        </View>
      </Ticket>
    </Screen>
  );
}

const STATUS_ICON: Record<Standing, IconName> = {
  free: 'dot',
  booked: 'cancelled',
  'not-free': 'cancelled',
  'other-hours': 'clock',
  'not-set': 'help',
};

/**
 * One person on a team list, compact so a screen shows several: a 4:5 photo
 * on the left, the serif name, where they stand and positions · area on the
 * right; pay and top skills, then the actions in one row. The big photo
 * lives on their profile.
 */
function TalentCard({
  data,
  venue,
  talent: p,
  days,
  picked,
  onPick,
}: {
  data: Data;
  venue: string;
  talent: Member;
  days: Service[];
  picked: boolean;
  onPick: (on: boolean) => void;
}) {
  const t = useTheme();
  const message = useMessage();
  const valid = days.length > 0;
  const where = valid ? standing(data, p.id, days) : 'not-set';
  const status = valid ? standingLabel(data, p.id, days) : 'Choose a time';
  const free = valid && where === 'free';
  const worked = workedWith(data, venue, p.id);
  // Already answering one of this venue's asks for these hours: go there
  // instead of sending a second one.
  const open = valid ? openAnswer(data, venue, p.id, days) : undefined;
  const first = firstName(p);
  const facts = `${p.roles.length ? `${p.roles.join(' · ')} · ` : ''}${areaOf(p)}`;
  const pay = p.minRate ? `From ${money(p.minRate)} / hour` : 'No minimum pay set';
  const skills = p.skills.slice(0, 3).join(' · ');
  const photoWidth = Math.round(112 * Math.min(t.scale, 1.15));

  return (
    <Ticket padding={t.space.md} gap={t.space.md}>
      <Pressable
        onPress={() => router.push(`/talent/${p.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${p.name}, ${status}${worked ? ', Worked with you' : ''}, ${facts}`}
        accessibilityHint="Opens their profile"
        style={({ pressed }) => [styles.top, { gap: t.space.md, opacity: pressed ? 0.8 : 1 }]}
      >
        <Photo uri={p.photo} name={p.name} width={photoWidth} radius={t.radius.md} accessibilityLabel="" />
        <View style={{ flex: 1, minWidth: 0, gap: t.space.xs }}>
          <Text variant="title2" numberOfLines={2}>
            {p.name}
          </Text>
          <View style={[styles.wrap, { gap: t.space.xs }]}>
            <Badge label={status} tone={free ? 'good' : 'neutral'} icon={free ? undefined : valid ? STATUS_ICON[where] : 'clock'} />
            {worked ? <Badge label="Worked with you" tone="good" icon="worked" /> : null}
          </View>
          <Text variant="subhead" color="muted" numberOfLines={3}>
            {facts}
          </Text>
        </View>
      </Pressable>
      <View style={{ gap: t.space.xxs }}>
        <Text variant="callout" tabular>
          {pay}
        </Text>
        {skills ? (
          <Text variant="footnote" color="muted">
            {skills}
          </Text>
        ) : null}
      </View>
      <View style={[styles.row, { gap: t.space.sm }]}>
        {open ? (
          <Button
            label={open.status === 'booked' ? 'Booked' : open.status === 'invited' ? 'Request sent' : 'Said yes · Book'}
            variant="secondary"
            icon={open.status === 'booked' ? 'check' : open.status === 'invited' ? 'waiting' : undefined}
            accessibilityHint="Opens that shift"
            onPress={() => router.push(`/shift/${open.shift}`)}
            style={{ flex: 1 }}
            fullWidth
          />
        ) : (
          // The toggle reads as a checkbox with its state (the kit Button has no selected state).
          <View
            style={{ flex: 1 }}
            accessible
            accessibilityRole="checkbox"
            accessibilityLabel={`Choose ${p.name}`}
            accessibilityValue={{ text: picked ? 'Added' : 'Add to request' }}
            accessibilityState={{ checked: picked }}
            accessibilityActions={[{ name: 'activate' }]}
            onAccessibilityAction={() => onPick(!picked)}
          >
            <Button
              label={picked ? 'Added' : 'Add to request'}
              icon={picked ? 'check' : 'add'}
              variant="secondary"
              onPress={() => onPick(!picked)}
              fullWidth
            />
          </View>
        )}
        <Button
          label="Message"
          icon="message"
          variant="secondary"
          accessibilityLabel={`Message ${first}`}
          onPress={() => void message(p.id)}
          style={{ flex: 1 }}
          fullWidth
        />
      </View>
    </Ticket>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
