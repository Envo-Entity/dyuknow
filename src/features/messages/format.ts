// Small formatting and routing helpers for Messages, Chat and Notifications.
// Money and hours come from `@/domain` (money, hoursLabel).
import type { Href } from 'expo-router';

/** "1,850": thousands with a comma, without relying on Intl. */
export function thousands(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * A notice's stored target ("shift/<id>", "booking/<id>", "availability",
 * "profile", "account", "bookings") → the app route. `tab` targets are tab
 * roots: navigate to them (back to the existing tabs), never push a second
 * tab navigator. Null when unknown.
 */
export function noticeRoute(target: string, side: 'talent' | 'venue' | null): { href: Href; tab: boolean } | null {
  const [kind, id] = target.split('/');
  switch (kind) {
    case 'shift':
      return id ? { href: `/shift/${id}` as Href, tab: false } : null;
    case 'booking':
      return id ? { href: `/booking/${id}` as Href, tab: false } : null;
    case 'availability':
      return { href: side === 'talent' ? '/t/availability' : '/v/bookings', tab: true };
    case 'bookings':
      return { href: side === 'venue' ? '/v/bookings' : '/t/availability', tab: true };
    case 'profile':
      return { href: side === 'venue' ? '/v/profile' : '/t/profile', tab: true };
    case 'account':
      return { href: '/account', tab: false };
    default:
      return null;
  }
}
