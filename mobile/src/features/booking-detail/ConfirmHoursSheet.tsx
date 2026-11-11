// sheet/confirm-hours: the venue records a finished day, as worked (with the
// real hours) or as a no-show. FEATURES.md §7.1 "sheet/confirm-hours".
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { confirmDay } from '@/data/actions';
import { useLive } from '@/data/store';
import { dayRecords, displayDate, firstName } from '@/domain';
import { Empty, Loading, Notice, Section, SheetScreen, StickyAction, Text, TimeRow } from '@/ui';

import { findBooking } from './model';

type Phase = 'idle' | 'worked' | 'no-show' | 'done';

export function ConfirmHoursSheet({ bookingId, date }: { bookingId: string; date: string }) {
  const { data, me, run } = useLive();
  const found = data ? findBooking(data, me?.id, bookingId) : null;
  const record = data && found ? dayRecords(data, found.b).find((r) => r.date === date) : undefined;
  const [start, setStart] = useState(record?.start ?? '');
  const [end, setEnd] = useState(record?.end ?? '');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const close = () => router.back();
  const title = date ? `Hours on ${displayDate(date)}` : 'Confirm hours';
  const held = phase !== 'idle';

  if (!data) {
    return (
      <SheetScreen title={title} onClose={close}>
        <Loading variant="rows" count={2} />
      </SheetScreen>
    );
  }
  // Once saving starts the reload lands before the sheet closes: keep the
  // form up, so "already recorded" never flashes after a success.
  if (!found || !record || (!held && (!found.venueView || record.status !== 'to-confirm'))) {
    return (
      <SheetScreen title={title} onClose={close}>
        <Empty
          title={
            !found || !record
              ? 'Booking not found'
              : !found.venueView
                ? 'Only the venue confirms the hours worked.'
                : 'This day has already been recorded.'
          }
          action={{ label: 'Close', onPress: close }}
        />
      </SheetScreen>
    );
  }

  const first = firstName(found.t);
  const { b } = found;
  const valid = !!start && !!end && start !== end;
  const pick = (set: (v: string) => void) => (v: string) => {
    setError(null);
    set(v);
  };

  const save = async (outcome: 'worked' | 'no-show') => {
    setError(null);
    setPhase(outcome);
    const r =
      outcome === 'worked'
        ? await run(`confirm:${b.id}:${date}`, (ref) => confirmDay(b.id, date, 'worked', { start, end }, ref), {
            success: 'Hours confirmed.',
            args: { start, end },
            onError: setError,
          })
        : await run(`no-show:${b.id}:${date}`, (ref) => confirmDay(b.id, date, 'no-show', undefined, ref), {
            success: 'Marked as a no-show.',
            args: { outcome: 'no-show' },
            onError: setError,
          });
    if (r === undefined) {
      setPhase('idle');
      return;
    }
    setPhase('done');
    router.back();
  };

  const confirm = () => {
    if (valid && !held) void save('worked');
  };
  const noShow = () => {
    if (held) return;
    Alert.alert(`${first} didn’t show?`, `${displayDate(date)} is recorded as not paid.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark as a no-show', style: 'destructive', onPress: () => void save('no-show') },
    ]);
  };

  return (
    <SheetScreen
      title={title}
      footer={
        <StickyAction
          primary={{
            label: `Confirm ${start}–${end}`,
            onPress: confirm,
            disabled: !valid || phase === 'no-show' || phase === 'done',
            loading: phase === 'worked',
          }}
          tertiary={{
            label: `${first} didn’t show`,
            onPress: noShow,
            disabled: phase === 'worked' || phase === 'done',
            loading: phase === 'no-show',
          }}
        />
      }
    >
      <Text variant="callout" color="muted">
        {`Change the times if ${first} started or finished at a different time.`}
      </Text>
      <Section>
        <TimeRow label="From" value={start || null} onChange={pick(setStart)} disabled={held} />
        <TimeRow label="To" value={end || null} onChange={pick(setEnd)} disabled={held} />
      </Section>
      {/* §1.6.4: the refusal also shows inside the sheet, just above its buttons. */}
      {error ? <Notice tone="danger" text={error} /> : null}
    </SheetScreen>
  );
}
