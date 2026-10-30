// What the booking screen and its two sheets show, worked out from the
// snapshot. A port of the website's BookingDetail (components/preview/
// ShiftDetail.tsx); the rules are FEATURES.md §7.1.
import {
  areaOf,
  bookingPast,
  bookingServices,
  contactLine,
  datesLabel,
  dayRecords,
  firstName,
  fullAddress,
  hoursLabel,
  money,
  openDates,
  relativeDay,
  serviceLabel,
  shiftLabel,
  teamOf,
  type Booking,
  type Data,
  type DayStatus,
  type Member,
  type Shift,
} from '@/domain';
import type { BadgeTone, HeadlinePart, IconName } from '@/ui';

/** Who did something: a member's name, or Dyuknow for the system. */
export function nameOf(data: Data, id: string | undefined) {
  const m = id ? data.members.find((x) => x.id === id) : undefined;
  return m?.name || 'Dyuknow';
}
/** The reasons a booking can be cancelled for. The venue has one more. */
export function cancelReasons(venueView: boolean) {
  return [
    'Illness or emergency',
    'Plans changed',
    'Unable to travel',
    ...(venueView ? ['Cover no longer needed'] : []),
    'Other',
  ];
}

export type Found = { b: Booking; s: Shift; v: Member; t: Member; venueView: boolean };

/** The booking, its shift and both people, when the signed-in member is one of them. */
export function findBooking(data: Data, meId: string | undefined, id: string | undefined): Found | null {
  const b = id ? data.bookings.find((x) => x.id === id) : undefined;
  if (!b || !meId) return null;
  const s = data.shifts.find((x) => x.id === b.shift);
  if (!s || ![s.venue, b.talent].includes(meId)) return null;
  const v = data.members.find((m) => m.id === s.venue);
  const t = data.members.find((m) => m.id === b.talent);
  if (!v || !t) return null;
  return { b, s, v, t, venueView: meId === s.venue };
}

export type DayLine = {
  date: string;
  title: string;
  detail: string;
  status: DayStatus;
  badge: { label: string; tone: BadgeTone; icon?: IconName | null };
  /** The venue confirms this day's hours: the row opens the sheet. */
  confirm: boolean;
  start: string;
  end: string;
};

/** Days that haven't started, the ones either side may still cancel. */
export function futureServices(data: Data, b: Booking) {
  return b.cancelled ? [] : bookingServices(data, b).filter((d) => d.from > data.now);
}

