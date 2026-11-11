import { useLocalSearchParams } from 'expo-router';

import { BookConfirm } from '@/features/venue-shift';

export default function BookConfirmSheet() {
  const { shiftId, talentId, dates } = useLocalSearchParams<{ shiftId: string; talentId: string; dates?: string }>();
  return <BookConfirm shiftId={shiftId} talentId={talentId} preselect={dates ? dates.split(',').filter(Boolean) : undefined} />;
}
