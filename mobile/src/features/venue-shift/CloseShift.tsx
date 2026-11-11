import { router } from 'expo-router';
import { useState } from 'react';

import { closeShift, useLive } from '@/data';
import { ChoiceRow, Empty, Notice, Section, SheetScreen, StickyAction, Text } from '@/ui';

const REASONS = ['Cover is no longer needed', 'Cover found elsewhere', 'Plans changed'];

/** Cancel a request or remove a job post (spec §6.2 `sheet/close-shift`). Stays on the shift afterwards. */
export function CloseShift({ shiftId }: { shiftId: string }) {
  const { data, runResult } = useLive();
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set on success so the sheet doesn't flash "not found" or a closed state while it leaves.
  const [done, setDone] = useState(false);
  const s = data?.shifts.find((x) => x.id === shiftId);
  const [request] = useState(() => s?.mode === 'request');

  if (!data || (!s && !done)) {
    return (
      <SheetScreen title="Cancel" onClose={() => router.back()}>
        <Empty title="Shift not found" action={{ label: 'Close', onPress: () => router.back() }} />
      </SheetScreen>
    );
  }

  const anyBooked = !!s && data.bookings.some((b) => b.shift === s.id && !b.cancelled);
  const action = request ? 'Cancel request' : 'Remove job post';

  const confirm = async () => {
    if (!s || done) return;
    setBusy(true);
    setError(null);
    const r = await runResult(`close:${s.id}`, (ref) => closeShift(s.id, reason, ref), {
      args: { shift: s.id, reason },
      success: request ? 'Request cancelled.' : 'Job post removed.',
      onError: setError,
    });
    setBusy(false);
    if (r.ok) {
      setDone(true);
      router.back();
    }
  };

  return (
    <SheetScreen
      title={request ? 'Cancel this request?' : 'Remove this job post?'}
      onClose={() => router.back()}
      footer={<StickyAction primary={{ label: action, variant: 'danger', loading: busy, disabled: done, onPress: () => void confirm() }} />}>
      {anyBooked ? (
        <Text variant="callout" color="muted">
          People already booked stay booked.
        </Text>
      ) : null}
      <Section label="Reason">
        {REASONS.map((r) => (
          <ChoiceRow
            key={r}
            title={r}
            selected={reason === r}
            onSelect={() => {
              setReason(r);
              setError(null);
            }}
          />
        ))}
      </Section>
      {error ? <Notice tone="danger" text={error} /> : null}
    </SheetScreen>
  );
}
