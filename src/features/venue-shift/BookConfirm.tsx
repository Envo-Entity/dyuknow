import { router } from 'expo-router';
import { useState } from 'react';

import { bookTalent, useLive } from '@/data';
import { bookableDates, firstName, serviceLabel, shiftLabel } from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { CheckRow, Empty, Notice, Row, Section, SheetScreen, StickyAction } from '@/ui';

import { daysPhrase, money } from './format';

/**
 * Book someone who said yes (spec §6.2 `sheet/book-confirm`). Opened from the
 * response cards, the day tracker (one day preselected) and chat cards.
 */
export function BookConfirm({ shiftId, talentId, preselect }: { shiftId: string; talentId: string; preselect?: string[] }) {
  const { data, run } = useLive();
  const t = useTheme();
  const s = data?.shifts.find((x) => x.id === shiftId);
  const person = data?.members.find((m) => m.id === talentId);
  const r = data?.responses.find((x) => x.shift === shiftId && x.talent === talentId);
  // Fixed when the sheet opens, so the list doesn't shift under the tap after booking.
  const [bookable] = useState(() => (data && s && r ? bookableDates(data, s, r) : []));
  const [picked, setPicked] = useState<string[]>(() => {
    const pre = preselect?.filter((d) => bookable.includes(d));
    return pre?.length ? pre : bookable;
  });
  const [booked, setBooked] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!data || !s || !person || !r) {
    return (
      <SheetScreen title="Book" onClose={() => router.back()}>
        <Empty title="Shift not found" action={{ label: 'Close', onPress: () => router.back() }} />
      </SheetScreen>
    );
  }

  const first = firstName(person);
  const multi = s.days.length > 1;
  const choose = multi && bookable.length > 1;
  const dates = choose ? picked : bookable;
  const extending = data.bookings.some((b) => b.shift === s.id && b.talent === talentId && !b.cancelled);
  const label = `Book ${first}${multi && dates.length ? ` · ${daysPhrase(dates, s.days.length)}` : ''}`;

  const confirm = async () => {
    setBusy(true);
    const result = await run(`book:${s.id}:${talentId}:${dates.join(',')}`, (ref) => bookTalent(s.id, talentId, dates, ref), {
      success: `${first} is booked.`,
    });
    setBusy(false);
    if (!result) return;
    setBooked(true);
    // Let the button settle into "Booked", then open the booking.
    setTimeout(() => {
      router.back();
      router.push({ pathname: '/booking/[id]', params: { id: result.booking_id } });
    }, t.motion.slow + 200);
  };

  return (
    <SheetScreen
      title={`Book ${first}?`}
      onClose={() => router.back()}
      footer={
        <StickyAction
          primary={{
            label,
            onPress: () => void confirm(),
            loading: busy,
            done: booked ? 'Booked' : null,
            disabled: !dates.length,
          }}
        />
      }>
      <Section>
        <Row photo={{ uri: person.photo, name: person.name }} title={person.name} subtitle={`${shiftLabel(s)} · ${money(s.rate)}/h`} />
      </Section>

      {!bookable.length && !booked ? <Notice tone="warning" text={`${first} can’t be booked any more.`} /> : null}

      {choose ? (
        <Section>
          {bookable.map((date) => {
            const d = s.days.find((x) => x.date === date)!;
            return (
              <CheckRow
                key={date}
                title={serviceLabel(d)}
                checked={picked.includes(date)}
                disabled={booked}
                onToggle={(on) => setPicked((p) => (on ? [...p, date].sort() : p.filter((x) => x !== date)))}
              />
            );
          })}
        </Section>
      ) : bookable.length ? (
        <Section>
          {s.days
            .filter((d) => bookable.includes(d.date))
            .map((d) => (
              <Row key={d.date} icon="clock" title={serviceLabel(d)} />
            ))}
        </Section>
      ) : null}

      {extending && !booked ? <Notice text={`Adds to ${first}’s booking.`} /> : null}
    </SheetScreen>
  );
}
