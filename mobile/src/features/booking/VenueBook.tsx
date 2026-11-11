// Venue › Book (web `VenueHome`): choose when, then a team.
import { router, Stack } from 'expo-router';
import { View } from 'react-native';

import { LiveGate, useRefresh } from '@/data';
import { activeDays, member, shiftLabel, whenLine } from '@/domain';
import { HeaderActions } from '@/features/shell/HeaderActions';
import { useTheme } from '@/theme/useTheme';
import { Badge, GroupHeading, Headline, Row, Screen, Section } from '@/ui';

import { upcomingBookings } from './parts';
import { TeamMosaic } from './TeamMosaic';
import { savedWhen, useWhen, whenParams } from './when';
import { WhenBar } from './WhenBar';

const header = (
  <>
    <Stack.Screen options={{ title: 'Book' }} />
    <HeaderActions />
  </>
);

export function VenueBook() {
  const t = useTheme();
  const [when, setWhen] = useWhen();
  const refresh = useRefresh();

  return (
    <LiveGate header={header} loading={{ count: 2 }}>
      {({ data, me }) => {
        const coming = upcomingBookings(data, me.id).slice(0, 3);
        return (
          // The serif hero is the page title: it sits right under the bar, like a tab root's title.
          <Screen {...refresh} contentStyle={{ paddingTop: t.space.sm }}>
            {header}
            <Headline parts={['Who do you need ', { em: 'for service?' }]} />
            <WhenBar value={when} onChange={setWhen} />
            <TeamMosaic
              data={data}
              venue={me.id}
              // TEMPORARY, matching the web (5171ec1): the tile counts everyone on the
              // platform in this team, not who is free on the chosen dates, because the
              // roster is still small and "0 available" showed too often. Switch back to
              // `standing(data, m.id, whenDays(when)) === 'free'` once there are enough people.
              caption={(team) => `${team.length} available`}
              onPick={(team) =>
                router.push({ pathname: '/team/[team]', params: { team, ...whenParams(when.dates.length ? when : savedWhen()) } })
              }
            />
            {coming.length > 0 ? (
              <View style={{ gap: t.space.md }}>
                <GroupHeading title="Coming up" />
                <Section separatorInset={72}>
                  {coming.map((b) => {
                    const s = data.shifts.find((x) => x.id === b.shift)!;
                    const who = member(data, b.talent);
                    return (
                      <Row
                        key={b.id}
                        photo={{ uri: who?.photo, name: who?.name }}
                        title={who?.name ?? 'Dyuknow member'}
                        titleSerif
                        subtitle={`${shiftLabel(s)} · ${whenLine(data, s, activeDays(b))}`}
                        subtitleLines={2}
                        subtitleTabular
                        trailing={<Badge label="Booked" tone="good" />}
                        onPress={() => router.push(`/booking/${b.id}`)}
                      />
                    );
                  })}
                </Section>
              </View>
            ) : null}
          </Screen>
        );
      }}
    </LiveGate>
  );
}
