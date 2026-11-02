import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { LiveGate, setAvailability, useLive, useRefresh } from '@/data';
import {
  bookingServices,
  datePlus,
  datesLabel,
  displayDate,
  freeLabel,
  londonDate,
  member,
  serviceLabel,
  upcomingDates,
  type Availability,
  type Data,
  type Service,
} from '@/domain';
import { HeaderActions } from '@/features/shell/HeaderActions';
import { useTheme } from '@/theme/useTheme';
import {
  Badge,
  DayPager,
  GroupHeading,
  Icon,
  Screen,
  Section,
  Segmented,
  StickyAction,
  Text,
  Ticket,
  TimeRow,
  type DayInfo,
} from '@/ui';

type Kind = 'All day' | 'Hours' | 'Not free';

const KINDS: { value: Kind; label: string }[] = [
  { value: 'All day', label: 'Free all day' },
  { value: 'Hours', label: 'Free from–to' },
  { value: 'Not free', label: 'Not free' },
];

/** 8 weeks of days, today first (§1.9). */
const WEEKS = 8;

type BookedService = Service & { venue: string; booking: string };

/** Every service of mine on a booking that isn't fully cancelled (web AvailabilityEditor). */
function bookedServices(data: Data, me: string): BookedService[] {
  return data.bookings
    .filter((b) => b.talent === me && !b.cancelled)
    .flatMap((b) => {
      const shift = data.shifts.find((s) => s.id === b.shift);
      if (!shift) return [];
      return bookingServices(data, b).map((d) => ({ ...d, venue: shift.venue, booking: b.id }));
    });
}

export function AvailabilityScreen() {
  const header = (
    <>
      <Stack.Screen options={{ title: 'Availability' }} />
      <HeaderActions />
    </>
  );
  // Talent set availability whether approved or not.
  return (
    <LiveGate header={header} title="Availability" approval={false} loading={{ count: 2 }}>
      {({ data, me }) => (
        <>
          {header}
          <Editor data={data} meId={me.id} />
        </>
      )}
    </LiveGate>
  );
}

/** The form's kind and hours for a saved mark. */
function formFor(a: Availability): { kind: Kind; start: string; end: string } {
  return {
    kind: a.kind === 'not-free' ? 'Not free' : a.start === '00:00' && a.end === '00:00' ? 'All day' : 'Hours',
    start: a.start,
    end: a.end,
  };
}

