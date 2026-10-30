// Small pieces the booking screens share. The ones marked "kit candidate"
// would belong in src/ui if other areas need them too.
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { openConversation } from '@/data/actions';
import { useLive } from '@/data/store';
import {
  bookingServices,
  datesLabel,
  relativeDay,
  teamOf,
  threadBetween,
  type Booking,
  type Data,
  type Member,
  type Shift,
} from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { alpha, Icon, LitContext, type IconName } from '@/ui';

/** Money (FEATURES §10.8): whole pounds as "£18", otherwise "£18.50". */
export function money(n: number) {
  return Number.isInteger(n) ? `£${n}` : `£${n.toFixed(2)}`;
}

/** The team a booking request to this person starts from (web `familyOf`). */
export function familyOf(t: Member, fallback = 'Kitchen') {
  return teamOf(t.roles, fallback);
}

/** "Thu 8 Oct · 17:00–23:00", or "Mon 5–Wed 7 Oct · 17:00–23:00" (web `whenLine`). */
export function whenLine(data: Data, s: Shift, dates?: string[]) {
  const first = dates ? s.days.find((d) => d.date === [...dates].sort()[0]) ?? s.days[0] : s.days[0];
  const span = dates ?? s.days.map((d) => d.date);
  return `${span.length > 1 ? datesLabel(span) : relativeDay(first.date, data.now)} · ${first.start}–${first.end}`;
}

/** This venue's bookings that aren't cancelled and haven't ended, soonest first. */
export function upcomingBookings(data: Data, venue: string): Booking[] {
  return data.bookings
    .filter((b) => {
      if (b.cancelled) return false;
      const s = data.shifts.find((x) => x.id === b.shift);
      if (!s || s.venue !== venue) return false;
      const days = bookingServices(data, b);
      return days.length > 0 && days[days.length - 1].to > data.now;
    })
    .sort((a, b) => bookingServices(data, a)[0].from.localeCompare(bookingServices(data, b)[0].from));
}

/**
 * Opens the one conversation with this person: straight there when it
 * exists, otherwise `open_conversation` first (FEATURES §7.3 open-thread).
 */
export function useMessage() {
  const { data, me, run } = useLive();
  return async (person: string) => {
    if (!data || !me) return;
    const venue = me.side === 'venue' ? me.id : person;
    const talent = me.side === 'venue' ? person : me.id;
    const existing = threadBetween(data, venue, talent);
    if (existing) {
      router.push(`/chat/${existing.id}`);
      return;
    }
    const r = await run(`open:${person}`, () => openConversation(person));
    if (r?.conversation_id) router.push(`/chat/${r.conversation_id}`);
  };
}

/**
 * Light text and icons over a photo scrim in both themes (kit candidate
 * "onPhoto"): in light mode the lit context turns `text` white; in dark mode
 * `text` is already light.
 */
export function OnPhoto({ children }: { children: ReactNode }) {
  const { scheme } = useTheme();
  return <LitContext.Provider value={scheme === 'light'}>{children}</LitContext.Provider>;
}

/** A bottom-up darkening for text over a photo (kit candidate "Scrim"). */
export function Scrim({ style }: { style?: ViewStyle }) {
  const { c } = useTheme();
  const dark = c.shadow;
  return (
    <View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
        { backgroundImage: `linear-gradient(to bottom, ${alpha(dark, 0)}, ${alpha(dark, 0.42)} 45%, ${alpha(dark, 0.8)})` },
        style,
      ]}
    />
  );
}

/** A bare round icon control (close, remove). Kit candidate "IconButton". */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 28,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
}) {
  const t = useTheme();
  const d = Math.round(size * t.scale);
  const slop = Math.max(0, (t.hit - d) / 2);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={slop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: d,
        height: d,
        borderRadius: d / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? t.c.borderStrong : t.c.fill,
      })}
    >
      <Icon name={icon} size={11} color="muted" weight="bold" />
    </Pressable>
  );
}

/** Padded free content inside a `Section` card. */
export function SectionBody({ children, gap }: { children: ReactNode; gap?: number }) {
  const t = useTheme();
  return <View style={{ paddingHorizontal: t.space.lg, paddingVertical: t.space.md, gap: gap ?? t.space.sm }}>{children}</View>;
}
