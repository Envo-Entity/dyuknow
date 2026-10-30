// The venue's chosen "when": up to 14 dates and one start/end time, shared by
// Book, a team list and the composer (FEATURES §1.9 "Saved when"). Kept in
// memory for the app, and on the device so it survives a relaunch for as long
// as its dates are still today or later.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { MAX_DAYS, datePlus, daysFor, londonToday, type Service } from '@/domain';

export type When = { dates: string[]; start: string; end: string };

const KEY = 'dyuknow.when-v2';
export const MAX_DATES = MAX_DAYS;
/** How far ahead the date tiles go: four two-week pages, eight weeks. */
export const DAYS_AHEAD = 56;

export const PRESETS = [
  { name: 'Lunch', start: '11:00', end: '16:00' },
  { name: 'Dinner', start: '17:00', end: '23:00' },
  { name: 'Late', start: '22:00', end: '02:00' },
] as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function defaultWhen(today = londonToday()): When {
  return { dates: [datePlus(today, 1)], start: '17:00', end: '23:00' };
}
function isWhen(v: unknown): v is When {
  const w = v as When | null;
  return (
    !!w &&
    Array.isArray(w.dates) &&
    w.dates.every((d) => typeof d === 'string' && DATE.test(d)) &&
    typeof w.start === 'string' &&
    TIME.test(w.start) &&
    typeof w.end === 'string' &&
    TIME.test(w.end)
  );
}
/** A kept value is used only while every date is today or later. */
function stillValid(w: When | null, today = londonToday()): w is When {
  return !!w && w.dates.length > 0 && w.dates.every((d) => d >= today);
}

// ---- the store ----

let saved: When | null = null; // the last value with at least one date
let current: When | null = null; // what Book shows (may have no dates)
let touched = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Restore what was kept on the device, unless someone already chose.
AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (touched || !raw) return;
    const v: unknown = JSON.parse(raw);
    if (isWhen(v) && stillValid(v)) {
      saved = v;
      current = v;
      emit();
    }
  })
  .catch(() => {
    /* No stored choice: start from tomorrow evening. */
  });

/** The kept "when", or tomorrow 17:00–23:00 (the website's `savedWhen`). */
export function savedWhen(): When {
  return stillValid(saved) ? saved : defaultWhen();
}

/** Keep a change. Values with no dates are shown but not kept (as the website). */
export function setWhen(next: When) {
  touched = true;
  current = next;
  if (next.dates.length) {
    saved = next;
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {
      /* The choice still applies in memory. */
    });
  }
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
let snapshot: When | null = null;
function getSnapshot(): When {
  const value = current && (current.dates.length === 0 || stillValid(current)) ? current : savedWhen();
  // Same object while nothing changed, so React doesn't re-render forever.
  if (!snapshot || snapshot.start !== value.start || snapshot.end !== value.end || snapshot.dates.join() !== value.dates.join())
    snapshot = value;
  return snapshot;
}

/** The shared "when" (Book reads and writes this one). */
export function useWhen(): [When, (next: When) => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [value, setWhen];
}

// ---- helpers ----

/** The days for a "when", or [] when the dates or hours can't work. */
export function whenDays(w: When): Service[] {
  try {
    return daysFor(w);
  } catch {
    return [];
  }
}

/** Route params for `team/[team]`. */
export function whenParams(w: When) {
  return { dates: w.dates.join(','), time: `${w.start}-${w.end}` };
}

/** A "when" from route params; undefined when they are missing or bad. */
export function parseWhen(dates?: string | string[], time?: string | string[]): When | undefined {
  const d = Array.isArray(dates) ? dates[0] : dates;
  const h = Array.isArray(time) ? time[0] : time;
  if (!d || !h) return undefined;
  const [start, end] = h.split('-');
  const w = { dates: [...new Set(d.split(',').filter(Boolean))].sort(), start, end };
  if (!isWhen(w) || !w.dates.length || w.dates.length > MAX_DATES) return undefined;
  return w;
}

/** The preset these hours match, if any. */
export function presetOf(w: Pick<When, 'start' | 'end'>) {
  return PRESETS.find((p) => p.start === w.start && p.end === w.end);
}
