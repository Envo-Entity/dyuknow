// A talent member's public profile (web `TalentProfile`), for venues and for
// the talent themself.
import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LiveGate, useMessage, useRefresh } from '@/data';
import { areaOf, displayDate, documentStatuses, firstName, freeLabel, londonDate, money, workedWith, type Data, type DocStatus, type Member } from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Badge, Chip, Empty, Icon, KeyValue, Postcard, Row, Screen, Section, StickyAction, Text } from '@/ui';

import { familyOf } from './parts';

export function TalentProfile({ id }: { id: string }) {
  return (
    <LiveGate header={<Stack.Screen options={{ title: '' }} />} loading={{ count: 1 }}>
      {({ data, me, side }) => {
        const p = data.members.find((m) => m.id === id);
        if (!p || p.side !== 'talent')
          return (
            <Screen>
              <Stack.Screen options={{ title: '' }} />
              <Empty
                icon="person"
                title="Profile not found"
                action={{
                  label: 'Back',
                  onPress: () => (router.canGoBack() ? router.back() : router.navigate(side === 'venue' ? '/v/book' : '/t/shifts')),
                }}
              />
            </Screen>
          );
        return <Profile data={data} viewer={me} venue={side === 'venue'} p={p} />;
      }}
    </LiveGate>
  );
}

function Profile({ data, viewer, venue, p }: { data: Data; viewer: Member; venue: boolean; p: Member }) {
  const t = useTheme();
  const refresh = useRefresh();
  const message = useMessage();

  const today = londonDate(data.now);
  const worked = venue && workedWith(data, viewer.id, p.id);
  const docs = documentStatuses(p);
  const freeOn = data.availability.filter((a) => a.member === p.id && a.kind === 'free' && a.date >= today).slice(0, 7);
  const anyFree = data.availability.some((a) => a.member === p.id && a.kind === 'free');
  const first = firstName(p);
  const area = areaOf(p);
  const detail = [p.roles.join(' · '), area].filter(Boolean).join(' · ');

  return (
    <Screen
      {...refresh}
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
      <Stack.Screen options={{ title: p.name }} />
      <Postcard uri={p.photo} name={p.name} detail={detail || undefined}>
        {worked ? (
          <View style={{ alignItems: 'flex-start' }}>
            <Badge label="Worked with you" tone="good" icon="worked" />
          </View>
        ) : null}
        {docs.length ? (
          <View style={{ gap: t.space.xxs }} accessibilityLabel="Documents">
            {docs.map((d) => (
              <View
                key={d.name}
                style={[styles.row, { gap: t.space.xs }]}
                accessible
                accessibilityLabel={`${d.name} · ${DOC_STATUS_TEXT[d.status]}`}
              >
                {d.status === 'verified' ? <Icon name="verified" size={14} color="sageText" /> : null}
                <Text variant="footnote" color={d.status === 'verified' ? 'sageText' : 'muted'} style={{ flex: 1 }}>
                  {`${d.name} · ${DOC_STATUS_TEXT[d.status]}`}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Postcard>
      {p.bio ? <Text variant="body">{p.bio}</Text> : null}
      {p.skills.length ? (
        <View style={[styles.wrap, { gap: t.space.sm }]} accessibilityLabel="Skills">
          {p.skills.map((s) => (
            <Chip key={s} label={s} />
          ))}
        </View>
      ) : null}
      <KeyValue label="Minimum pay" labelWidth={110} tabular value={p.minRate ? `${money(p.minRate)} per hour` : 'Not set'} />
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

// What venues see of each document: never the file.
const DOC_STATUS_TEXT: Record<DocStatus, string> = {
  verified: 'Verified by Dyuknow',
  review: 'Added, not checked yet',
  missing: 'Not added',
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
