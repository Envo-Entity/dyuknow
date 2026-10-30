import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useLive } from '@/data';
import { TalentShift } from '@/features/talent/TalentShift';
import { VenueShift } from '@/features/venue-shift';

/** Shift detail (spec §6): the talent's view or the venue's. Opening it reads the notices about it. */
export default function ShiftDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { side, readTarget } = useLive();

  useEffect(() => {
    if (id) void readTarget(`shift/${id}`);
  }, [id, readTarget]);

  if (side === 'talent') return <TalentShift id={id} />;
  return <VenueShift id={id} />;
}
