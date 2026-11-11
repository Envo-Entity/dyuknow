// "Add to calendar": one event per booked day in the phone's default
// calendar. The website downloads an .ics file with the same events.
// The legacy API is the one Expo Go ships (the `next` API is stubbed there).
import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

export type CalendarEvent = { title: string; location: string; notes: string; from: string; to: string };
export type CalendarResult = 'added' | 'already' | 'denied' | 'no-calendar' | 'failed';

/** The one line to show for each outcome. */
export const CALENDAR_COPY: Record<CalendarResult, string> = {
  added: 'Added to your calendar.',
  already: 'These days are already in your calendar.',
  denied: 'Dyuknow can’t use your calendar. Allow it in Settings.',
  'no-calendar': 'There’s no calendar on this phone that can take new events.',
  failed: 'Couldn’t add to your calendar. Try again.',
};

async function defaultCalendarId() {
  if (Platform.OS === 'ios') {
    const c = await Calendar.getDefaultCalendarAsync();
    return c?.id ?? null;
  }
  // Android has no single default: take the primary calendar that accepts events.
  const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = all.filter((c) => c.allowsModifications);
  return (writable.find((c) => c.isPrimary) ?? writable[0])?.id ?? null;
}

/** What was added this session, so a second tap (or a revisit) never adds the days twice. */
const addedThisSession = new Set<string>();

/** One key per set of events: a booking whose days change can be added again. */
export function calendarKey(events: CalendarEvent[]) {
  return events.map((e) => `${e.title}|${e.from}|${e.to}`).join(',');
}

export function alreadyAdded(events: CalendarEvent[]) {
  return addedThisSession.has(calendarKey(events));
}

/** An event with the same title and start already sits in the calendar (added earlier, or on the web). */
async function exists(calendarId: string, e: CalendarEvent) {
  try {
    const from = new Date(e.from);
    const found = await Calendar.getEventsAsync([calendarId], from, new Date(e.to));
    return found.some((x) => x.title === e.title && new Date(x.startDate).getTime() === from.getTime());
  } catch {
    return false;
  }
}

export async function addToCalendar(events: CalendarEvent[]): Promise<CalendarResult> {
  const key = calendarKey(events);
  if (addedThisSession.has(key)) return 'already';
  try {
    const permission = await Calendar.requestCalendarPermissionsAsync();
    if (!permission.granted) return 'denied';
    const calendarId = await defaultCalendarId();
    if (!calendarId) return 'no-calendar';
    let made = 0;
    for (const e of events) {
      if (await exists(calendarId, e)) continue;
      await Calendar.createEventAsync(calendarId, {
        title: e.title,
        startDate: new Date(e.from),
        endDate: new Date(e.to),
        location: e.location || undefined,
        notes: e.notes,
        timeZone: 'Europe/London',
      });
      made += 1;
    }
    addedThisSession.add(key);
    return made ? 'added' : 'already';
  } catch {
    return 'failed';
  }
}
