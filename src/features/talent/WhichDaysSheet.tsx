// sheet/which-days (§6.1): the days of a multi-day shift I can do.
import { router } from 'expo-router';
import { useState } from 'react';

import { sayYes, sayYesMessage, useLive } from '@/data';
import { serviceLabel, type Data, type Member, type Shift } from '@/domain';
import { CheckRow, Empty, Loading, Notice, Section, SheetScreen, StickyAction } from '@/ui';

import { talentShiftState, whichDaysLabel, type TalentShiftState } from './logic';

/** How long the button shows its check before the sheet closes. */
const DONE_MS = 800;

export function WhichDaysSheet({ shiftId }: { shiftId: string }) {
  const { data, me } = useLive();
  const s = data?.shifts.find((x) => x.id === shiftId);
  if (!data || !me || !s) {
    return (
      <SheetScreen title="Which days can you do?" onClose={() => router.back()}>
        {!data ? <Loading variant="rows" count={3} /> : <Empty icon="shifts" title="Shift not found" />}
      </SheetScreen>
    );
  }
  return <Picker data={data} me={me} s={s} />;
}

function Picker({ data, me, s }: { data: Data; me: Member; s: Shift }) {
  const { run } = useLive();
  const live = talentShiftState(data, me, s);
  // Held while the answer lands, so the reload behind it doesn't reshuffle the rows.
  const [frozen, setFrozen] = useState<TalentShiftState | null>(null);
  const st = frozen ?? live;
  // Starts from the days I can do, minus days I marked Not free. Kept as
  // first computed so a reload behind the sheet doesn't untick my choices.
  const [picked, setPicked] = useState<string[]>(st.suggested);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (date: string, on: boolean) => {
    setError(null);
    setPicked((p) => (on ? [...new Set([...p, date])].sort() : p.filter((d) => d !== date)));
  };
  const chosen = picked.filter((d) => st.free.includes(d));

  async function send() {
    setSending(true);
    setError(null);
    setFrozen(live);
    const result = await run(`say-yes:${s.id}`, (ref) => sayYes(s.id, chosen, ref), {
      success: (x) => sayYesMessage(x, st.name),
      args: chosen,
      onError: setError,
    });
    setSending(false);
    if (!result) {
      setFrozen(null);
      return;
    }
    const booked = result.result === 'booked';
    setDone(booked ? 'Booked' : 'Sent');
    setTimeout(() => {
      router.back();
      if (booked && result.booking_id) router.push({ pathname: '/booking/[id]', params: { id: result.booking_id } });
    }, DONE_MS);
  }

  return (
    <SheetScreen
      title="Which days can you do?"
      onClose={() => router.back()}
      footer={
        <StickyAction
          primary={{
            label: whichDaysLabel(chosen, s.days.length, st.accept),
            onPress: () => void send(),
            disabled: !chosen.length,
            loading: sending,
            done,
          }}
        />
      }
    >
      {error ? <Notice text={error} tone="danger" icon="alert" /> : null}
      <Section>
        {s.days.map((d) => {
          const can = st.free.includes(d.date);
          const clash = st.clashWith(d.date);
          return (
            <CheckRow
              key={d.date}
              title={serviceLabel(d)}
              subtitle={can && st.busy.includes(d.date) ? 'You marked this day not free' : undefined}
              checked={can && picked.includes(d.date)}
              onToggle={(on) => toggle(d.date, on)}
              disabled={!can || !!done}
              disabledReason={!can ? (clash ? `You’re at ${clash}` : 'Filled') : undefined}
            />
          );
        })}
      </Section>
    </SheetScreen>
  );
}
