import { useLocalSearchParams } from 'expo-router';

import { SendMore } from '@/features/venue-shift';

export default function SendMoreSheet() {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  return <SendMore shiftId={shiftId} />;
}
