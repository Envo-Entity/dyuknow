import { useLocalSearchParams } from 'expo-router';

import { VenuePage } from '@/features/talent/VenuePage';

export default function VenueRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VenuePage id={String(id ?? '')} />;
}
