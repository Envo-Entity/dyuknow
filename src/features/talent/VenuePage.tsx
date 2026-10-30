// venue/[id] (§7.5, web VenueDetail in Discovery.tsx): a venue's public page.
import { router, Stack } from 'expo-router';
import { Linking } from 'react-native';

import { LiveGate, useRefresh } from '@/data';
import { areaOf, contactLine, fullAddress, type Data, type Member } from '@/domain';
import { Button, DetailRow, Empty, Postcard, Row, Screen, Section, Text, Ticket } from '@/ui';

import { findMember, openJobs, venueKinds } from './logic';
import { Group, ShiftCard, VerifiedLine } from './parts';

export function VenuePage({ id }: { id: string }) {
  const header = <Stack.Screen options={{ title: '' }} />;
  return (
    <LiveGate header={header} loading={{ count: 2 }}>
      {({ data, me, side }) => {
        const v = findMember(data, id);
        if (!v || v.side !== 'venue') {
          return (
            <>
              {header}
              <Screen>
                <Empty
                  icon="location"
                  title="Venue not found"
                  action={{ label: 'Go home', onPress: () => router.navigate(side === 'talent' ? '/t/shifts' : '/v/book') }}
                />
              </Screen>
            </>
          );
        }
        return <Page data={data} me={me} v={v} isTalent={side === 'talent'} />;
      }}
    </LiveGate>
  );
}

function Page({ data, me, v, isTalent }: { data: Data; me: Member; v: Member; isTalent: boolean }) {
  const refresh = useRefresh();
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
      <Stack.Screen options={{ title: v.name }} />
      <Screen gap="xl" {...refresh}>
        <Postcard uri={v.photo} name={v.name} detail={[area, kinds].filter(Boolean).join(' · ') || undefined}>
          <VerifiedLine m={v} />
        </Postcard>

        {v.bio ? (
          <Text variant="body" selectable>
            {v.bio}
          </Text>
        ) : null}

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
          <Section>
            {address ? <DetailRow label="Address" value={address} /> : null}
            {contact ? <DetailRow label="On-site contact" value={contact} tabular /> : null}
          </Section>
        ) : null}

        <Group title="Open jobs">
          {jobs.length ? (
            jobs.map((s) => <ShiftCard key={s.id} data={data} shift={s} />)
          ) : (
            <Ticket padding={0}>
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
