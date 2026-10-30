import { useLocalSearchParams } from 'expo-router';

import { WhichDaysSheet } from '@/features/talent/WhichDaysSheet';

export default function WhichDaysRoute() {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  return <WhichDaysSheet shiftId={String(shiftId ?? '')} />;
}
