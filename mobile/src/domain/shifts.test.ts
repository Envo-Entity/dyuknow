import test from "node:test";
import assert from "node:assert/strict";
import {
  availableDates,
  bookableDates,
  bookOnAccept,
  busyDates,
  conflict,
  dayRecords,
  declinedByAll,
  makeDays,
  openAnswer,
  openDates,
  unreadChat,
  venueSummary,
  workedWith,
} from "./shifts.ts";
import { isFree, rankTalent, standing, standingLabel } from "./talent.ts";
import { daysFor } from "./shifts.ts";
import { addBooking, addResponse, addShift, world } from "./testData.ts";

const OCT = (d: number) => `2026-10-${String(d).padStart(2, "0")}`;

test("up to 14 dates, any within the window, with the same hours", () => {
  assert.equal(makeDays({ date: OCT(8), count: 14, start: "17:00", end: "23:00" }).length, 14);
  assert.throws(() => makeDays({ date: OCT(8), count: 15, start: "17:00", end: "23:00" }), /1 and 14/);
  const days = makeDays({ dates: [OCT(12), OCT(5), OCT(7), OCT(5)], start: "17:00", end: "23:00" });
  assert.deepEqual(days.map((d) => d.date), [OCT(5), OCT(7), OCT(12)]);
  assert.throws(() => makeDays({ dates: [], start: "17:00", end: "23:00" }), /1 and 14 dates/);
  assert.throws(() => makeDays({ dates: [OCT(5)], start: "17:00", end: "17:00" }), /different start and end/);
});

test("bookableDates: offered, still open, not already booked for this person", () => {
  const d = world();
  const s = addShift(d, { dates: [OCT(8), OCT(9), OCT(10)], capacity: 1 });
  const poppy = addResponse(d, s, "poppy", { days: [OCT(8), OCT(9)] });
  const theo = addResponse(d, s, "theo");
  assert.deepEqual(bookableDates(d, s, poppy), [OCT(8), OCT(9)]);
  // Theo is booked for the 9th: it's no longer open for Poppy, and Theo
  // can't be booked for it twice.
  addBooking(d, s, "theo", [OCT(9)]);
  assert.deepEqual(bookableDates(d, s, poppy), [OCT(8)]);
  assert.deepEqual(bookableDates(d, s, theo), [OCT(8), OCT(10)]);
  // A day that has started isn't bookable.
  d.now = "2026-10-08T16:30:00.000Z";
  assert.deepEqual(bookableDates(d, s, theo), [OCT(10)]);
  assert.deepEqual(openDates(d, s), [OCT(10)]);
});

test("availableDates drops open days that clash with a booking elsewhere", () => {
  const d = world();
  const s = addShift(d, { dates: [OCT(8), OCT(9)] });
  const other = addShift(d, { venue: "harper", dates: [OCT(9)], start: "20:00", end: "23:30" });
  assert.deepEqual(availableDates(d, "poppy", s), [OCT(8), OCT(9)]);
  addBooking(d, other, "poppy");
  assert.deepEqual(availableDates(d, "poppy", s), [OCT(8)]);
  assert.ok(conflict(d, "poppy", s.days));
  assert.equal(conflict(d, "poppy", s.days, other.id), undefined);
  // A cancelled booking frees the calendar.
  d.bookings[0].cancelled = true;
  assert.deepEqual(availableDates(d, "poppy", s), [OCT(8), OCT(9)]);
});

test("venueSummary: no replies, waiting, said yes, booked, filled, ended", () => {
  const d = world();
  const post = addShift(d);
  assert.deepEqual(venueSummary(d, post), { text: "No replies yet", good: false, needs: false });
  const req = addShift(d, { mode: "request" });
  addResponse(d, req, "poppy", { source: "invite", status: "declined" });
  addResponse(d, req, "theo", { source: "invite", status: "invited" });
  assert.equal(venueSummary(d, req).text, "Waiting for Theo");
  addResponse(d, post, "poppy");
  assert.deepEqual(venueSummary(d, post), { text: "1 said yes · Book", good: true, needs: true });
  // A yes from someone not approved can't be booked.
  d.members.find((m) => m.id === "poppy")!.approved = false;
  assert.equal(venueSummary(d, post).text, "No replies yet");
  d.members.find((m) => m.id === "poppy")!.approved = true;
  assert.equal(venueSummary(d, { ...post, status: "filled" }).text, "Filled");
  assert.equal(venueSummary(d, { ...post, status: "expired" }).text, "Started unfilled");
  assert.equal(venueSummary(d, { ...post, status: "closed", closedBy: "venue" }).text, "Cancelled");
  assert.equal(venueSummary(d, { ...req, status: "closed", closedBy: "all-declined" }).text, "Declined");
  assert.equal(declinedByAll(d, { ...req, closedBy: null }), false);
});