function Editor({ data, meId }: { data: Data; meId: string }) {
  const t = useTheme();
  const { run } = useLive();
  const today = londonDate(data.now);
  const days = useMemo(() => upcomingDates(today, WEEKS * 7), [today]);

  const refresh = useRefresh();

  const marks = useMemo(() => {
    const m = new Map<string, Availability>();
    for (const a of data.availability) if (a.member === meId) m.set(a.date, a);
    return m;
  }, [data.availability, meId]);

  // Starts with today selected, its saved setting preloaded (§4 availability).
  const [initial] = useState(() => {
    const a = marks.get(today);
    return a ? formFor(a) : { kind: 'Hours' as Kind, start: '16:00', end: '23:59' };
  });
  const [selected, setSelected] = useState<string[]>([today]);
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [saving, setSaving] = useState(false);

  const booked = useMemo(() => bookedServices(data, meId), [data, meId]);
  const bookedOn = (d: string) => booked.find((b) => b.date === d || (b.end < b.start && datePlus(b.date, 1) === d));
  const upcoming = booked.filter((b) => b.to > data.now).sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));

  const describe = (d: string): DayInfo => {
    const a = marks.get(d);
    const b = bookedOn(d);
    if (b) return { note: 'Booked', spoken: `Booked at ${member(data, b.venue)?.name ?? 'a venue'}`, tone: 'booked' };
    if (a?.kind === 'not-free') return { note: 'Not free', tone: 'notFree' };
    if (a) return { note: freeLabel(a), tone: 'free' };
    return { note: 'Not set', tone: 'none' };
  };

  // Choosing a first day shows what it's already set to.
  const choose = (dates: string[]) => {
    const added = dates.find((d) => !selected.includes(d));
    const a = added && !selected.length ? marks.get(added) : undefined;
    setSelected(dates);
    if (a) {
      const f = formFor(a);
      setKind(f.kind);
      setStart(f.start);
      setEnd(f.end);
    }
  };

  const chooseKind = (k: Kind) => {
    setKind(k);
    if (k === 'Hours' && start === end) {
      setStart('16:00');
      setEnd('23:59');
    }
  };

  // After a save the tiles settle into their new tone.
  const settle = useSharedValue(1);
  const settleStyle = useAnimatedStyle(() => ({ opacity: settle.value }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const dates = [...new Set(selected)].sort();
    const allDay = kind === 'All day';
    const p = {
      dates,
      kind: kind === 'Not free' ? ('not-free' as const) : ('free' as const),
      start: allDay ? '00:00' : start,
      end: allDay ? '00:00' : end,
    };
    const r = await run('availability', () => setAvailability(p.dates, p.kind, p.start, p.end), {
      success: 'Availability saved.',
      args: p,
    });
    setSaving(false);
    if (r) {
      setSelected([]);
      settle.value = withSequence(withTiming(0.35, { duration: t.motion.fast }), withTiming(1, { duration: t.motion.normal }));
    }
  };

  const n = selected.length;
  const title = !n ? 'Choose days' : n === 1 ? displayDate(selected[0]) : `${n} days`;
  const overnight = kind === 'Hours' && end < start;

  return (
    <Screen
      title="Availability"
      subtitle="When are you free?"
      {...refresh}
      insideTabs
      footer={
        <StickyAction
          note={n ? undefined : 'Choose at least one date.'}
          primary={{
            label: n > 1 ? `Save ${n} days` : 'Save availability',
            onPress: () => void save(),
            loading: saving,
            disabled: !n,
          }}
        />
      }
    >
      <Animated.View style={settleStyle}>
        <DayPager days={days} value={selected} onChange={choose} describe={describe} />
      </Animated.View>

      <Section footer={overnight ? 'Ends the following day.' : undefined}>
        <View style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.md, paddingBottom: t.space.md, gap: t.space.md }}>
          <View style={{ gap: t.space.xxs }}>
            <Text variant="headline" accessibilityRole="header" accessibilityLiveRegion="polite">
              {title}
            </Text>
            {n > 1 ? (
              <Text variant="subhead" color="muted">
                {datesLabel(selected)}
              </Text>
            ) : null}
          </View>
          <Segmented options={KINDS} value={kind} onChange={chooseKind} />
        </View>
        {kind === 'Hours' ? <TimeRow label="From" value={start} onChange={setStart} /> : null}
        {kind === 'Hours' ? <TimeRow label="To" value={end} onChange={setEnd} /> : null}
      </Section>

      <View style={{ gap: t.space.sm }}>
        <GroupHeading title="Your bookings" />
        {upcoming.length ? (
          upcoming.map((b) => {
            const venue = member(data, b.venue)?.name ?? '';
            const line = `${serviceLabel(b)} · ${venue}`;
            return (
              <Ticket
                key={`${b.booking}-${b.date}`}
                spiked
                onPress={() => router.push(`/booking/${b.booking}`)}
                accessibilityLabel={`Booked, ${line}`}
                accessibilityHint="View booking"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
                  <Badge label="Booked" tone="good" icon="check" />
                  <View style={{ flex: 1 }} />
                  <Text variant="subhead" color="muted">
                    View booking
                  </Text>
                  <Icon name="forward" size={14} color="muted" />
                </View>
                <Text variant="body" tabular numberOfLines={2}>
                  {line}
                </Text>
              </Ticket>
            );
          })
        ) : (
          <Text variant="subhead" color="muted" style={{ paddingHorizontal: t.space.lg }}>
            No bookings yet.
          </Text>
        )}
      </View>
    </Screen>
  );
}
