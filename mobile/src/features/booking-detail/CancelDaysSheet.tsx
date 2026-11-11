// sheet/cancel-days: either side cancels the days that haven't started.
// FEATURES.md §7.1 "sheet/cancel-days".
import { router } from 'expo-router';
import { useState } from 'react';

import { cancelDays } from '@/data/actions';
import { useLive } from '@/data/store';
import { firstName, serviceLabel, shortDay } from '@/domain';
import { CheckRow, ChoiceRow, Empty, Loading, Notice, Row, Section, SheetScreen, StickyAction, Text, TextRow } from '@/ui';

import { cancelReasons, findBooking, futureServices } from './model';

// The server keeps the whole reason under 500 characters.
const MAX_REASON = 499;

export function CancelDaysSheet({ bookingId }: { bookingId: string }) {
  const { data, me, run } = useLive();
  const found = data ? findBooking(data, me?.id, bookingId) : null;
  const live = data && found ? futureServices(data, found.b) : [];
  // The days as the sheet opened: once saving starts, the reload lands before
  // the sheet closes, so the form stays as it was (no "can no longer" flash).
  const [opened] = useState(live);
  const [picked, setPicked] = useState<string[]>(() => live.map((d) => d.date));
  const [reason, setReason] = useState('');
  const [extra, setExtra] = useState('');
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const held = phase !== 'idle';
  const future = held ? opened : live;
  const close = () => router.back();

  if (!data) {
    return (
      <SheetScreen title="Cancel this booking?" onClose={close}>
        <Loading variant="rows" count={3} />
      </SheetScreen>
    );
  }
  if (!found || !future.length) {
    return (
      <SheetScreen title="Cancel this booking?" onClose={close}>
        <Empty
          title={found ? 'This booking can no longer be cancelled.' : 'Booking not found'}
          action={{ label: 'Close', onPress: close }}
        />
      </SheetScreen>
    );
  }

  const { b, v, t: talent, venueView } = found;
  const many = future.length > 1;
  // A day that started while the sheet was open drops out of the choice.
  const chosen = many ? future.map((d) => d.date).filter((d) => picked.includes(d)) : [future[0].date];
  const label = `Cancel ${chosen.length > 1 ? `${chosen.length} days` : chosen.length ? shortDay(chosen[0]) : 'booking'}`;
  const extraText = extra.trim();
  const fullReason = `${reason}${extraText ? ` — ${extraText}` : ''}`;
  const ready = !!reason && chosen.length > 0;
  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    setError(null);
    set(v);
  };

  const submit = async () => {
    if (!ready || held) return;
    setError(null);
    setPhase('saving');
    const r = await run(`cancel:${b.id}`, (ref) => cancelDays(b.id, chosen, fullReason, ref), {
      success: 'Cancelled.',
      args: { dates: chosen, reason: fullReason },
      onError: setError,
    });
    if (r === undefined) {
      setPhase('idle');
      return;
    }
    setPhase('done');
    router.back();
  };

  return (
    <SheetScreen
      title={many ? 'Which days are you cancelling?' : 'Cancel this booking?'}
      footer={
        <StickyAction
          primary={{
            label,
            variant: 'danger',
            onPress: submit,
            disabled: !ready || phase === 'done',
            loading: phase === 'saving',
          }}
          tertiary={{ label: 'Keep booking', onPress: close, disabled: phase === 'saving' }}
        />
      }
    >
      <Section>
        {many
          ? future.map((d) => (
              <CheckRow
                key={d.date}
                title={serviceLabel(d)}
                checked={chosen.includes(d.date)}
                disabled={held}
                onToggle={edit((on: boolean) =>
                  setPicked((p) => (on ? [...p.filter((x) => x !== d.date), d.date].sort() : p.filter((x) => x !== d.date))),
                )}
              />
            ))
          : [<Row key={future[0].date} title={serviceLabel(future[0])} />]}
      </Section>

      <Text variant="callout" color="muted">
        {venueView ? `${firstName(talent)} is told and the day reopens.` : `${v.name} is told and can find someone else.`}
      </Text>

      <Section label="Reason">
        {cancelReasons(venueView).map((option) => (
          <ChoiceRow
            key={option}
            title={option}
            selected={reason === option}
            disabled={held}
            onSelect={() => edit(setReason)(option)}
          />
        ))}
      </Section>

      <Section>
        <TextRow
          label="Anything to add · optional"
          value={extra}
          onChangeText={edit(setExtra)}
          multiline
          editable={!held}
          maxLength={Math.max(0, MAX_REASON - (reason || 'Cover no longer needed').length - 3)}
          autoCapitalize="sentences"
        />
      </Section>

      {/* §1.6.4: the refusal also shows inside the sheet, just above its buttons. */}
      {error ? <Notice tone="danger" text={error} /> : null}
    </SheetScreen>
  );
}
