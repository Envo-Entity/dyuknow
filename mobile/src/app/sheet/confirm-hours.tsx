import { useLocalSearchParams } from 'expo-router';

import { ConfirmHoursSheet } from '@/features/booking-detail';

export default function ConfirmHoursRoute() {
  const { bookingId, date } = useLocalSearchParams<{ bookingId: string; date: string }>();
  return <ConfirmHoursSheet bookingId={String(bookingId ?? '')} date={String(date ?? '')} />;
}
