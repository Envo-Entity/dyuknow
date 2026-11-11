import { useLocalSearchParams } from 'expo-router';

import { Compose, type ComposeParams } from '@/features/booking/Composer';

export default function ComposeRoute() {
  const params = useLocalSearchParams<Record<keyof ComposeParams, string>>();
  return <Compose {...params} />;
}
