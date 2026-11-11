// The talent side's read rules for shifts, ported from the website's
// TalentHome (Discovery.tsx) and TalentShift (ShiftDetail.tsx). Pure: no React.
import {
  activeDays,
  availableDates,
  bookOnAccept,
  bookingServices,
  busyDates,
  datesLabel,
  endedLabel,
  hoursOf,
  offeredDates,
  openDates,
  shiftLabel,
  type Booking,
  type Data,
  type Member,
  type Response,
  type Shift,
} from '@/domain';

/** A member by id, or undefined (the domain's `member()` assumes it exists). */
export function findMember(data: Data, id: string): Member | undefined {
  return data.members.find((m) => m.id === id);
}

export function venueName(data: Data, s: Shift) {
  return findMember(data, s.venue)?.name ?? 'Another venue';
}

/** Venue types plus cuisines, joined with ` · `. */
export function venueKinds(v: Member | undefined) {
  return v?.venue ? [...v.venue.types, ...v.venue.cuisines].join(' · ') : '';
}

/** "Answered": a live answer of mine on the shift. */
const ENDED_FOR_FEED = ['withdrawn', 'declined', 'cancelled', 'not-selected', 'lapsed'];

/** Everything the Shifts tab shows, in order (§4). */
export function talentHome(data: Data, me: Member) {
  const actor = me.id;
  const mine = data.responses.filter((r) => r.talent === actor);
  const shiftOf = (id: string) => data.shifts.find((s) => s.id === id);
  const bookings = data.bookings.filter((b) => b.talent === actor && shiftOf(b.shift));
  const lastEnd = (b: Booking) => bookingServices(data, b).at(-1)?.to ?? '';
  const upcoming = bookings
    .filter((b) => !b.cancelled && lastEnd(b) > data.now)
    .sort((a, b) => (bookingServices(data, a)[0]?.from ?? '').localeCompare(bookingServices(data, b)[0]?.from ?? ''));
  const invites = mine.filter((r) => r.status === 'invited' && shiftOf(r.shift)?.status === 'open');
  const waiting = mine.filter((r) => r.status === 'can-cover' && shiftOf(r.shift));
  const ended = mine.filter(
    (r) => ['withdrawn', 'declined', 'not-selected', 'lapsed'].includes(r.status) && shiftOf(r.shift),
  );
  const pastBookings = bookings.filter((b) => b.cancelled || lastEnd(b) <= data.now);
  const answered = (s: Shift) => mine.some((r) => r.shift === s.id && !ENDED_FOR_FEED.includes(r.status));
  const feed = data.shifts
    .filter(
      (s) =>
        s.mode === 'post' &&
        s.status === 'open' &&
        me.roles.some((r) => s.roles.includes(r)) &&
        !answered(s) &&
        availableDates(data, actor, s).length > 0,
    )
    .sort((a, b) => a.days[0].from.localeCompare(b.days[0].from));
  const venues = data.members
    .filter((m) => m.side === 'venue' && m.approved)
    .map((v) => ({ v, open: openJobs(data, v.id).length }))
    .sort((a, b) => b.open - a.open || a.v.name.localeCompare(b.v.name));
  // How many of a shift's days I could still take.
  const free = (s: Shift) => availableDates(data, actor, s).length;
  return { upcoming, invites, waiting, ended, pastBookings, feed, venues, free, history: pastBookings.length + ended.length };
}

/** A venue's open job posts. */
export function openJobs(data: Data, venueId: string) {
  return data.shifts.filter((s) => s.venue === venueId && s.mode === 'post' && s.status === 'open');
}

/** The long ended label for the history list (§4.7). */
export function endedStatus(data: Data, r: Response) {
  const s = data.shifts.find((x) => x.id === r.shift);
  const name = s ? venueName(data, s) : undefined;
  return (
    endedLabel(r, name) ??
    ({
      withdrawn: 'Withdrawn',
      declined: 'Declined',
      'not-selected': 'Filled by someone else',
      lapsed: 'Booked elsewhere',
    } as Record<string, string>)[r.status] ??
    r.status
  );
}

