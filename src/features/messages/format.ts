// Small formatting and routing helpers for Messages, Chat and Notifications.
import type { Href } from 'expo-router';

/** §10.8: whole pounds as "£18", otherwise two decimals "£18.50". */
export function money(n: number) {
  return Number.isInteger(n) ? `£${n}` : `£${n.toFixed(2)}`;
}

/** "1,850": thousands with a comma, without relying on Intl. */
export function thousands(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Hours as the web shows them: 6, 6.5, 6.25. */
export function hours(n: number) {
  return String(Math.round(n * 100) / 100);
}

/**
 * A notice's stored target ("shift/<id>", "booking/<id>", "availability",
 * "profile", "account", "bookings") → the app route. Null when unknown.
 */
export function noticeRoute(target: string, side: 'talent' | 'venue' | null): Href | null {
  const [kind, id] = target.split('/');
  switch (kind) {
    case 'shift':
      return id ? (`/shift/${id}` as Href) : null;
    case 'booking':
      return id ? (`/booking/${id}` as Href) : null;
    case 'availability':
      return side === 'talent' ? '/t/availability' : '/v/bookings';
    case 'bookings':
      return side === 'venue' ? '/v/bookings' : '/t/availability';
    case 'profile':
      return side === 'venue' ? '/v/profile' : '/t/profile';
    case 'account':
      return '/account';
    default:
      return null;
  }
}
