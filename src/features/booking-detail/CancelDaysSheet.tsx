// sheet/cancel-days: either side cancels the days that haven't started.
// FEATURES.md §7.1 "sheet/cancel-days".
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cancelDays } from '@/data/actions';
import { useLive } from '@/data/store';
import { firstName, serviceLabel, shortDay } from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Button, CheckRow, ChoiceRow, Empty, Row, Section, SheetScreen, Text, TextRow } from '@/ui';

import { cancelReasons, findBooking, futureServices } from './model';

// The server keeps the whole reason under 500 characters.
const MAX_REASON = 499;

export function CancelDaysSheet({ bookingId }: { bookingId: string }) {
  const { data, me, run } = useLive();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const found = data ? findBooking(data, me?.id, bookingId) : null;
  const live = data && found ? futureServices(data, found.b) : [];
  // The days as the sheet opened: while saving, the reload lands before the sheet closes.
  const [opened] = useState(live);
  const [picked, setPicked] = useState<string[]>(() => live.map((d) => d.date));
  const [reason, setReason] = useState('');
  const [extra, setExtra] = useState('');
  const [saving, setSaving] = useState(false);
  const future = saving ? opened : live;
  const close = () => router.back();

  if (!data || !found || !future.length) {
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

  const submit = async () => {
    if (!ready) return;
    setSaving(true);
    const r = await run(`cancel:${b.id}`, (ref) => cancelDays(b.id, chosen, fullReason, ref), { success: 'Cancelled.' });
    setSaving(false);
    if (r !== undefined) router.back();
  };

  const footer = (
    <View style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.md, paddingBottom: insets.bottom + t.space.md, gap: t.space.xs, backgroundColor: t.c.page }}>
      <Button label={label} variant="danger" size="large" fullWidth disabled={!ready} loading={saving} onPress={submit} />
      <Button label="Keep booking" variant="quiet" size="large" fullWidth onPress={close} />
    </View>
  );

  return (
    <SheetScreen title={many ? 'Which days are you cancelling?' : 'Cancel this booking?'} footer={footer}>
      <Section>
        {many
          ? future.map((d) => (
              <CheckRow
                key={d.date}
                title={serviceLabel(d)}
                checked={chosen.includes(d.date)}
                onToggle={(on) =>
                  setPicked((p) => (on ? [...p.filter((x) => x !== d.date), d.date].sort() : p.filter((x) => x !== d.date)))
                }
              />
            ))
          : [<Row key={future[0].date} title={serviceLabel(future[0])} />]}
      </Section>

      <Text variant="callout" color="muted" style={{ paddingHorizontal: t.space.lg }}>
        {venueView ? `${firstName(talent)} is told and the day reopens.` : `${v.name} is told and can find someone else.`}
      </Text>

      <Section label="Reason">
        {cancelReasons(venueView).map((option) => (
          <ChoiceRow key={option} title={option} selected={reason === option} onSelect={() => setReason(option)} />
        ))}
      </Section>

      <Section>
        <TextRow
          label="Anything to add · optional"
          value={extra}
          onChangeText={setExtra}
          multiline
          maxLength={Math.max(0, MAX_REASON - (reason || 'Cover no longer needed').length - 3)}
          autoCapitalize="sentences"
        />
      </Section>
    </SheetScreen>
  );
}
