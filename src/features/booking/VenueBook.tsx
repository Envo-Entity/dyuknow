// Venue › Book (web `VenueHome`): choose when, then a team.
import { router, Stack } from 'expo-router';
import { View } from 'react-native';

import { LiveGate, useRefresh } from '@/data';
import { activeDays, member, shiftLabel, standing, whenLine } from '@/domain';
import { HeaderActions } from '@/features/shell/HeaderActions';
import { useTheme } from '@/theme/useTheme';
import { Badge, GroupHeading, Headline, Row, Screen, Section } from '@/ui';

import { upcomingBookings } from './parts';
import { TeamMosaic } from './TeamMosaic';
import { savedWhen, useWhen, whenDays, whenParams } from './when';
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
        const days = whenDays(when);
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
              caption={(team) => `${team.filter((m) => standing(data, m.id, days) === 'free').length} available`}
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
