import { useLocalSearchParams } from 'expo-router';

import { BookingDetail } from '@/features/booking-detail';

export default function BookingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BookingDetail id={String(id ?? '')} />;
}
