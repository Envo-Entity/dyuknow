import { useLocalSearchParams } from 'expo-router';

import { CancelDaysSheet } from '@/features/booking-detail';

export default function CancelDaysRoute() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  return <CancelDaysSheet bookingId={String(bookingId ?? '')} />;
}
