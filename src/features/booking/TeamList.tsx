// Book › a team (web `TeamList`): the people in it, free ones first. Add
// people, then send them one booking request.
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useLive } from '@/data/store';
import {
  FAMILIES,
  areaOf,
  firstName,
  joinNames,
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
  Loading,
  Photo,
  Screen,
  StickyAction,
  Text,
  Ticket,
  WaitingForApproval,
  type IconName,
} from '@/ui';

import { money, useMessage } from './parts';
import { parseWhen, savedWhen, setWhen as keepWhen, whenDays, whenParams, type When } from './when';
import { WhenBar } from './WhenBar';

const ANY = '__any';

export function TeamList({ team, dates, time }: { team: string; dates?: string; time?: string }) {
  const t = useTheme();
  const live = useLive();
  const { data, me, approved } = live;
  const [when, setWhenState] = useState<When>(() => parseWhen(dates, time) ?? savedWhen());
  const [role, setRole] = useState<string | undefined>();
  const [picked, setPicked] = useState<string[]>([]);
  const family = FAMILIES[team];

  const header = (
    <Stack.Screen
      options={{
        title: family ? team : '',
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: t.c.page },
        headerLargeTitleStyle: { fontFamily: fonts.serif, color: t.c.text },
      }}
    />
  );
  if (!data || !me)
    return (
      <Screen>
        {header}
        <Loading count={2} />
      </Screen>
    );
  if (!approved)
    return (
      <Screen>
        {header}
        <WaitingForApproval />
      </Screen>
    );
  if (!family)
    return (
      <Screen>
        {header}
        <Empty
          title="Team not found"
          action={{ label: 'Back to Book', onPress: () => (router.canGoBack() ? router.back() : router.replace('/v/book')) }}
        />
      </Screen>
    );

  const days = whenDays(when);
  const { free, unavailable } = rankTalent(data, me.id, team, role, days);
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
      onRefresh={() => void live.reload()}
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
            venue={me.id}
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

/** The large profile card on a team list (web `TalentCard` in a `ProfileCard`). */
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
  const inset = t.space.sm;
  const first = firstName(p);

  return (
    <Ticket padding={inset} gap={0}>
      <Pressable
        onPress={() => router.push(`/talent/${p.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${p.name}, ${status}${worked ? ', Worked with you' : ''}`}
        accessibilityHint="Opens their profile"
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <Photo uri={p.photo} name={p.name} radius={t.radius.card - inset} accessibilityLabel="" />
        <View style={[styles.badges, { top: t.space.md, left: t.space.md, right: t.space.md, gap: t.space.xs }]}>
          <Badge label={status} tone={free ? 'good' : 'neutral'} icon={free ? undefined : valid ? STATUS_ICON[where] : 'clock'} />
          {worked ? <Badge label="Worked with you" tone="good" icon="worked" /> : null}
        </View>
      </Pressable>
      <View style={{ paddingHorizontal: t.space.sm, paddingTop: t.space.md, paddingBottom: t.space.sm, gap: t.space.xs }}>
        <Text variant="title2" numberOfLines={1}>
          {p.name}
        </Text>
        <Text variant="subhead" color="muted" numberOfLines={2}>
          {`${p.roles.length ? `${p.roles.join(' · ')} · ` : ''}${areaOf(p)}`}
        </Text>
        <Text variant="callout" tabular style={{ marginTop: t.space.xs }}>
          {p.minRate ? `From ${money(p.minRate)} / hour` : 'No minimum pay set'}
        </Text>
        {p.skills.length > 0 ? (
          <Text variant="footnote" color="muted" numberOfLines={2}>
            {p.skills.slice(0, 3).join(' · ')}
          </Text>
        ) : null}
        <View style={[styles.row, { gap: t.space.sm, marginTop: t.space.md }]}>
          {open ? (
            <Button
              label={open.status === 'booked' ? 'Booked' : open.status === 'invited' ? 'Request sent' : 'Said yes · Book'}
              variant={open.status === 'can-cover' ? 'primary' : 'secondary'}
              icon={open.status === 'booked' ? 'check' : open.status === 'invited' ? 'waiting' : undefined}
              onPress={() => router.push(`/shift/${open.shift}`)}
              style={{ flex: 1 }}
              fullWidth
            />
          ) : (
            <Button
              label={picked ? 'Added' : 'Add to request'}
              icon={picked ? 'check' : 'add'}
              variant="secondary"
              accessibilityLabel={`Choose ${p.name}${picked ? ', added' : ''}`}
              onPress={() => onPick(!picked)}
              style={{ flex: 1 }}
              fullWidth
            />
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
      </View>
    </Ticket>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  badges: { position: 'absolute', flexDirection: 'row', flexWrap: 'wrap' },
});
