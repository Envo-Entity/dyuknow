import { useLocalSearchParams } from 'expo-router';

import { TalentProfile } from '@/features/booking/TalentProfile';

export default function TalentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TalentProfile key={id} id={id} />;
}
