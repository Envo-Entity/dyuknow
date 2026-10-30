// Words the screens show, built from the data.
import { datePlus, displayDate } from "./time.ts";
import type { Availability, Member, Response, ResponseStatus, Service, Shift } from "./types.ts";

// What an ended answer says, from its end reason. Undefined when there is
// no reason.
export function endedLabel(r: Response, venueName?: string, form: "short" | "long" = "long") {
  switch (r.endReason) {
    case "filled":
      return form === "short" ? "Filled" : "Filled by someone else";
    case "venue-closed":
      return form === "short"
        ? "Cancelled"
        : venueName
          ? `Cancelled by ${venueName}`
          : "Cancelled by the venue";
    case "booked-elsewhere":
      return "Booked elsewhere";
    case "shift-started":
      return form === "short" ? "Started" : "This shift has started.";
    case "unavailable":
      return "Ended";
    default:
      return undefined;
  }
}
export function responseLabel(r: Response) {
  const ended = endedLabel(r, undefined, "short");
  if (ended) return ended;
  return {
    invited: "Booking request",
    "can-cover": "Said yes",
    booked: "Booked",
    cancelled: "Cancelled",
    declined: "Declined",
    withdrawn: "Withdrawn",
    "not-selected": "Filled",
    lapsed: "Booked elsewhere",
  }[r.status];
}
// "TW9 1UA" → "TW9": the only part of a postcode shown before a booking.
// The live app shows the postcode as typed (shownPostcode) when there is one.
export function areaOf(m: Pick<Member, "postcode"> & { shownPostcode?: string }) {
  if (m.shownPostcode) return m.shownPostcode.trim().toUpperCase();
  const p = m.postcode.trim().toUpperCase();
  if (!p) return "";
  if (p.includes(" ")) return p.split(" ")[0];
  // An area on its own ("SW1X", "TW9") is already the part shown.
  return p.length <= 4 ? p : p.slice(0, -3) || p;
}
export function fullAddress(m: Member) {
  return [m.venue?.address, m.postcode].filter(Boolean).join(", ");
}
export function contactLine(m: Member) {
  return [m.venue?.contactName, m.venue?.contactRole].filter(Boolean).join(" · ");
}
export function shiftLabel(s: Shift) {
  return s.roles.join(" or ");
}
// "Fri 2 Oct · 17:00–23:00", or overnight "Fri 2 Oct · 22:00 → Sat 3 Oct 02:00".
export function serviceLabel(s: Service) {
  return `${displayDate(s.date)} · ${s.start}${s.end < s.start ? ` → ${displayDate(datePlus(s.date, 1))} ${s.end}` : `–${s.end}`}`;
}
// A free day saved as midnight to midnight is the whole day.
export function freeLabel(a: Availability) {
  return a.start === "00:00" && a.end === "00:00" ? "All day" : `${a.start}–${a.end}`;
}
export function joinNames(list: string[]) {
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
}
export function firstName(m: Member) {
  return m.side === "talent" ? m.name.split(" ")[0] : m.name;
}
// Why a venue can't ask this person again for the same hours.
export function alreadyAsked(t: Member, status: ResponseStatus) {
  const name = firstName(t);
  return status === "booked"
    ? `${name} is already booked then.`
    : status === "invited"
      ? `You’ve already asked ${name} for this time.`
      : `${name} already said yes to your job post for this time.`;
}
// Runs of back-to-back dates: ["Sat 3", "Sun 4", "Tue 6"] → [[3, 4], [6]].
function runs(dates: string[]) {
  const sorted = [...new Set(dates)].sort();
  const out: string[][] = [];
  for (const d of sorted) {
    const last = out.at(-1);
    if (last && datePlus(last.at(-1)!, 1) === d) last.push(d);
    else out.push([d]);
  }
  return out;
}
// Compact label for dates, back-to-back days as ranges: "Mon 5 Oct",
// "Mon 5–Wed 7 Oct", "Sat 3–Sun 4, Tue 13 Oct".
export function datesLabel(dates: string[]) {
  const groups = runs(dates);
  if (!groups.length) return "";
  const all = groups.flat();
  if (all.length === 1) return displayDate(all[0]);
  const sameMonth = all.every((d) => d.slice(0, 7) === all[0].slice(0, 7));
  const short = (d: string) => (sameMonth ? displayDate(d).replace(/ [A-Za-z]+$/, "") : displayDate(d));
  const month = sameMonth ? displayDate(all[0]).replace(/^.* /, " ") : "";
  return `${groups
    .map((g) => (g.length > 1 ? `${short(g[0])}–${short(g.at(-1)!)}` : short(g[0])))
    .join(", ")}${month}`;
}
// Dates short enough for one glance. Up to two runs read in full; more
// become a count and the span they fall in: "7 days" · "Sat 3 – Tue 20 Oct".
export function datesSummary(dates: string[]) {
  const groups = runs(dates);
  const all = groups.flat();
  if (groups.length <= 2) return { main: datesLabel(all), sub: "" };
  const first = displayDate(all[0]);
  const last = displayDate(all.at(-1)!);
  const sameMonth = all[0].slice(0, 7) === all.at(-1)!.slice(0, 7);
  return {
    main: `${all.length} days`,
    sub: `${sameMonth ? first.replace(/ [A-Za-z]+$/, "") : first} – ${last}`,
  };
}
