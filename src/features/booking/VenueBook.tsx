// Venue › Book (web `VenueHome`): choose when, then a team.
import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { useLive } from '@/data/store';
import { activeDays, member, shiftLabel, standing } from '@/domain';
import { HeaderActions } from '@/features/shell/HeaderActions';
import { Badge, ErrorState, Headline, Loading, Row, Screen, Section, WaitingForApproval } from '@/ui';

import { upcomingBookings, whenLine } from './parts';
import { TeamMosaic } from './TeamMosaic';
import { savedWhen, useWhen, whenDays, whenParams } from './when';
import { WhenBar } from './WhenBar';

export function VenueBook() {
  const live = useLive();
  const { data, me, approved, status } = live;
  const [when, setWhen] = useWhen();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    await live.reload();
    setRefreshing(false);
  };

  const header = (
    <>
      <Stack.Screen options={{ title: 'Book' }} />
      <HeaderActions />
    </>
  );
  if (!data || !me)
    return (
      <Screen>
        {header}
        {status === 'error' ? <ErrorState message={live.error ?? undefined} onRetry={() => void live.reload()} /> : <Loading count={2} />}
      </Screen>
    );
  if (!approved)
    return (
      <Screen>
        {header}
        <WaitingForApproval />
      </Screen>
    );

  const days = whenDays(when);
  const coming = upcomingBookings(data, me.id).slice(0, 3);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      {header}
      <Headline parts={['Who do you need ', { em: 'for service?' }]} />
      <WhenBar value={when} onChange={setWhen} />
      <TeamMosaic
        data={data}
        venue={me.id}
        caption={(team) => `${team.filter((m) => standing(data, m.id, days) === 'free').length} available`}
        onPick={(team) =>
          router.push({ pathname: '/team/[team]', params: { team, ...whenParams(when.dates.length ? when : savedWhen()) } })
        }
      />
      {coming.length > 0 ? (
        <Section label="Coming up" separatorInset={72}>
          {coming.map((b) => {
            const s = data.shifts.find((x) => x.id === b.shift)!;
            const who = member(data, b.talent);
            return (
              <Row
                key={b.id}
                photo={{ uri: who?.photo, name: who?.name }}
                title={who?.name ?? 'Dyuknow member'}
                subtitle={`${shiftLabel(s)} · ${whenLine(data, s, activeDays(b))}`}
                trailing={<Badge label="Booked" tone="good" />}
                onPress={() => router.push(`/booking/${b.id}`)}
              />
            );
          })}
        </Section>
      ) : null}
    </Screen>
  );
}