test("venueSummary talks in people per day once someone is booked", () => {
  const d = world();
  const two = addShift(d, { dates: [OCT(8), OCT(9)], capacity: 2 });
  addBooking(d, two, "poppy");
  addResponse(d, two, "poppy", { status: "booked" });
  const text = venueSummary(d, two).text;
  assert.doesNotMatch(text, /no replies|days covered/);
  assert.equal(text, "Thu 8, Fri 9 each need 1 more person");
  const one = addShift(d, { capacity: 2 });
  addBooking(d, one, "theo");
  assert.equal(venueSummary(d, one).text, "1 of 2 booked");
  const mixed = addShift(d, { dates: [OCT(8), OCT(9)], capacity: 2 });
  addBooking(d, mixed, "ethan", [OCT(8)]);
  assert.equal(venueSummary(d, mixed).text, "Thu 8 needs 1 more person · Fri 9 needs 2 people");
});

test("a cancelled day says cover is needed again, then waits once someone else is asked", () => {
  const d = world();
  const s = addShift(d, { dates: [OCT(8), OCT(9)] });
  const b = addBooking(d, s, "poppy");
  b.log[OCT(9)] = { status: "cancelled", by: "poppy", at: d.now, reason: "Illness" };
  assert.deepEqual(venueSummary(d, s), { text: "Cover needed again · Fri 9 needs 1 person", good: false, needs: true });
  const single = addShift(d);
  const sb = addBooking(d, single, "poppy", undefined, { cancelled: true });
  sb.log[OCT(8)] = { status: "cancelled", by: "poppy", at: d.now };
  assert.deepEqual(venueSummary(d, single), { text: "Cover needed again", good: false, needs: true });
  addResponse(d, single, "theo", { source: "invite", status: "invited" });
  assert.deepEqual(venueSummary(d, single), { text: "Waiting for Theo", good: false, needs: false });
});

test("Accept books for a request to one person for one place, unless the database says otherwise", () => {
  const d = world();
  const s = addShift(d, { mode: "request" });
  addResponse(d, s, "poppy", { source: "invite", status: "invited" });
  assert.equal(bookOnAccept(d, s), true);
  assert.equal(bookOnAccept(d, { ...s, capacity: 2 }), false);
  assert.equal(bookOnAccept(d, { ...s, acceptBooks: false }), false);
  addResponse(d, s, "theo", { source: "invite", status: "invited" });
  assert.equal(bookOnAccept(d, s), false);
});

test("a venue can't ask again someone already answering one of its asks for those hours", () => {
  const d = world();
  const s = addShift(d);
  addResponse(d, s, "poppy", { source: "invite", status: "invited" });
  const days = daysFor({ dates: [OCT(8)], start: "20:00", end: "23:30" });
  assert.equal(openAnswer(d, "spruce", "poppy", days)?.status, "invited");
  assert.equal(openAnswer(d, "harper", "poppy", days), undefined);
  assert.equal(openAnswer(d, "spruce", "poppy", days, s.id), undefined);
});

test("busy days come from the talent's own Not free marks; worked-with from confirmed work", () => {
  const d = world();
  const s = addShift(d, { dates: [OCT(5), OCT(6), OCT(7)] });
  assert.deepEqual(busyDates(d, "poppy", s), [OCT(6)]);
  const past = addShift(d, { dates: [OCT(8)] });
  const b = addBooking(d, past, "theo");
  assert.equal(workedWith(d, "spruce", "theo"), false);
  b.log[OCT(8)] = { status: "worked", by: "spruce", at: d.now, hours: 6 };
  assert.equal(workedWith(d, "spruce", "theo"), true);
  assert.equal(workedWith(d, "harper", "theo"), false);
});

