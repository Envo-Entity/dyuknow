// A shift as the talent sees it (§6.1, web TalentShift in ShiftDetail.tsx).
// Rendered by agent F's shift/[id] route when the member is talent.
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { declineRequest, LiveGate, sayYes, sayYesMessage, useLive, useMessage, withdrawYes } from '@/data';
import {
  areaOf,
  bookableDates,
  datesLabel,
  displayDate,
  fullAddress,
  hoursLabel,
  money,
  serviceLabel,
  shiftLabel,
  whenLine,
  type Data,
  type Member,
  type Shift,
} from '@/domain';
import { useTheme } from '@/theme/useTheme';
import {
  Badge,
  Button,
  Empty,
  KeyValue,
  Notice,
  Photo,
  Row,
  Screen,
  Section,
  StickyAction,
  Text,
  Ticket,
  type BadgeProps,
  type ButtonProps,
  type IconName,
} from '@/ui';

import { talentShiftState, venueKinds, type TalentShiftState } from './logic';

/** How long the button shows its check before the screen moves on. */
const DONE_MS = 900;

type Action = Omit<ButtonProps, 'variant' | 'size' | 'fullWidth'>;
type Note = { text: string; icon?: IconName; booked?: boolean };
// `inline` is a lone secondary action shown under the note, not in the sticky bar.
type Bar = { note?: Note; primary?: Action; secondary?: Action; quiet?: Action; inline?: Action };
type Slot = 'primary' | 'secondary';

export function TalentShift({ id }: { id: string }) {
  // The route (shift/[id]) marks this shift's notices read (§1.5).
  const header = <Stack.Screen options={{ title: '' }} />;
  return (
    <LiveGate header={header} approval={false} loading={{ count: 2 }}>
      {({ data, me }) => {
        const s = data.shifts.find((x) => x.id === id);
        if (!s) {
          return (
            <>
              {header}
              <Screen>
                <Empty icon="shifts" title="Shift not found" action={{ label: 'Go home', onPress: () => router.navigate('/t/shifts') }} />
              </Screen>
            </>
          );
        }
        return <Detail data={data} me={me} s={s} />;
      }}
    </LiveGate>
  );
}

