// venue/[id] (§7.5, web VenueDetail in Discovery.tsx): a venue's public page.
import { router, Stack } from 'expo-router';
import { Linking, View } from 'react-native';

import { useLive } from '@/data';
import { areaOf, contactLine, fullAddress, type Data, type Member } from '@/domain';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Button, Empty, ErrorState, KeyValue, Loading, Photo, Row, Screen, Section, Text, Ticket, WaitingForApproval } from '@/ui';

import { findMember, openJobs, venueKinds } from './logic';
import { Group, ShiftCard, VerifiedLine } from './parts';

export function VenuePage({ id }: { id: string }) {
  const { status, data, me, side, approved, error, reload } = useLive();
  const v = data ? findMember(data, id) : undefined;

  if (!data || !me) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <Screen>
          {status === 'error' ? <ErrorState message={error ?? 'Couldn’t load Dyuknow.'} onRetry={() => void reload()} /> : <Loading count={2} />}
        </Screen>
      </>
    );
  }
  if (!approved) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <Screen>
          <WaitingForApproval />
        </Screen>
      </>
    );
  }
  if (!v || v.side !== 'venue') {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <Screen>
          <Empty icon="location" title="Venue not found" />
        </Screen>
      </>
    );
  }
  return <Page data={data} me={me} v={v} isTalent={side === 'talent'} />;
}

function Page({ data, me, v, isTalent }: { data: Data; me: Member; v: Member; isTalent: boolean }) {
  const t = useTheme();
  const { c } = t;
  const jobs = openJobs(data, v.id);
  const kinds = venueKinds(v);
  const instagram = v.venue?.instagram?.trim() ?? '';
  const handle = instagram.replace(/^@/, '');
  // Venues start conversations; talent reply once one exists.
  const thread = data.threads.find(
    (x) => x.venue === v.id && x.talent === me.id && data.messages.some((m) => m.thread === x.id),
  );
  const bookedHere = data.bookings.some(
    (b) => b.talent === me.id && !b.cancelled && data.shifts.some((s) => s.id === b.shift && s.venue === v.id),
  );
  const address = fullAddress(v);
  const contact = [contactLine(v), v.phone].filter(Boolean).join(' · ');
  const area = areaOf(v);

  return (
    <>
      <Stack.Screen
        options={{
          title: v.name,
          headerLargeTitleEnabled: true,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: { backgroundColor: c.page },
          headerLargeTitleStyle: { fontFamily: fonts.serif, color: c.text },
        }}
      />
      <Screen gap="xl">
        {area ? (
          <Text variant="subhead" color="muted" style={{ marginTop: -t.space.sm }}>
            {area}
          </Text>
        ) : null}

        <Photo uri={v.photo} name={v.name} radius={t.radius.card} />

        <View style={{ gap: t.space.md }}>
          <VerifiedLine m={v} />
          {v.bio ? (
            <Text variant="body" selectable>
              {v.bio}
            </Text>
          ) : null}
          {kinds ? (
            <Text variant="subhead" weight="600">
              {kinds}
            </Text>
          ) : null}
        </View>

        {instagram ? (
          <Section>
            <Row
              icon="instagram"
              title={instagram}
              onPress={() => void Linking.openURL(`https://instagram.com/${handle}`)}
              accessibilityLabel={`Instagram, ${instagram}`}
              accessibilityHint="Opens Instagram"
            />
          </Section>
        ) : null}

        {isTalent ? (
          thread ? (
            <Button
              label="Open conversation"
              icon="message"
              size="large"
              fullWidth
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: thread.id } })}
            />
          ) : (
            <Text variant="footnote" color="muted">
              Venues start conversations. Apply to an open job, or keep your availability up to date so {v.name} can book you.
            </Text>
          )
        ) : null}

        {v.venue && bookedHere && (address || contact) ? (
          <Ticket gap={t.space.md}>
            {address ? <KeyValue label="Address" value={address} icon="location" labelWidth={96} /> : null}
            {contact ? <KeyValue label="On-site contact" value={contact} icon="person" labelWidth={96} /> : null}
          </Ticket>
        ) : null}

        <Group title="Open jobs">
          {jobs.length ? (
            jobs.map((s) => <ShiftCard key={s.id} data={data} shift={s} />)
          ) : (
            <Ticket spiked padding={0}>
              <Empty
                icon="shifts"
                title="No open jobs here"
                message={`When ${v.name} posts a job, it shows here.`}
                action={{ label: 'See open jobs', onPress: () => router.navigate(isTalent ? '/t/shifts' : '/v/book') }}
              />
            </Ticket>
          )}
        </Group>
      </Screen>
    </>
  );
}
