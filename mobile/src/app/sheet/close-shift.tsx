import { useLocalSearchParams } from 'expo-router';

import { CloseShift } from '@/features/venue-shift';

export default function CloseShiftSheet() {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  return <CloseShift shiftId={shiftId} />;
}
