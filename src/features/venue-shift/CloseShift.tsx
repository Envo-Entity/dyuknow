import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { closeShift, useLive } from '@/data';
import { useTheme } from '@/theme/useTheme';
import { Button, ChoiceRow, Empty, Section, SheetScreen, Text } from '@/ui';

const REASONS = ['Cover is no longer needed', 'Cover found elsewhere', 'Plans changed'];

/** Cancel a request or remove a job post (spec §6.2 `sheet/close-shift`). Stays on the shift afterwards. */
export function CloseShift({ shiftId }: { shiftId: string }) {
  const { data, run } = useLive();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const s = data?.shifts.find((x) => x.id === shiftId);

  if (!data || !s) {
    return (
      <SheetScreen title="Cancel" onClose={() => router.back()}>
        <Empty title="Shift not found" action={{ label: 'Close', onPress: () => router.back() }} />
      </SheetScreen>
    );
  }

  const request = s.mode === 'request';
  const anyBooked = data.bookings.some((b) => b.shift === s.id && !b.cancelled);
  const action = request ? 'Cancel request' : 'Remove job post';

  const confirm = async () => {
    setBusy(true);
    const ok = await run(`close:${s.id}`, (ref) => closeShift(s.id, reason, ref), {
      success: request ? 'Request cancelled.' : 'Job post removed.',
    });
    setBusy(false);
    if (ok !== undefined) router.back();
  };

  return (
    <SheetScreen
      title={request ? 'Cancel this request?' : 'Remove this job post?'}
      onClose={() => router.back()}
      footer={
        // Kit candidate: StickyAction has no destructive primary, so the danger button sits in the same footer spacing.
        <View style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.md, paddingBottom: insets.bottom + t.space.md }}>
          <Button label={action} variant="danger" size="large" fullWidth loading={busy} onPress={() => void confirm()} />
        </View>
      }>
      {anyBooked ? (
        <Text variant="callout" color="muted">
          People already booked stay booked.
        </Text>
      ) : null}
      <Section label="Reason">
        {REASONS.map((r) => (
          <ChoiceRow key={r} title={r} selected={reason === r} onSelect={() => setReason(r)} />
        ))}
      </Section>
    </SheetScreen>
  );
}
