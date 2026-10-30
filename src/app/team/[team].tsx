import { useLocalSearchParams } from 'expo-router';

import { TeamList } from '@/features/booking/TeamList';

export default function TeamRoute() {
  const { team, dates, time } = useLocalSearchParams<{ team: string; dates?: string; time?: string }>();
  // A new team is a new list; new dates or hours (setParams) keep this one.
  return <TeamList key={team} team={team} dates={dates} time={time} />;
}