export function bookingView(data: Data, found: Found) {
  const { b, s, v, t, venueView } = found;
  const services = bookingServices(data, b);
  const firstDay = services[0];
  if (!firstDay) return null;
  const past = bookingPast(data, b);
  const started = firstDay.from <= data.now;
  const future = futureServices(data, b);
  const records = dayRecords(data, b);
  const person = venueView ? t : v;
  const first = firstName(person);
  const tFirst = firstName(t);

  const rel = relativeDay(firstDay.date, data.now);
  const whenWords = rel === 'Today' || rel === 'Tomorrow' ? rel.toLowerCase() : `on ${rel}`;
  const titleParts: HeadlinePart[] = b.cancelled
    ? ['Booking cancelled']
    : past
      ? ['Past booking']
      : venueView
        ? started
          ? [{ em: tFirst }, ' is on service']
          : [{ em: tFirst }, `’s coming ${whenWords} at ${firstDay.start}`]
        : started
          ? ['You’re on service at ', { em: v.name }]
          : ['You’re booked at ', { em: v.name }];
  const title = titleParts.map((p) => (typeof p === 'string' ? p : p.em)).join('');

  const dates = services.map((d) => d.date);
  const whenLine =
    services.length === 1 ? serviceLabel(firstDay) : `${datesLabel(dates)} · ${firstDay.start}–${firstDay.end}`;

  const days: DayLine[] = records.map((r) => {
    const detail =
      r.status === 'worked'
        ? `${r.start}–${r.end} · ${hoursLabel(r.hours)} · ${money(r.pay)}${r.log?.auto ? ' · confirmed automatically' : ''}`
        : r.status === 'cancelled'
          ? r.log?.reason
            ? `${nameOf(data, r.log.by)}: ${r.log.reason}`
            : nameOf(data, r.log?.by)
          : r.status === 'to-confirm'
            ? venueView
              ? 'Confirms automatically after 48 hours'
              : `${v.name} has 48 hours to confirm`
            : r.status === 'no-show'
              ? 'Not paid'
              : `${hoursLabel(r.hours)} · about ${money(r.pay)}`;
    const badge: DayLine['badge'] =
      r.status === 'booked'
        ? { label: 'Booked', tone: 'good' }
        : r.status === 'worked'
          ? { label: 'Worked', tone: 'good', icon: 'check' }
          : r.status === 'to-confirm'
            ? venueView
              ? { label: 'Confirm hours', tone: 'attention', icon: 'clock' }
              : { label: 'Waiting for hours', tone: 'neutral', icon: 'waiting' }
            : r.status === 'no-show'
              ? { label: 'Didn’t show', tone: 'neutral', icon: 'noShow' }
              : { label: 'Cancelled', tone: 'neutral', icon: 'cancelled' };
    return {
      date: r.date,
      title: serviceLabel(r.service),
      detail,
      status: r.status,
      badge,
      confirm: venueView && r.status === 'to-confirm',
      start: r.start,
      end: r.end,
    };
  });

  const worked = records.filter((r) => r.status === 'worked');
  const workedHours = worked.reduce((n, r) => n + r.hours, 0);
  const stillOn = records.some((r) => r.status === 'booked' || r.status === 'to-confirm');
  const footer = `${money(s.rate)}/h · ${shiftLabel(s)} · paid by ${v.name}${
    worked.length ? ` · ${hoursLabel(workedHours)} worked${stillOn ? ' so far' : ''}` : ''
  }`;

  const open = venueView && s.status === 'open' ? openDates(data, s) : [];
  const reopened =
    open.length > 0 && records.some((r) => r.status === 'cancelled')
      ? `${datesLabel(open)} ${open.length === 1 ? 'needs' : 'need'} someone again.`
      : null;

  const address = fullAddress(v);
  const showArrival = !b.cancelled && !past;

  return {
    title,
    titleParts,
    whenLine,
    headerTitle: datesLabel(dates),
    person,
    first,
    personLine: venueView
      ? t.roles.join(' · ')
      : [shiftLabel(s), areaOf(v)].filter(Boolean).join(' · '),
    cancelledBy: b.cancelled ? `Cancelled by ${nameOf(data, b.by)}` : null,
    cancelReason: b.cancelled ? b.reason || '' : '',
    days,
    footer,
    reopened,
    showArrival,
    arrivalTitle: venueView ? `Shared with ${tFirst}` : 'Getting there',
    address,
    contact: [contactLine(v), v.phone].filter(Boolean).join(' · '),
    note: s.note || 'No note.',
    // The number to call: the talent's mobile for the venue, the venue's for talent.
    phone: (venueView ? t.phone : v.phone).trim(),
    bookAgain: venueView && (past || b.cancelled) ? { team: teamOf(s.roles), to: t.id } : null,
    cancelLabel: future.length > 1 ? 'Cancel days' : 'Cancel booking',
    canCancel: future.length > 0,
    // Hours to confirm are waiting on the venue: the ticket is under the lamp.
    lit: days.some((d) => d.confirm),
    settled: b.cancelled || (past && !stillOn),
    calendarEvents: services.map((d) => ({
      title: `${shiftLabel(s)} at ${v.name}`,
      location: address,
      notes: `${money(s.rate)}/hour. ${s.note}`.trim(),
      from: d.from,
      to: d.to,
    })),
  };
}
export type BookingView = NonNullable<ReturnType<typeof bookingView>>;
