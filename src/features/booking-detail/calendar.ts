// "Add to calendar": one event per booked day in the phone's default
// calendar. The website downloads an .ics file with the same events.
// The legacy API is the one Expo Go ships (the `next` API is stubbed there).
import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

export type CalendarEvent = { title: string; location: string; notes: string; from: string; to: string };
export type CalendarResult = 'added' | 'denied' | 'no-calendar' | 'failed';

/** The one line to show for each outcome. */
export const CALENDAR_COPY: Record<CalendarResult, string> = {
  added: 'Added to your calendar.',
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

export async function addToCalendar(events: CalendarEvent[]): Promise<CalendarResult> {
  try {
    const permission = await Calendar.requestCalendarPermissionsAsync();
    if (!permission.granted) return 'denied';
    const calendarId = await defaultCalendarId();
    if (!calendarId) return 'no-calendar';
    for (const e of events) {
      await Calendar.createEventAsync(calendarId, {
        title: e.title,
        startDate: new Date(e.from),
        endDate: new Date(e.to),
        location: e.location || undefined,
        notes: e.notes,
        timeZone: 'Europe/London',
      });
    }
    return 'added';
  } catch {
    return 'failed';
  }
}
