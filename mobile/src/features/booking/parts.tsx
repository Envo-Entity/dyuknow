// Small pieces the booking screens share.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { bookingServices, teamOf, type Booking, type Data, type Member } from '@/domain';
import { useTheme } from '@/theme/useTheme';

/** The team a booking request to this person starts from (web `familyOf`). */
export function familyOf(t: Member, fallback = 'Kitchen') {
  return teamOf(t.roles, fallback);
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

/** Padded free content inside a `Section` card. */
export function SectionBody({ children, gap }: { children: ReactNode; gap?: number }) {
  const t = useTheme();
  return <View style={{ paddingHorizontal: t.space.lg, paddingVertical: t.space.md, gap: gap ?? t.space.sm }}>{children}</View>;
}