test("a finished day waits for the venue, then shows its hours and pay", () => {
  const d = world();
  const s = addShift(d, { dates: [OCT(8), OCT(9)] });
  const b = addBooking(d, s, "poppy");
  d.now = "2026-10-08T22:30:00.000Z";
  assert.deepEqual(dayRecords(d, b).map((r) => r.status), ["to-confirm", "booked"]);
  b.log[OCT(8)] = { status: "worked", by: "spruce", at: d.now, start: "17:00", end: "22:30", hours: 5.5 };
  const [first] = dayRecords(d, b);
  assert.equal(first.status, "worked");
  assert.equal(first.end, "22:30");
  assert.equal(first.pay, 99);
});

test("unread chat ignores own messages and status events", () => {
  const d = world();
  d.threads.push({ id: "t", venue: "spruce", talent: "poppy", started: d.now });
  d.messages.push({ id: "1", thread: "t", from: "spruce", text: "Hi", time: d.now, system: false });
  assert.equal(unreadChat(d, "poppy", { id: "t" }), true);
  d.read["poppy/t"] = "1";
  assert.equal(unreadChat(d, "poppy", { id: "t" }), false);
  d.messages.push({ id: "2", thread: "t", from: "system", text: "Booked", time: d.now, system: true });
  d.messages.push({ id: "3", thread: "t", from: "poppy", text: "Thanks", time: d.now, system: false });
  assert.equal(unreadChat(d, "poppy", { id: "t" }), false);
});

test("a venue sees the people in the position, free then first", () => {
  const d = world();
  const days = daysFor({ dates: [OCT(6)], start: "17:00", end: "23:00" });
  const { free, unavailable } = rankTalent(d, "spruce", "Kitchen", "CDP", days);
  // Poppy marked Tue 6 not free; Theo never set availability. Nobody outside
  // the position is listed.
  assert.deepEqual(free.map((m) => m.id), []);
  assert.deepEqual(unavailable.map((m) => m.id), ["poppy", "theo"]);
  const wed = daysFor({ dates: [OCT(7)], start: "17:00", end: "23:00" });
  assert.deepEqual(rankTalent(d, "spruce", "Kitchen", undefined, wed).free.map((m) => m.id), ["camille", "ethan", "poppy"]);
  // People who worked here come first.
  const past = addShift(d, { dates: [OCT(8)] });
  addBooking(d, past, "poppy").log[OCT(8)] = { status: "worked", by: "spruce", at: d.now };
  assert.deepEqual(rankTalent(d, "spruce", "Kitchen", undefined, wed).free.map((m) => m.id), ["poppy", "camille", "ethan"]);
  // Unapproved talent never show.
  d.members.find((m) => m.id === "camille")!.approved = false;
  assert.deepEqual(rankTalent(d, "spruce", "Kitchen", undefined, wed).free.map((m) => m.id), ["poppy", "ethan"]);
});

test("standing reads the talent's own calendar, all-day and overnight", () => {
  const d = world();
  const evening = daysFor({ dates: [OCT(8)], start: "17:00", end: "23:00" });
  assert.equal(standing(d, "poppy", evening), "free");
  assert.equal(standing(d, "poppy", daysFor({ dates: [OCT(6)], start: "17:00", end: "23:00" })), "not-free");
  assert.equal(standing(d, "theo", evening), "not-set");
  const lunch = daysFor({ dates: [OCT(8)], start: "11:00", end: "15:00" });
  assert.equal(standing(d, "poppy", lunch), "other-hours");
  assert.equal(standingLabel(d, "poppy", lunch), "Available 16:00–23:59 only");
  assert.equal(standingLabel(d, "poppy", daysFor({ dates: [OCT(6), OCT(7)], start: "17:00", end: "23:00" })), "Available 1 of 2 days");
  d.availability.push({ member: "theo", date: OCT(8), kind: "free", start: "00:00", end: "00:00" });
  assert.equal(isFree(d, "theo", evening), true);
  d.availability.push({ member: "theo", date: OCT(9), kind: "free", start: "20:00", end: "03:00" });
  assert.equal(isFree(d, "theo", daysFor({ dates: [OCT(9)], start: "22:00", end: "02:00" })), true);
  const s = addShift(d, { venue: "harper", dates: [OCT(8)] });
  addBooking(d, s, "theo");
  assert.equal(standing(d, "theo", evening), "booked");
  assert.equal(standingLabel(d, "theo", evening), "Already booked");
});