/** Everything §6.1 computes for one talent member and one shift. */
export function talentShiftState(data: Data, me: Member, s: Shift) {
  const actor = me.id;
  const venue = findMember(data, s.venue);
  const name = venue?.name ?? 'Another venue';
  const r = data.responses.find((x) => x.shift === s.id && x.talent === actor);
  const free = availableDates(data, actor, s);
  const open = openDates(data, s);
  const busy = busyDates(data, actor, s);
  const suggested = free.filter((d) => !busy.includes(d));
  const b = data.bookings.find((x) => x.shift === s.id && x.talent === actor && !x.cancelled);
  const cancelled = data.bookings.find((x) => x.shift === s.id && x.talent === actor && x.cancelled);
  const invited = r?.status === 'invited';
  const accept = invited && bookOnAccept(data, s);
  const myRole = s.roles.find((role) => me.roles.includes(role)) || shiftLabel(s);
  const eligible = invited || me.roles.some((role) => s.roles.includes(role));
  const multi = s.days.length > 1;
  const hours = s.days[0] ? hoursOf(s.days[0]) : 0;
  const mine = b ? activeDays(b) : [];
  const waitingDates = r ? offeredDates(s, r) : [];

  // The venue where I'm booked at an overlapping time, or ''.
  const clashWith = (date: string) => {
    const day = s.days.find((d) => d.date === date);
    if (!day) return '';
    const other = data.bookings.find(
      (x) =>
        x.talent === actor &&
        !x.cancelled &&
        x.shift !== s.id &&
        data.shifts.some((y) => y.id === x.shift) &&
        bookingServices(data, x).some((d) => d.from < day.to && day.from < d.to),
    );
    if (!other) return '';
    const os = data.shifts.find((y) => y.id === other.shift)!;
    return venueName(data, os);
  };

  // Cancelled days of my booking that are open again and not in my answer.
  const offerAgain =
    b && r
      ? b.days.filter((d) => b.log[d]?.status === 'cancelled' && free.includes(d) && !offeredDates(s, r).includes(d))
      : [];

  const endedNote = () => {
    const status = r?.status;
    return (
      (r && endedLabel(r, name)) ||
      (status === 'declined'
        ? 'You declined.'
        : status === 'withdrawn'
          ? 'You withdrew.'
          : status === 'cancelled'
            ? `This booking was cancelled${cancelled?.reason ? `: ${cancelled.reason}` : '.'}`
            : s.status === 'expired'
              ? 'This shift has started.'
              : s.status === 'closed'
                ? `${name} cancelled this ${s.mode === 'request' ? 'request' : 'job post'}${s.closeReason ? `: ${s.closeReason}` : '.'}`
                : 'Filled by someone else.')
    );
  };

  const ended = ['declined', 'withdrawn', 'lapsed', 'not-selected', 'cancelled'].includes(r?.status ?? '');

  /** One day's status in the coverage list, checked in the spec's order. */
  const dayStatus = (date: string) => {
    const d = s.days.find((x) => x.date === date)!;
    if (mine.includes(date)) return 'You’re booked';
    const clash = clashWith(date);
    if (clash) return `You’re at ${clash}`;
    if (!open.includes(date)) return d.from <= data.now ? 'Started' : 'Filled';
    if (r && ['can-cover', 'booked'].includes(r.status) && waitingDates.includes(date)) return 'You said yes';
    return 'Open';
  };

  const yesLabel =
    multi && free.length < s.days.length
      ? `${accept ? 'Accept' : 'I can do'} ${free.length} of ${s.days.length} days`
      : accept
        ? 'Accept'
        : 'I can do this';

  return {
    venue,
    name,
    r,
    free,
    open,
    busy,
    suggested,
    b,
    cancelled,
    invited,
    accept,
    myRole,
    eligible,
    multi,
    hours,
    mine,
    waitingDates,
    clashWith,
    offerAgain,
    endedNote,
    ended,
    dayStatus,
    yesLabel,
  };
}

export type TalentShiftState = ReturnType<typeof talentShiftState>;

/** The which-days button (§6.1 sheet). */
export function whichDaysLabel(picked: string[], total: number, accept: boolean) {
  if (!picked.length) return 'Tick the days you can do';
  return `${accept ? 'Accept' : 'Yes to'} ${picked.length === total ? `all ${total} days` : datesLabel(picked)}`;
}
