// sheet/confirm-hours: the venue records a finished day, as worked (with the
// real hours) or as a no-show. FEATURES.md §7.1 "sheet/confirm-hours".
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { confirmDay } from '@/data/actions';
import { useLive } from '@/data/store';
import { dayRecords, displayDate, firstName } from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Empty, Row, Section, SheetScreen, StickyAction, Text, TimeRow } from '@/ui';

import { findBooking } from './model';

export function ConfirmHoursSheet({ bookingId, date }: { bookingId: string; date: string }) {
  const { data, me, run } = useLive();
  const t = useTheme();
  const found = data ? findBooking(data, me?.id, bookingId) : null;
  const record = data && found ? dayRecords(data, found.b).find((r) => r.date === date) : undefined;
  const [start, setStart] = useState(record?.start ?? '');
  const [end, setEnd] = useState(record?.end ?? '');
  const [saving, setSaving] = useState<'worked' | 'no-show' | null>(null);
  const close = () => router.back();
  const title = date ? `Hours on ${displayDate(date)}` : 'Confirm hours';

  // While saving, the reload lands before the sheet closes: keep the form up.
  if (!found || !record || (!saving && (!found.venueView || record.status !== 'to-confirm'))) {
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

  const confirm = async () => {
    if (!valid) return;
    setSaving('worked');
    const r = await run(`confirm:${b.id}:${date}`, (ref) => confirmDay(b.id, date, 'worked', { start, end }, ref), {
      success: 'Hours confirmed.',
    });
    setSaving(null);
    if (r !== undefined) router.back();
  };
  const noShow = () =>
    Alert.alert(`${first} didn’t show?`, `${displayDate(date)} is recorded as not paid.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark as a no-show',
        style: 'destructive',
        onPress: async () => {
          setSaving('no-show');
          const r = await run(`no-show:${b.id}:${date}`, (ref) => confirmDay(b.id, date, 'no-show', undefined, ref), {
            success: 'Marked as a no-show.',
          });
          setSaving(null);
          if (r !== undefined) router.back();
        },
      },
    ]);

  return (
    <SheetScreen
      title={title}
      footer={
        <StickyAction
          primary={{
            label: `Confirm ${start}–${end}`,
            onPress: confirm,
            disabled: !valid || saving === 'no-show',
            loading: saving === 'worked',
          }}
        />
      }
    >
      <Text variant="callout" color="muted" style={{ paddingHorizontal: t.space.lg }}>
        {`Change the times if ${first} started or finished at a different time.`}
      </Text>
      <Section>
        <TimeRow label="From" value={start} onChange={setStart} />
        <TimeRow label="To" value={end} onChange={setEnd} />
      </Section>
      <Section>
        <Row title={`${first} didn’t show`} destructive chevron={false} disabled={saving !== null} onPress={noShow} />
      </Section>
    </SheetScreen>
  );
}
