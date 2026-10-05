import test from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  transition,
  makeDays,
  londonInstant,
  bookedCount,
  conflict,
  isFree,
  openDates,
  busyDates,
  workedWith,
  venueSummary,
  offerableDates,
  activeDays,
  dayRecords,
  threadBetween,
  accountOf,
  verifiedDocs,
  rankTalent,
  daysFor,
} from "../lib/preview/model.ts";
const draft = (patch = {}) => ({
  roles: ["CDP"],
  family: "Kitchen",
  date: "2026-10-08",
  count: 1,
  start: "17:00",
  end: "23:00",
  capacity: 1,
  rate: 18,
  note: "Staff meal",
  to: [],
  ...patch,
});
function post(data, patch = {}, actor = "spruce") {
  return transition(data, { type: "post", actor, draft: draft(patch) });
}
function respond(data, shift, actor = "poppy") {
  return transition(data, { type: "respond", actor, shift });
}
function book(data, shift, talent = "poppy", actor = "spruce") {
  return transition(data, { type: "book", actor, shift, talent });
}
const after = (iso, hours) => new Date(Date.parse(iso) + hours * 3600000).toISOString();

test("job post → yes → one conversation → book produces one shared booking", () => {
  let d = post(seed());
  const s = d.shifts[0].id;
  assert.equal(d.shifts[0].mode, "post");
  assert.ok(d.notices.some((n) => n.to === "poppy" && n.target === `shift/${s}`));
  d = respond(d, s);
  const r = d.responses.find((r) => r.shift === s && r.talent === "poppy");
  assert.equal(r.status, "can-cover");
  assert.equal(bookedCount(d, s), 0);
  // The yes goes back to the venue as a card in their one conversation.
  const t = threadBetween(d, "spruce", "poppy");
  assert.ok(d.messages.some((m) => m.thread === t.id && m.shift === s && m.from === "poppy"));
  d = transition(d, { type: "message", actor: "spruce", thread: t.id, text: "Meal included." });
  d = transition(d, { type: "message", actor: "poppy", thread: t.id, text: "Thank you." });
  assert.equal(d.messages.filter((m) => m.thread === t.id && !m.system && !m.shift).length, 2);
  d = book(d, s);
  assert.equal(bookedCount(d, s), 1);
  assert.equal(d.shifts[0].status, "filled");
  assert.throws(() => book(d, s), /filled or closed/);
  assert.equal(bookedCount(d, s), 1);
  // The talent is told; the venue made the booking, so it isn't.
  assert.ok(d.notices.some((n) => n.to === "poppy" && n.title === "You're booked at Spruce"));
  assert.ok(!d.notices.some((n) => n.to === "spruce" && /booked/i.test(n.title)));
  // Booking updates land in the same conversation.
  assert.ok(d.messages.some((m) => m.thread === t.id && m.system && /Booked/.test(m.text)));
});
test("a booking request to several people: everyone can say yes, the venue chooses", () => {
  let d = post(seed(), { to: ["poppy", "theo"] });
  const s = d.shifts[0].id;
  assert.equal(d.shifts[0].mode, "request");
  assert.equal(d.responses.filter((r) => r.shift === s && r.status === "invited").length, 2);
  // The request arrives as a card in each person's conversation.
  for (const who of ["poppy", "theo"]) {
    const t = threadBetween(d, "spruce", who);
    assert.ok(d.messages.some((m) => m.thread === t.id && m.shift === s && m.from === "spruce"));
  }
  // Saying yes never books on its own.
  d = respond(d, s);
  d = respond(d, s, "theo");
  assert.equal(bookedCount(d, s), 0);
  d = book(d, s, "theo");
  assert.equal(d.responses.find((r) => r.shift === s && r.talent === "poppy").status, "not-selected");
  assert.throws(() => book(d, s, "poppy"), /filled or closed/);
});
test("even a request to one person is booked by the venue, never by the talent", () => {
  let d = post(seed(), { to: ["poppy"] });
  const s = d.shifts[0].id;
  d = respond(d, s);
  assert.equal(bookedCount(d, s), 0);
  assert.throws(
    () => transition(d, { type: "book", actor: "poppy", shift: s, talent: "poppy" }),
    /no longer available to book/,
  );
  d = book(d, s);
  assert.equal(bookedCount(d, s), 1);
});
test("a request can go to someone outside the position; a job post can't be answered from outside it", () => {
  let d = post(seed(), { to: ["ines"] });
  d = respond(d, d.shifts[0].id, "ines");
  assert.equal(d.responses.at(-1).status, "can-cover");
  d = post(seed());
  assert.throws(() => respond(d, d.shifts[0].id, "ines"), /selected roles/);
  // A request can't be answered by someone it wasn't sent to.
  d = post(seed(), { to: ["poppy"] });
  assert.throws(() => respond(d, d.shifts[0].id, "theo"), /selected roles/);
});
test("declining tells the venue; the request can still be sent to someone else", () => {
  let d = post(seed(), { to: ["poppy"] });
  const s = d.shifts[0].id;
  d = transition(d, { type: "decline", actor: "poppy", shift: s });
  assert.ok(d.notices.some((n) => n.to === "spruce" && /declined/.test(n.title)));
  d = transition(d, { type: "invite", actor: "spruce", shift: s, talents: ["theo"] });
  d = respond(d, s, "theo");
  d = book(d, s, "theo");
  assert.equal(bookedCount(d, s), 1);
});
test("multi-day, two-person cover stays open until both are booked", () => {
  let d = post(seed(), { capacity: 2, count: 3 });
  const s = d.shifts[0].id;
  assert.equal(d.shifts[0].days.length, 3);
  d = respond(d, s);
  d = respond(d, s, "theo");
  d = book(d, s);
  assert.equal(d.shifts[0].status, "open");
  assert.equal(bookedCount(d, s), 1);
  d = book(d, s, "theo");
  assert.equal(d.shifts[0].status, "filled");
  assert.equal(bookedCount(d, s), 2);
});
test("a booking elsewhere lapses other waiting answers and blocks a late booking", () => {
  let d = post(seed());
  const a = d.shifts[0].id;
  d = respond(d, a);
  d = post(d, { to: ["poppy"] }, "harper");
  const b = d.shifts[0].id;
  d = respond(d, b);
  d = book(d, b, "poppy", "harper");
  assert.equal(d.responses.find((r) => r.shift === a && r.talent === "poppy").status, "lapsed");
  assert.ok(conflict(d, "poppy", d.shifts.find((s) => s.id === a).days));
  assert.throws(() => book(d, a), /no longer available/);
});
test("withdrawal wins before book; closing keeps confirmed places", () => {
  let d = post(seed(), { capacity: 2 });
  const s = d.shifts[0].id;
  d = respond(d, s);
  d = transition(d, { type: "withdraw", actor: "poppy", shift: s });
  assert.throws(() => book(d, s), /no longer available/);
  d = respond(d, s);
  d = book(d, s);
  d = transition(d, { type: "close", actor: "spruce", shift: s, reason: "Plans changed" });
  assert.equal(bookedCount(d, s), 1);
  assert.equal(d.bookings[0].cancelled, false);
});
test("cancel keeps history, tells the other side, and frees both calendars", () => {
  let d = post(seed());
  const s = d.shifts[0].id;
  d = respond(d, s);
  d = book(d, s);
  const b = d.bookings[0].id;
  assert.equal(isFree(d, "poppy", d.shifts[0].days), false);
  d = transition(d, { type: "cancel", actor: "poppy", booking: b, reason: "Illness" });
  assert.equal(d.bookings[0].cancelled, true);
  assert.equal(d.bookings[0].log["2026-10-08"].status, "cancelled");
  // The place is needed again, so the shift reopens.
  assert.equal(d.shifts[0].status, "open");
  assert.ok(d.notices.some((n) => n.to === "spruce" && n.title === "Poppy Bertram cancelled"));
  assert.ok(!d.notices.some((n) => n.to === "poppy" && /cancelled/.test(n.title)));
  // Her own availability is untouched, so she shows as free again.
  assert.equal(isFree(d, "poppy", d.shifts[0].days), true);
  // The cancellation is posted in the conversation.
  const t = threadBetween(d, "spruce", "poppy");
  assert.ok(d.messages.some((m) => m.thread === t.id && /cancelled/.test(m.text)));
});
test("cancelling one day of a multi-day booking keeps the rest and reopens that day", () => {
  let d = post(seed(), { count: 3 });
  const s = d.shifts[0].id;
  const [thu, fri, sat] = d.shifts[0].days.map((x) => x.date);
  d = respond(d, s);
  d = book(d, s);
  const id = d.bookings[0].id;
  d = transition(d, { type: "cancel", actor: "spruce", booking: id, days: [fri], reason: "Plans changed" });
  const b = d.bookings[0];
  assert.equal(b.cancelled, false);
  assert.deepEqual(activeDays(b), [thu, sat]);
  assert.deepEqual(openDates(d, d.shifts[0]), [fri]);
  assert.equal(d.shifts[0].status, "open");
  assert.equal(d.responses.find((r) => r.talent === "poppy").status, "booked");
  assert.equal(venueSummary(d, d.shifts[0]).text, "Poppy cancelled · Fri 9 needs 1 person");
  // A day that has started can't be cancelled.
  d = transition(d, { type: "advance", until: d.shifts[0].days[0].from });
  assert.throws(
    () => transition(d, { type: "cancel", actor: "poppy", booking: id, days: [thu], reason: "Illness" }),
    /haven’t started/,
  );
});
test("sending a job post to more people reuses its places and answers", () => {
  let d = post(seed());
  const s = d.shifts[0].id;
  d = respond(d, s);
  d = transition(d, { type: "invite", actor: "spruce", shift: s, talents: ["poppy", "theo"] });
  assert.equal(d.responses.filter((r) => r.shift === s && r.talent === "poppy").length, 1);
  assert.equal(d.responses.find((r) => r.shift === s && r.talent === "poppy").status, "can-cover");
  assert.equal(d.responses.find((r) => r.shift === s && r.talent === "theo").status, "invited");
  d = respond(d, s, "theo");
  d = book(d, s, "theo");
  assert.equal(bookedCount(d, s), 1);
  assert.equal(d.responses.find((r) => r.shift === s && r.talent === "poppy").status, "not-selected");
});
test("expiry blocks stale links and failure cannot produce a false success", () => {
  let d = post(seed());
  const s = d.shifts[0].id;
  d = respond(d, s);
  let blocked = transition(d, { type: "settings", offline: true });
  assert.throws(() => book(blocked, s), /offline/);
  assert.equal(bookedCount(blocked, s), 0);
  blocked = transition(d, { type: "settings", failNext: true });
  assert.throws(() => book(blocked, s), /could not be saved/);
  assert.equal(bookedCount(blocked, s), 0);
  d = transition(d, { type: "advance", until: d.shifts[0].days[0].from });
  assert.equal(d.shifts[0].status, "expired");
  assert.throws(() => book(d, s), /started/);
});
test("timezones, overnight, DST and all-day availability are explicit", () => {
  assert.equal(londonInstant("2026-10-02", "17:00"), "2026-10-02T16:00:00.000Z");
  assert.equal(londonInstant("2026-11-02", "17:00"), "2026-11-02T17:00:00.000Z");
  const days = makeDays(draft({ start: "22:00", end: "02:00" }));
  assert.equal(days[0].to, "2026-10-09T01:00:00.000Z");
  assert.throws(() => londonInstant("2026-10-25", "01:30"), /occurs twice/);
  assert.throws(() => londonInstant("2026-03-29", "01:30"), /does not exist/);
  const d = transition(seed(), {
    type: "availability",
    actor: "poppy",
    dates: ["2026-10-08"],
    kind: "free",
    start: "00:00",
    end: "00:00",
  });
  assert.equal(isFree(d, "poppy", makeDays(draft())), true);
});
test("up to 14 dates, any within the window, with the same hours", () => {
  assert.equal(makeDays(draft({ count: 14 })).length, 14);
  assert.throws(() => makeDays(draft({ count: 15 })), /1 and 14/);
  const days = makeDays({ dates: ["2026-10-12", "2026-10-05", "2026-10-07"], start: "17:00", end: "23:00" });
  assert.deepEqual(days.map((x) => x.date), ["2026-10-05", "2026-10-07", "2026-10-12"]);
  const d = post(seed(), { dates: ["2026-10-05", "2026-10-07"] });
  assert.equal(d.shifts[0].days.length, 2);
  assert.throws(() => makeDays({ dates: [], start: "17:00", end: "23:00" }), /1 and 14 dates/);
});
test("joining with saved availability is enough to start", () => {
  let d = seed();
  const m = { ...d.members.find((m) => m.id === "poppy"), id: "new", name: "Alex", phone: "+44 7700 900299" };
  d = transition(d, { type: "join", member: m, availableTomorrow: true });
  assert.equal(d.members.at(-1).approved, true);
  assert.equal(d.availability.some((a) => a.member === "new"), true);
  d = respond(d, "spruce-friday", "new");
  assert.equal(d.responses.at(-1).status, "can-cover");
});
test("joining retains chosen first-week dates and day hours, with an explicit skip", () => {
  const d = seed();
  const m = { ...d.members.find((m) => m.id === "poppy"), id: "new-days", phone: "+44 7700 900298" };
  const joined = transition(d, {
    type: "join",
    member: m,
    availabilityDates: ["2026-10-02", "2026-10-04"],
    availabilityPeriod: "day",
  });
  assert.deepEqual(
    joined.availability.filter((a) => a.member === m.id).map((a) => [a.date, a.start, a.end]),
    [
      ["2026-10-02", "09:00", "17:00"],
      ["2026-10-04", "09:00", "17:00"],
    ],
  );
  const skipped = transition(d, { type: "join", member: m, availabilityDates: [] });
  assert.equal(skipped.availability.filter((a) => a.member === m.id).length, 0);
  assert.throws(
    () => transition(d, { type: "join", member: m, availabilityDates: ["2026-10-08"] }),
    /next seven days/,
  );
});
test("reminders deduplicate, and a finished day waits for the venue before it confirms itself", () => {
  let d = post(seed());
  const s = d.shifts[0].id;
  d = respond(d, s);
  d = book(d, s);
  d = transition(d, { type: "advance", until: "2026-10-07T17:00:00.000Z" });
  assert.equal(d.notices.filter((n) => n.to === "poppy" && n.title === "Your next service is coming up").length, 1);
  d = transition(d, { type: "advance", until: "2026-10-07T18:00:00.000Z" });
  assert.equal(d.notices.filter((n) => n.title === "Your next service is coming up").length, 1);
  const end = d.shifts.find((x) => x.id === s).days.at(-1).to;
  d = transition(d, { type: "advance", until: end });
  assert.deepEqual(d.bookings[0].log, {});
  assert.equal(dayRecords(d, d.bookings[0])[0].status, "to-confirm");
  // 48 hours later it counts as worked at the scheduled hours.
  d = transition(d, { type: "advance", until: after(end, 48) });
  const log = d.bookings[0].log["2026-10-08"];
  assert.equal(log.status, "worked");
  assert.equal(log.auto, true);
  assert.equal(log.hours, 6);
});
test("the venue confirms each day's actual hours, or records a no-show", () => {
  let d = post(seed(), { count: 2 });
  const s = d.shifts[0].id;
  const [thu, fri] = d.shifts[0].days.map((x) => x.date);
  d = respond(d, s);
  d = book(d, s);
  const id = d.bookings[0].id;
  assert.throws(
    () => transition(d, { type: "confirm-day", actor: "spruce", booking: id, date: thu, status: "worked" }),
    /once it has finished/,
  );
  d = transition(d, { type: "advance", until: d.shifts[0].days[1].to });
  assert.throws(
    () => transition(d, { type: "confirm-day", actor: "poppy", booking: id, date: thu, status: "worked" }),
    /Only the venue/,
  );
  // Thursday ran late; on Friday she didn't come.
  d = transition(d, { type: "confirm-day", actor: "spruce", booking: id, date: thu, status: "worked", start: "17:00", end: "00:30" });
  d = transition(d, { type: "confirm-day", actor: "spruce", booking: id, date: fri, status: "no-show" });
  const [a, b] = dayRecords(d, d.bookings[0]);
  assert.equal(a.status, "worked");
  assert.equal(a.hours, 7.5);
  assert.equal(a.pay, 135);
  assert.equal(b.status, "no-show");
  assert.throws(
    () => transition(d, { type: "confirm-day", actor: "spruce", booking: id, date: thu, status: "no-show" }),
    /already been recorded/,
  );
  assert.ok(d.notices.some((n) => n.to === "poppy" && /confirmed 7.5 hours/.test(n.title)));
});
test("partial cover: talent says yes to some days, venue books those days, the rest stay open", () => {
  let d = post(seed(), { count: 3 });
  const s = d.shifts[0].id;
  const [mon, tue, wed] = d.shifts[0].days.map((x) => x.date);
  d = transition(d, { type: "respond", actor: "poppy", shift: s, days: [mon, tue] });
  d = transition(d, { type: "respond", actor: "theo", shift: s });
  assert.deepEqual(d.responses.find((r) => r.talent === "poppy" && r.shift === s).days, [mon, tue]);
  assert.equal(d.responses.find((r) => r.talent === "theo" && r.shift === s).days.length, 3);
  d = book(d, s);
  assert.deepEqual(d.bookings[0].days, [mon, tue]);
  assert.equal(d.shifts[0].status, "open");
  assert.deepEqual(openDates(d, d.shifts[0]), [wed]);
  // Theo said yes to every day; booking him now only takes the day still open.
  d = book(d, s, "theo");
  assert.deepEqual(d.bookings[0].days, [wed]);
  assert.equal(d.shifts[0].status, "filled");
});
test("an answer whose days are all filled is told so; others stay waiting", () => {
  let d = post(seed(), { count: 2 });
  const s = d.shifts[0].id;
  const [first, second] = d.shifts[0].days.map((x) => x.date);
  d = transition(d, { type: "respond", actor: "poppy", shift: s, days: [first] });
  d = transition(d, { type: "respond", actor: "theo", shift: s, days: [first, second] });
  d = book(d, s, "theo");
  assert.equal(d.shifts[0].status, "filled");
  assert.equal(d.responses.find((r) => r.talent === "poppy" && r.shift === s).status, "not-selected");
});
test("saying yes to days already filled or not in the shift is refused", () => {
  let d = post(seed(), { count: 2 });
  const s = d.shifts[0].id;
  const [first] = d.shifts[0].days.map((x) => x.date);
  assert.throws(
    () => transition(d, { type: "respond", actor: "poppy", shift: s, days: ["2026-12-25"] }),
    /dates from this shift/,
  );
  d = transition(d, { type: "respond", actor: "theo", shift: s, days: [first] });
  d = book(d, s, "theo");
  assert.throws(
    () => transition(d, { type: "respond", actor: "poppy", shift: s, days: [first] }),
    /no longer available/,
  );
});
test("a booking request can be answered with some days, which waits for the venue", () => {
  let d = post(seed(), { count: 3, to: ["poppy"] });
  const s = d.shifts[0].id;
  const [mon] = d.shifts[0].days.map((x) => x.date);
  d = transition(d, { type: "respond", actor: "poppy", shift: s, days: [mon] });
  assert.equal(d.responses.find((r) => r.talent === "poppy" && r.shift === s).status, "can-cover");
  assert.equal(bookedCount(d, s), 0);
  d = book(d, s);
  assert.deepEqual(d.bookings[0].days, [mon]);
});
test("a booking elsewhere trims clashing days from other answers instead of dropping them", () => {
  let d = post(seed(), { count: 3, date: "2026-10-12" });
  const multi = d.shifts[0].id;
  const [, tue] = d.shifts[0].days.map((x) => x.date);
  d = transition(d, { type: "respond", actor: "poppy", shift: multi });
  d = post(d, { date: tue, to: ["poppy"] }, "harper");
  const other = d.shifts[0].id;
  d = respond(d, other);
  d = book(d, other, "poppy", "harper");
  const r = d.responses.find((r) => r.shift === multi && r.talent === "poppy");
  assert.equal(r.status, "can-cover");
  assert.equal(r.days.length, 2);
  assert.ok(!r.days.includes(tue));
});
test("same person for all days: partial yeses and partial bookings are refused", () => {
  let d = post(seed(), { count: 3, together: true });
  const s = d.shifts[0].id;
  assert.equal(d.shifts[0].together, true);
  const [thu] = d.shifts[0].days.map((x) => x.date);
  assert.throws(
    () => transition(d, { type: "respond", actor: "poppy", shift: s, days: [thu] }),
    /same person for all days/,
  );
  d = respond(d, s);
  assert.throws(
    () => transition(d, { type: "book", actor: "spruce", shift: s, talent: "poppy", days: [thu] }),
    /same person for all days/,
  );
  d = book(d, s);
  assert.equal(d.bookings[0].days.length, 3);
  // A single-day shift never carries the flag.
  assert.equal(post(seed(), { together: true }).shifts[0].together, false);
});
test("mix and match: the venue books chosen days, and can add more of the same person's days later", () => {
  let d = post(seed(), { count: 3 });
  const s = d.shifts[0].id;
  const [thu, fri, sat] = d.shifts[0].days.map((x) => x.date);
  d = transition(d, { type: "respond", actor: "poppy", shift: s });
  d = transition(d, { type: "respond", actor: "theo", shift: s, days: [thu] });
  d = transition(d, { type: "book", actor: "spruce", shift: s, talent: "theo", days: [thu] });
  d = transition(d, { type: "book", actor: "spruce", shift: s, talent: "poppy", days: [fri] });
  assert.deepEqual(openDates(d, d.shifts[0]), [sat]);
  assert.throws(
    () => transition(d, { type: "book", actor: "spruce", shift: s, talent: "poppy", days: [thu] }),
    /still open/,
  );
  // Adding Saturday extends Poppy's booking instead of creating a second one.
  d = transition(d, { type: "book", actor: "spruce", shift: s, talent: "poppy", days: [sat] });
  const poppy = d.bookings.filter((b) => b.shift === s && b.talent === "poppy");
  assert.equal(poppy.length, 1);
  assert.deepEqual(poppy[0].days, [fri, sat]);
  assert.equal(d.shifts[0].status, "filled");
  assert.ok(d.notices.some((n) => n.to === "poppy" && /added/.test(n.title)));
});
test("busy days come from the talent's own Not free marks", () => {
  let d = post(seed(), { count: 2 });
  const s = d.shifts[0];
  d = transition(d, {
    type: "availability",
    actor: "poppy",
    dates: [s.days[1].date],
    kind: "not-free",
    start: "00:00",
    end: "00:00",
  });
  assert.deepEqual(busyDates(d, "poppy", d.shifts[0]), [s.days[1].date]);
});
test("Worked with you comes only from a day confirmed as worked", () => {
  let d = seed();
  // Seeded: Poppy worked a past Spruce service; Camille has no history with The Sea The Sea.
  assert.equal(workedWith(d, "spruce", "poppy"), true);
  assert.equal(workedWith(d, "sea", "camille"), false);
  d = post(d);
  const s = d.shifts[0].id;
  d = respond(d, s, "theo");
  d = book(d, s, "theo");
  // A future booking doesn't count yet, and neither does a no-show.
  assert.equal(workedWith(d, "spruce", "theo"), false);
  d = transition(d, { type: "advance", until: d.shifts[0].days[0].to });
  const id = d.bookings.find((b) => b.talent === "theo").id;
  d = transition(d, { type: "confirm-day", actor: "spruce", booking: id, date: "2026-10-08", status: "no-show" });
  assert.equal(workedWith(d, "spruce", "theo"), false);
});
test("a cancellation reopens a filled multi-day, two-person shift for the days it affects", () => {
  let d = post(seed(), { count: 2, capacity: 2 });
  const s = d.shifts[0].id;
  d = respond(d, s);
  d = respond(d, s, "theo");
  d = book(d, s);
  d = book(d, s, "theo");
  assert.equal(d.shifts[0].status, "filled");
  const theo = d.bookings.find((b) => b.talent === "theo").id;
  d = transition(d, { type: "cancel", actor: "theo", booking: theo, reason: "Illness" });
  assert.equal(d.shifts[0].status, "open");
  assert.equal(openDates(d, d.shifts[0]).length, 2);
  assert.match(venueSummary(d, d.shifts[0]).text, /^Theo cancelled · .* each need 1 more person$/);
});
test("people told it was filled can say yes again once it reopens", () => {
  let d = post(seed());
  const s = d.shifts[0].id;
  d = respond(d, s);
  d = respond(d, s, "theo");
  d = book(d, s, "theo");
  assert.equal(d.responses.find((r) => r.talent === "poppy" && r.shift === s).status, "not-selected");
  d = transition(d, { type: "cancel", actor: "spruce", booking: d.bookings[0].id, reason: "Plans changed" });
  d = respond(d, s);
  assert.equal(d.responses.find((r) => r.talent === "poppy" && r.shift === s).status, "can-cover");
});
test("a multi-day shift stays open for later days after the first day starts", () => {
  let d = post(seed(), { count: 2 });
  const s = d.shifts[0];
  d = transition(d, { type: "advance", until: s.days[0].from });
  assert.equal(d.shifts[0].status, "open");
  assert.deepEqual(openDates(d, d.shifts[0]), [s.days[1].date]);
  d = transition(d, { type: "advance", until: s.days[1].from });
  assert.equal(d.shifts[0].status, "expired");
});
test("talent booked for one day can still say yes to the other days", () => {
  let d = post(seed(), { count: 2 });
  const s = d.shifts[0].id;
  const [thu, fri] = d.shifts[0].days.map((x) => x.date);
  d = transition(d, { type: "respond", actor: "poppy", shift: s, days: [thu] });
  d = book(d, s);
  assert.deepEqual(offerableDates(d, "poppy", d.shifts[0]), [fri]);
  d = transition(d, { type: "respond", actor: "poppy", shift: s, days: [fri] });
  assert.ok(d.notices.some((n) => n.to === "spruce" && /can also do/.test(n.title)));
  d = book(d, s);
  assert.deepEqual(d.bookings.find((b) => b.talent === "poppy").days, [thu, fri]);
  assert.equal(d.shifts[0].status, "filled");
});
test("status talks in people per day, and never says no replies once someone is booked", () => {
  let d = post(seed(), { count: 2, capacity: 2 });
  const s = d.shifts[0].id;
  d = respond(d, s);
  d = book(d, s);
  const text = venueSummary(d, d.shifts[0]).text;
  assert.doesNotMatch(text, /no replies|days covered/);
  assert.match(text, /each need 1 more person/);
});
test("one shared position list: every onboarding position plus Sommelier and Maître d’, no duplicates", async () => {
  const { POSITIONS, TEAMS } = await import("../lib/catalogue.ts");
  const original = [
    "Demi CDP", "CDP", "Senior CDP", "Junior Sous", "Sous Chef", "Head Chef", "Executive Chef", "Pastry Chef",
    "Waiter", "Section Waiter", "Supervisor", "Restaurant Manager", "Bartender", "Host", "Mixologist",
  ];
  for (const p of original) assert.ok(POSITIONS.includes(p), p);
  assert.ok(POSITIONS.includes("Sommelier"));
  assert.ok(POSITIONS.includes("Maître d’"));
  assert.equal(new Set(POSITIONS).size, POSITIONS.length);
  assert.equal(POSITIONS.length, 17);
  assert.deepEqual(Object.keys(TEAMS), ["Kitchen", "Pastry", "Bar", "Sommelier", "Floor"]);
});
test("a venue sees everyone for a team, free people in the role first", () => {
  const d = seed();
  const days = daysFor({ dates: ["2026-10-06"], start: "17:00", end: "23:00" });
  const { free, unavailable, others } = rankTalent(d, "spruce", "Kitchen", "CDP", days);
  // Poppy marked Tue 6 not free; Theo never set availability.
  assert.deepEqual(free.map((m) => m.id), []);
  assert.deepEqual(unavailable.map((m) => m.id).sort(), ["poppy", "theo"]);
  // Everyone else is still listed, kitchen first.
  assert.ok(others.length === d.members.filter((m) => m.side === "talent").length - 2);
  assert.ok(["camille", "ethan"].includes(others[0].id));
  const wed = daysFor({ dates: ["2026-10-07"], start: "17:00", end: "23:00" });
  assert.deepEqual(rankTalent(d, "spruce", "Kitchen", undefined, wed).free.map((m) => m.id).sort(), ["camille", "ethan", "poppy"]);
});
test("one conversation per venue and talent, opened from either side", () => {
  let d = transition(seed(), { type: "open-thread", actor: "spruce", with: "theo" });
  d = transition(d, { type: "open-thread", actor: "theo", with: "spruce" });
  assert.equal(d.threads.filter((t) => t.venue === "spruce" && t.talent === "theo").length, 1);
  const t = threadBetween(d, "spruce", "theo");
  d = transition(d, { type: "message", actor: "theo", thread: t.id, text: "Hi! Happy to chat." });
  assert.throws(() => transition(d, { type: "message", actor: "harper", thread: t.id, text: "Hello" }), /private/);
  // A request sent later lands in the same conversation.
  d = post(d, { to: ["theo"] });
  assert.equal(d.threads.filter((x) => x.venue === "spruce" && x.talent === "theo").length, 1);
  assert.ok(d.messages.some((m) => m.thread === t.id && m.shift === d.shifts[0].id));
});
test("account: documents wait for Dyuknow to check; texts can be switched off; deletion is a request", () => {
  let d = seed();
  const noor = d.members.find((m) => m.id === "noor");
  assert.equal(accountOf(noor).docs["Allergen awareness"].status, "missing");
  d = transition(d, { type: "upload-doc", actor: "noor", doc: "Allergen awareness", file: "allergen.pdf" });
  assert.equal(accountOf(d.members.find((m) => m.id === "noor")).docs["Allergen awareness"].status, "review");
  assert.throws(() => transition(d, { type: "verify-doc", actor: "noor", member: "noor", doc: "Allergen awareness" }), /Only Dyuknow/);
  d = transition(d, { type: "verify-doc", actor: "dyuknow", member: "noor", doc: "Allergen awareness" });
  assert.ok(verifiedDocs(d.members.find((m) => m.id === "noor")).includes("Allergen awareness"));
  // Messages off: no text, but the message is still there.
  d = transition(d, { type: "account", actor: "theo", patch: { texts: { messages: false, reminders: true, replies: true } } });
  d = transition(d, { type: "open-thread", actor: "spruce", with: "theo" });
  const t = threadBetween(d, "spruce", "theo");
  const before = d.notices.length;
  d = transition(d, { type: "message", actor: "spruce", thread: t.id, text: "Free Friday?" });
  assert.equal(d.notices.length, before);
  assert.ok(d.messages.some((m) => m.thread === t.id && m.text === "Free Friday?"));
  assert.throws(() => transition(d, { type: "account", actor: "theo", patch: { payout: { holder: "Theo", sortCode: "123456", last4: "1234" } } }), /sort code/);
  d = transition(d, { type: "delete-account", actor: "theo" });
  assert.ok(accountOf(d.members.find((m) => m.id === "theo")).deletion);
  d = transition(d, { type: "delete-account", actor: "theo", cancel: true });
  assert.equal(accountOf(d.members.find((m) => m.id === "theo")).deletion, undefined);
});
test("a venue can't send a second ask to someone already answering one of its asks for those hours", () => {
  // Poppy said yes to Spruce's Friday job post.
  let d = respond(seed(), "spruce-friday");
  assert.throws(
    () => post(d, { date: "2026-10-02", to: ["poppy"] }),
    /already said yes to your job/,
  );
  // Nothing was created.
  assert.equal(d.shifts.length, seed().shifts.length);
  // Other hours are fine, and so are other people.
  d = post(d, { date: "2026-10-09", to: ["poppy"] });
  d = post(d, { date: "2026-10-02", to: ["theo"] });
  // Once booked, the venue can't ask again for those hours either.
  d = book(d, "spruce-friday");
  assert.throws(() => post(d, { date: "2026-10-02", to: ["poppy"], count: 1 }), /already booked with you/);
});
test("booking someone clears their clashing answer with the same venue without calling it elsewhere", () => {
  // Two Spruce job posts at the same time; Poppy says yes to both.
  let d = post(seed(), { date: "2026-10-12" });
  const a = d.shifts[0].id;
  d = post(d, { date: "2026-10-12", roles: ["Senior CDP"] });
  const b = d.shifts[0].id;
  d = respond(d, a);
  d = respond(d, b);
  d = book(d, a);
  assert.equal(d.responses.find((r) => r.shift === b && r.talent === "poppy").status, "lapsed");
  assert.ok(d.messages.some((m) => /booked on another Spruce shift/.test(m.text)));
  assert.ok(!d.messages.some((m) => /booked elsewhere/.test(m.text)));
  assert.ok(!d.notices.some((n) => n.to === "spruce" && /no longer available/.test(n.title)));
});