function Detail({ data, me, s }: { data: Data; me: Member; s: Shift }) {
  const t = useTheme();
  const { run } = useLive();
  const message = useMessage();
  const st = talentShiftState(data, me, s);
  const { name, venue, free, multi } = st;
  const [frozen, setFrozen] = useState<Bar | null>(null);

  const openVenue = () => router.push({ pathname: '/venue/[id]', params: { id: s.venue } });
  const seeOpenJobs = () => router.navigate('/t/shifts');

  const sayYesKey = `say-yes:${s.id}`;
  async function respond(snapshot: Bar, slot: Slot, dates: string[]) {
    setFrozen(withSlot(snapshot, slot, { loading: true }));
    const result = await run(sayYesKey, (ref) => sayYes(s.id, dates, ref), { success: (x) => sayYesMessage(x, name), args: [...dates].sort() });
    if (!result) {
      setFrozen(null);
      return;
    }
    const booked = result.result === 'booked';
    setFrozen(withSlot(snapshot, slot, { done: booked ? 'Booked' : 'Sent' }));
    setTimeout(() => {
      setFrozen(null);
      if (booked && result.booking_id) router.push({ pathname: '/booking/[id]', params: { id: result.booking_id } });
    }, DONE_MS);
  }

  const decline = () =>
    Alert.alert('Decline this request?', `${name} will know you can’t do it.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => void run(`decline:${s.id}`, (ref) => declineRequest(s.id, ref), { success: 'Declined.', args: s.id }),
      },
    ]);
  const withdraw = () =>
    Alert.alert('Withdraw your yes?', `${name} won’t be able to book you for this.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: () => void run(`withdraw:${s.id}`, (ref) => withdrawYes(s.id, ref), { success: 'Withdrawn.', args: s.id }),
      },
    ]);

  const bar = actionBar(st, s, data, {
    sayYes: (snapshot, slot) =>
      // One day, nothing to choose: answer straight away.
      multi ? router.push({ pathname: '/sheet/which-days', params: { shiftId: s.id } }) : void respond(snapshot, slot, free),
    offerAgain: (snapshot) => void respond(snapshot, 'secondary', st.offerAgain),
    decline,
    withdraw,
    message: () => void message(s.venue),
    seeOpenJobs,
    viewBooking: () => st.b && router.push({ pathname: '/booking/[id]', params: { id: st.b.id } }),
  });
  const shown = frozen ?? bar;

  const kinds = venueKinds(venue);
  const area = venue ? areaOf(venue) : '';
  const eyebrow = `${s.mode === 'request' ? 'Booking request' : 'Job post'}${area ? ` · ${area}` : ''}`;
  const hours = st.hours;
  // A plain note rides in the action bar with its buttons (§6.1); the booked
  // note keeps its badge in the body, and a note without buttons stays there too.
  const noteInBar = !!shown.primary && !!shown.note && !shown.note.booked;
  const bodyNote = noteInBar ? undefined : shown.note;
  const footer = shown.primary ? (
    <StickyAction
      primary={shown.primary}
      secondary={shown.secondary}
      tertiary={shown.quiet}
      note={noteInBar ? shown.note?.text : undefined}
    />
  ) : undefined;

  return (
    <>
      <Stack.Screen options={{ title: s.mode === 'request' ? 'Booking request' : 'Job post' }} />
      <Screen footer={footer} gap="xl">
        {/* The venue stays compact so When and Pay sit above the action bar; the full photo is on the venue page. */}
        <Pressable onPress={openVenue} accessibilityRole="link" accessibilityLabel={`${eyebrow}. ${name}. View public profile`}>
          {({ pressed }) => (
            <View style={{ flexDirection: 'row', gap: t.space.lg, alignItems: 'center', opacity: pressed ? 0.85 : 1 }}>
              <Photo uri={venue?.photo} name={name} width={88} radius={t.radius.md} accessibilityLabel="" />
              <View style={{ flex: 1, gap: t.space.xxs }}>
                <Text variant="footnote" color="muted">
                  {eyebrow}
                </Text>
                <Text variant="title">{name}</Text>
                {kinds ? (
                  <Text variant="subhead" color="muted">
                    {kinds}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        </Pressable>

        <Text variant="headline">{st.invited ? st.myRole : shiftLabel(s)}</Text>

        {bodyNote || shown.inline ? (
          <View style={{ gap: t.space.md }}>
            {bodyNote ? <BarNote note={bodyNote} /> : null}
            {shown.inline ? <Button {...shown.inline} variant="secondary" fullWidth /> : null}
          </View>
        ) : null}

        <Ticket gap={t.space.md}>
          <KeyValue
            label="When"
            value={
              <View style={{ gap: t.space.xxs }}>
                <Text variant="subhead" weight="600" tabular>
                  {whenLine(data, s)}
                </Text>
                {multi ? (
                  <Text variant="footnote" color="muted" tabular>
                    {s.days.length} days · same hours
                  </Text>
                ) : null}
              </View>
            }
          />
          <KeyValue
            label="Pay"
            value={
              <View style={{ gap: t.space.xxs }}>
                <Text variant="subhead" weight="600" tabular>
                  {money(s.rate)} / hour
                </Text>
                <Text variant="footnote" color="muted" tabular>
                  About £{Math.round(s.rate * hours)} a day · {hoursLabel(hours)}
                </Text>
              </View>
            }
          />
        </Ticket>

        {multi ? (
          <Section>
            {s.days.map((d) => {
              const label = st.dayStatus(d.date);
              return (
                <DayRow key={d.date} title={displayDate(d.date)} subtitle={serviceLabel(d).slice(displayDate(d.date).length + 3)} status={label} />
              );
            })}
          </Section>
        ) : null}

        {s.note ? (
          <Section label={`Note from ${name}`}>
            <TextBlock text={s.note} />
          </Section>
        ) : null}

        {st.b && venue && fullAddress(venue) ? (
          <Section label="Address">
            <TextBlock text={fullAddress(venue)} />
          </Section>
        ) : null}

      </Screen>
    </>
  );
}

type Handlers = {
  sayYes: (snapshot: Bar, slot: Slot) => void;
  offerAgain: (snapshot: Bar) => void;
  decline: () => void;
  withdraw: () => void;
  message: () => void;
  seeOpenJobs: () => void;
  viewBooking: () => void;
};

/** The action bar, by §6.1's priority list: the first rule that matches wins. */
function actionBar(st: TalentShiftState, s: Shift, data: Data, h: Handlers): Bar {
  const { r, b, free, name, multi } = st;
  const bar: Bar = {};
  const sayYes = (slot: Slot = 'primary'): Action => ({ label: st.yesLabel, onPress: () => h.sayYes(bar, slot) });
  const clashNote: Note = { text: `You’re booked at ${st.clashWith(s.days[0]?.date ?? '') || 'another venue'} then.`, icon: 'info' };
  const ended: Note = { text: st.endedNote(), icon: 'info' };
  const seeOpenJobs: Action = { label: 'See open jobs', onPress: h.seeOpenJobs };

  // 1. Invited and the shift is open.
  if (r?.status === 'invited' && s.status === 'open') {
    if (free.length) {
      bar.primary = sayYes();
      bar.secondary = { label: 'Decline', onPress: h.decline };
      bar.quiet = { label: `Message ${name}`, icon: 'message', onPress: h.message };
    } else bar.note = clashNote;
    return bar;
  }
  // 2. I have an active booking.
  if (b) {
    const more = r ? bookableDates(data, s, r) : [];
    bar.note = {
      booked: true,
      text: `${datesLabel(st.mine)}${more.length ? `. ${name} may also book you for ${datesLabel(more)}.` : ''}`,
    };
    bar.primary = { label: 'View your booking', onPress: h.viewBooking };
    if (s.status === 'open' && st.offerAgain.length)
      bar.secondary = { label: `Offer ${datesLabel(st.offerAgain)} again`, onPress: () => h.offerAgain(bar) };
    return bar;
  }
  // 3. My answer is can-cover.
  if (r?.status === 'can-cover') {
    bar.note = { text: `Waiting for ${name} to book you${multi ? ` · ${datesLabel(st.waitingDates)}` : ''}.`, icon: 'waiting' };
    bar.primary = { label: 'Message', icon: 'message', onPress: h.message };
    bar.secondary = { label: 'Withdraw', onPress: h.withdraw };
    return bar;
  }
  // 4. The shift isn't open.
  if (s.status !== 'open') {
    bar.note = ended;
    bar.inline = seeOpenJobs;
    return bar;
  }
  // 5. Ended, and I may say yes again.
  if (st.ended && (r?.status === 'cancelled' || (s.mode === 'post' && st.eligible)) && free.length) {
    bar.note = ended;
    bar.primary = sayYes();
    return bar;
  }
  // 6. Ended otherwise.
  if (st.ended) {
    bar.note = ended;
    bar.inline = seeOpenJobs;
    return bar;
  }
  // 7. A request not sent to me.
  if (s.mode === 'request') {
    bar.note = { text: 'This request was sent to someone else.', icon: 'info' };
    return bar;
  }
  // 8. Not eligible.
  if (!st.eligible) {
    bar.note = { text: `This job is for ${shiftLabel(s)} only.`, icon: 'info' };
    return bar;
  }
  // 9. No free day.
  if (!free.length) {
    bar.note = clashNote;
    return bar;
  }
  // 10. Otherwise.
  bar.primary = sayYes();
  return bar;
}

/** The bar with one button loading or done, kept on screen while the answer lands. */
function withSlot(bar: Bar, slot: Slot, patch: Partial<Action>): Bar {
  const target = bar[slot];
  if (!target) return bar;
  const other: Slot = slot === 'primary' ? 'secondary' : 'primary';
  const frozenOther = bar[other] ? { ...bar[other]!, disabled: true } : undefined;
  const quiet = bar.quiet ? { ...bar.quiet, disabled: true } : undefined;
  return { ...bar, [slot]: { ...target, ...patch }, [other]: frozenOther, quiet };
}

/** The bar's note: where I stand on this shift. */
function BarNote({ note }: { note: Note }) {
  const t = useTheme();
  if (note.booked) {
    return (
      <Ticket spiked padding={t.space.md}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space.sm }} accessible accessibilityLabel={`You’re booked ${note.text}`}>
          <Badge label="You’re booked" tone="good" />
          <Text variant="subhead" weight="600" tabular style={{ flexShrink: 1 }}>
            {note.text}
          </Text>
        </View>
      </Ticket>
    );
  }
  return <Notice text={note.text} icon={note.icon} />;
}

const DAY_BADGE: Record<string, Pick<BadgeProps, 'tone' | 'icon'>> = {
  'You’re booked': { tone: 'good' },
  Started: { tone: 'neutral', icon: 'clock' },
  Filled: { tone: 'neutral', icon: 'people' },
  'You said yes': { tone: 'neutral', icon: 'waiting' },
  Open: { tone: 'neutral', icon: 'circle' },
};

/** One day of the coverage list: the date, the hours, its status. */
function DayRow({ title, subtitle, status }: { title: string; subtitle: string; status: string }) {
  const look = DAY_BADGE[status] ?? { tone: 'neutral' as const, icon: 'cancelled' as const };
  return <Row title={title} subtitle={subtitle} valueTabular trailing={<Badge label={status} tone={look.tone} icon={look.icon} />} />;
}

/** Free text inside a Section card. */
function TextBlock({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: t.space.lg, paddingVertical: t.space.md }}>
      <Text variant="body" selectable>
        {text}
      </Text>
    </View>
  );
}
