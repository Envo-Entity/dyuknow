// A talent member's public profile (web `TalentProfile`), for venues and for
// the talent themself.
import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useLive } from '@/data/store';
import { areaOf, displayDate, firstName, freeLabel, londonDate, verifiedDocs, workedWith } from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Badge, Chip, Empty, Icon, KeyValue, Loading, Photo, Row, Screen, Section, StickyAction, Text, WaitingForApproval } from '@/ui';

import { familyOf, money, useMessage } from './parts';

export function TalentProfile({ id }: { id: string }) {
  const t = useTheme();
  const live = useLive();
  const { data, me, side, approved } = live;
  const message = useMessage();
  const p = data?.members.find((m) => m.id === id);
  const found = !!p && p.side === 'talent';

  const header = <Stack.Screen options={{ title: found ? p.name : '' }} />;
  if (!data || !me)
    return (
      <Screen>
        {header}
        <Loading count={1} />
      </Screen>
    );
  if (!approved)
    return (
      <Screen>
        {header}
        <WaitingForApproval />
      </Screen>
    );
  if (!found)
    return (
      <Screen>
        {header}
        <Empty
          icon="person"
          title="Profile not found"
          action={{ label: 'Back', onPress: () => (router.canGoBack() ? router.back() : router.replace(side === 'venue' ? '/v/book' : '/t/shifts')) }}
        />
      </Screen>
    );

  const today = londonDate(data.now);
  const worked = side === 'venue' && workedWith(data, me.id, p.id);
  const docs = verifiedDocs(p);
  const freeOn = data.availability.filter((a) => a.member === id && a.kind === 'free' && a.date >= today).slice(0, 7);
  const anyFree = data.availability.some((a) => a.member === id && a.kind === 'free');
  const venue = side === 'venue';
  const first = firstName(p);

  return (
    <Screen
      onRefresh={() => void live.reload()}
      footer={
        venue ? (
          <StickyAction
            primary={{
              label: 'Send booking request',
              onPress: () => router.push({ pathname: '/compose', params: { team: familyOf(p), to: p.id } }),
            }}
            secondary={{ label: `Message ${first}`, icon: 'message', onPress: () => void message(p.id) }}
          />
        ) : undefined
      }
    >
      {header}
      <View style={{ gap: t.space.lg }}>
        <Photo uri={p.photo} name={p.name} radius={t.radius.card} />
        <View style={{ gap: t.space.xs }}>
          <Text variant="largeTitle" accessibilityRole="header">
            {p.name}
          </Text>
          <Text variant="callout" color="muted">
            {`${p.roles.join(' · ')}${p.roles.length && areaOf(p) ? ' · ' : ''}${areaOf(p)}`}
          </Text>
        </View>
        {worked ? <Badge label="Worked with you" tone="good" icon="worked" /> : null}
        {docs.length ? (
          <View style={[styles.row, { gap: t.space.xs }]} accessible accessibilityLabel={`Verified by Dyuknow · ${docs.join(' · ')}`}>
            <Icon name="verified" size={14} color="sageText" />
            <Text variant="footnote" color="sageText" style={{ flex: 1 }}>
              {`Verified by Dyuknow · ${docs.join(' · ')}`}
            </Text>
          </View>
        ) : null}
        {p.bio ? <Text variant="body">{p.bio}</Text> : null}
        {p.skills.length ? (
          <View style={[styles.wrap, { gap: t.space.sm }]} accessibilityLabel="Skills">
            {p.skills.map((s) => (
              <Chip key={s} label={s} />
            ))}
          </View>
        ) : null}
        <KeyValue label="Minimum pay" labelWidth={110} tabular value={p.minRate ? `${money(p.minRate)} per hour` : 'Not set'} />
      </View>
      {freeOn.length || !anyFree ? (
        <Section label="Free on">
          {freeOn.length ? (
            freeOn.map((a) => <Row key={a.date} icon="checkCircle" title={displayDate(a.date)} value={freeLabel(a)} valueTabular />)
          ) : (
            <Row title="Availability not set" />
          )}
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
