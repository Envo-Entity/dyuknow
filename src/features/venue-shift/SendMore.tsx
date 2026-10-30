import { router } from 'expo-router';
import { useState } from 'react';

import { sendToMore, useLive } from '@/data';
import { availableDates } from '@/domain';
import { Empty, Section, SheetScreen, StickyAction } from '@/ui';

import { PersonCheckRow } from './PersonCheckRow';

/** Send an open shift to more talent (spec §6.2 `sheet/send-more`). */
export function SendMore({ shiftId }: { shiftId: string }) {
  const { data, run } = useLive();
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const s = data?.shifts.find((x) => x.id === shiftId);

  if (!data || !s) {
    return (
      <SheetScreen title="Send to more people" onClose={() => router.back()}>
        <Empty title="Shift not found" action={{ label: 'Close', onPress: () => router.back() }} />
      </SheetScreen>
    );
  }

  const responses = data.responses.filter((r) => r.shift === s.id);
  const holds = (roles: string[]) => Number(roles.some((r) => s.roles.includes(r)));
  // Those holding one of the shift's positions first; otherwise the snapshot's order.
  const talent = data.members.filter((m) => m.side === 'talent' && m.approved).sort((a, b) => holds(b.roles) - holds(a.roles));

  const rows = talent.map((m) => {
    const existing = responses.find((r) => r.talent === m.id && ['invited', 'can-cover', 'booked'].includes(r.status));
    const blocked = !availableDates(data, m.id, s).length;
    const sub = existing
      ? existing.status === 'booked'
        ? 'Booked'
        : existing.status === 'invited'
          ? 'Already sent'
          : 'Already said yes'
      : blocked
        ? 'Booked elsewhere then'
        : m.roles.join(' · ');
    return { m, sub, disabled: !!existing || blocked };
  });

  const send = async () => {
    setBusy(true);
    const ok = await run(`send-more:${s.id}:${[...picked].sort().join(',')}`, (ref) => sendToMore(s.id, picked, ref), { success: 'Sent.' });
    setBusy(false);
    if (ok !== undefined) {
      setPicked([]);
      router.back();
    }
  };

  return (
    <SheetScreen
      title="Send to more people"
      onClose={() => router.back()}
      footer={
        <StickyAction
          primary={{
            label: picked.length > 1 ? `Send to ${picked.length} people` : 'Send',
            onPress: () => void send(),
            loading: busy,
            disabled: !picked.length,
          }}
        />
      }>
      {rows.length ? (
        <Section separatorInset={102}>
          {rows.map(({ m, sub, disabled }) => (
            <PersonCheckRow
              key={m.id}
              name={m.name}
              photo={m.photo}
              subtitle={sub}
              disabled={disabled}
              checked={picked.includes(m.id)}
              onToggle={(on) => setPicked((p) => (on ? [...p, m.id] : p.filter((x) => x !== m.id)))}
            />
          ))}
        </Section>
      ) : (
        <Empty title="No one to send to yet" />
      )}
    </SheetScreen>
  );
}
