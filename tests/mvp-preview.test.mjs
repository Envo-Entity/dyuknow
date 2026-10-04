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
  mode: "post",
  invitees: [],
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
test("post → response → contextual chat → book produces one shared booking", () => {
  let d = post(seed());
  const s = d.shifts[0].id;
  assert.ok(
    d.notices.some((n) => n.to === "poppy" && n.target === `shift/${s}`),
  );
  d = respond(d, s);
  const r = d.responses.find((r) => r.shift === s && r.talent === "poppy");
  assert.equal(d.bookings.length, 1);
  assert.equal(r.status, "can-cover");
  assert.equal(r.chat, false);
  assert.throws(
    () =>
      transition(d, {
        type: "message",
        actor: "poppy",
        response: r.id,
        text: "Hello",
      }),
    /venue will open/,
  );
  d = transition(d, { type: "open-chat", actor: "spruce", response: r.id });
  d = transition(d, {
    type: "message",
    actor: "spruce",
    response: r.id,
    text: "Meal included.",
  });
  d = transition(d, {
    type: "message",
    actor: "poppy",
    response: r.id,
    text: "Thank you.",
  });
  assert.equal(d.messages.filter((m) => m.response === r.id).length, 2);
  d = book(d, s);
  assert.equal(bookedCount(d, s), 1);
  assert.equal(d.shifts[0].status, "filled");
  assert.throws(() => book(d, s), /filled or closed/);
  assert.equal(bookedCount(d, s), 1);
  // Only the side that didn't say the second yes is told.
  assert.ok(
    d.notices.some(
      (n) => n.to === "poppy" && n.title === "You're booked at Spruce",
    ),
  );
  assert.ok(
    !d.notices.some((n) => n.to === "spruce" && /booked/i.test(n.title)),
  );
  assert.ok(!d.notices.some((n) => n.to === "poppy" && /Response sent/.test(n.title)));
});
test("first invite acceptance wins and another invite cannot book a filled shift", () => {
  let d = post(seed(), { mode: "invite", invitees: ["poppy", "theo"] });
  const s = d.shifts[0].id;
  d = transition(d, { type: "accept", actor: "poppy", shift: s });
  assert.equal(
    d.responses.find((r) => r.shift === s && r.talent === "theo").status,
    "not-selected",
  );
  assert.throws(
    () => transition(d, { type: "accept", actor: "theo", shift: s }),
    /filled or closed/,
  );
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
test("overlapping booking lapses pending responses and blocks late acceptance", () => {
  let d = post(seed());
  const a = d.shifts[0].id;
  d = respond(d, a);
  d = post(d, { mode: "invite", invitees: ["poppy"] }, "harper");
  const b = d.shifts[0].id;
  d = transition(d, { type: "accept", actor: "poppy", shift: b });
  assert.equal(
    d.responses.find((r) => r.shift === a && r.talent === "poppy").status,
    "lapsed",
  );
  assert.ok(conflict(d, "poppy", d.shifts.find((s) => s.id === a).days));
  assert.throws(() => book(d, a), /no longer available/);
});
test("withdrawal wins before book; closure preserves confirmed places", () => {
  let d = post(seed(), { capacity: 2 });
  const s = d.shifts[0].id;
  d = respond(d, s);
  d = transition(d, { type: "withdraw", actor: "poppy", shift: s });
  assert.throws(() => book(d, s), /no longer available/);
  d = respond(d, s);
  d = book(d, s);
  d = transition(d, {
    type: "close",
    actor: "spruce",
    shift: s,
    reason: "Plans changed",
  });
  assert.equal(bookedCount(d, s), 1);
  assert.equal(d.bookings[0].cancelled, false);
});
test("cancel retains history, notifies both sides, and does not silently republish availability", () => {
  let d = post(seed());
  const s = d.shifts[0].id;
  d = respond(d, s);
  d = book(d, s);
  const b = d.bookings[0].id;
  d = transition(d, {
    type: "cancel",
    actor: "poppy",
    booking: b,
    reason: "Illness",
  });
  assert.equal(d.bookings[0].cancelled, true);
  // The place is needed again, so the shift reopens.
  assert.equal(d.shifts[0].status, "open");
  assert.ok(
    d.notices.some((n) => n.to === "spruce" && n.title === "Poppy Bertram cancelled"),
  );
  assert.ok(!d.notices.some((n) => n.to === "poppy" && /cancelled/.test(n.title)));
  assert.equal(isFree(d, "poppy", d.shifts[0].days), false);
  assert.equal(
    d.availability.some((a) => a.member === "poppy" && a.date === "2026-10-09"),
    true,
  );
});
test("edit and resend closes old interest, copies terms into a new shift", () => {
  let d = post(seed());
  const old = d.shifts[0].id;
  d = respond(d, old);
  d = post(d, { editing: old, rate: 24 });
  assert.notEqual(d.shifts[0].id, old);
  assert.equal(d.shifts[0].rate, 24);
  assert.equal(d.shifts.find((s) => s.id === old).status, "closed");
  assert.equal(d.responses.find((r) => r.shift === old).status, "not-selected");
});
test("invites added to a posted shift reuse its capacity and candidate records", () => {
  let d = post(seed());
  const s = d.shifts[0].id;
  d = respond(d, s);
  d = transition(d, {
    type: "invite",
    actor: "spruce",
    shift: s,
    talents: ["poppy", "theo"],
  });
  assert.equal(
    d.responses.filter((r) => r.shift === s && r.talent === "poppy").length,
    1,
  );
  assert.equal(
    d.responses.find((r) => r.shift === s && r.talent === "poppy").status,
    "can-cover",
  );
  d = transition(d, { type: "accept", actor: "theo", shift: s });
  assert.equal(bookedCount(d, s), 1);
  assert.equal(
    d.responses.find((r) => r.shift === s && r.talent === "poppy").status,
    "not-selected",
  );
});
test("no supply and same-day no reply alert owner exactly once", () => {
  let d = post(seed(), { family: "Sommelier", roles: ["Sommelier"] });
  assert.equal(d.shifts[0].ownerAlerted, true);
  assert.ok(
    d.notices.some(
      (n) => n.to === "owner" && n.title === "No members for this shift",
    ),
  );
  d = post(seed(), { date: "2026-10-01" });
  const s = d.shifts[0].id;
  d = transition(d, { type: "advance", until: "2026-10-01T09:30:00.000Z" });
  assert.equal(d.shifts[0].ownerAlerted, true);
  const count = d.notices.filter(
    (n) => n.to === "owner" && n.target === `shift/${s}`,
  ).length;
  d = transition(d, { type: "advance", until: "2026-10-01T10:00:00.000Z" });
  assert.equal(
    d.notices.filter((n) => n.to === "owner" && n.target === `shift/${s}`)
      .length,
    count,
  );
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
  assert.equal(
    londonInstant("2026-10-02", "17:00"),
    "2026-10-02T16:00:00.000Z",
  );
  assert.equal(
    londonInstant("2026-11-02", "17:00"),
    "2026-11-02T17:00:00.000Z",
  );
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
  assert.throws(() => makeDays(draft({ count: 8 })), /1 and 7/);
});
test("joining, saved availability and approval form a usable lifecycle", () => {
  let d = seed();
  const m = {
    ...d.members.find((m) => m.id === "poppy"),
    id: "new",
    name: "Alex",
    phone: "+44 7700 900299",
    approved: false,
  };
  d = transition(d, { type: "join", member: m, availableTomorrow: true });
  assert.equal(d.members.at(-1).approved, false);
  assert.equal(
    d.availability.some((a) => a.member === "new"),
    true,
  );
  assert.throws(() => respond(d, "spruce-friday", "new"), /approval/);
  d = transition(d, { type: "approve", actor: "owner", member: "new" });
  d = respond(d, "spruce-friday", "new");
  assert.equal(d.responses.at(-1).status, "can-cover");
});
test("reminders deduplicate, and past work has no invented attendance outcome", () => {
  let d = post(seed());
  const s = d.shifts[0].id;
  d = respond(d, s);
  d = book(d, s);
  d = transition(d, { type: "advance", until: "2026-10-07T17:00:00.000Z" });
  const notices = d.notices.filter(
    (n) => n.to === "poppy" && n.title === "Your next service is coming up",
  );
  assert.equal(notices.length, 1);
  d = transition(d, { type: "advance", until: "2026-10-07T18:00:00.000Z" });
  assert.equal(
    d.notices.filter((n) => n.title === "Your next service is coming up")
      .length,
    1,
  );
  d = transition(d, {
    type: "advance",
    until: d.shifts.find((shift) => shift.id === s).days.at(-1).to,
  });
  assert.deepEqual(d.bookings[0].outcomes, {});
});

test("joining retains chosen first-week dates and day hours, with an explicit skip", () => {
  const d = seed();
  const m = {
    ...d.members.find((m) => m.id === "poppy"),
    id: "new-days",
    phone: "+44 7700 900298",
  };
  const joined = transition(d, {
    type: "join",
    member: m,
    availabilityDates: ["2026-10-02", "2026-10-04"],
    availabilityPeriod: "day",
  });
  assert.deepEqual(
    joined.availability
      .filter((a) => a.member === m.id)
      .map((a) => [a.date, a.start, a.end]),
    [
      ["2026-10-02", "09:00", "17:00"],
      ["2026-10-04", "09:00", "17:00"],
    ],
  );
  const skipped = transition(d, {
    type: "join",
    member: m,
    availabilityDates: [],
  });
  assert.equal(skipped.availability.filter((a) => a.member === m.id).length, 0);
  assert.throws(
    () =>
      transition(d, {
        type: "join",
        member: m,
        availabilityDates: ["2026-10-08"],
      }),
    /next seven days/,
  );
});

test("partial cover: talent offers some days, venue books those days, the rest stay open", () => {
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
  // Theo offered every day; booking him now only takes the day still open.
  d = book(d, s, "theo");
  assert.deepEqual(d.bookings[0].days, [wed]);
  assert.equal(d.shifts[0].status, "filled");
});
test("a response whose days are all covered is told it's filled; others stay waiting", () => {
  let d = post(seed(), { count: 2 });
  const s = d.shifts[0].id;
  const [first, second] = d.shifts[0].days.map((x) => x.date);
  d = transition(d, { type: "respond", actor: "poppy", shift: s, days: [first] });
  d = transition(d, { type: "respond", actor: "theo", shift: s, days: [first, second] });
  d = book(d, s, "theo");
  assert.equal(d.shifts[0].status, "filled");
  assert.equal(d.responses.find((r) => r.talent === "poppy" && r.shift === s).status, "not-selected");
});
test("responding to days already covered or not in the shift is refused", () => {
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
test("an invite can be answered with some days, which waits for the venue", () => {
  let d = post(seed(), { count: 3, mode: "invite", invitees: ["poppy"] });
  const s = d.shifts[0].id;
  const [mon] = d.shifts[0].days.map((x) => x.date);
  d = transition(d, { type: "respond", actor: "poppy", shift: s, days: [mon] });
  const r = d.responses.find((r) => r.talent === "poppy" && r.shift === s);
  assert.equal(r.status, "can-cover");
  assert.equal(bookedCount(d, s), 0);
  assert.throws(() => transition(d, { type: "accept", actor: "poppy", shift: s }), /no longer available/);
  d = book(d, s);
  assert.deepEqual(d.bookings[0].days, [mon]);
});
test("a booking elsewhere trims clashing days from other responses instead of dropping them", () => {
  let d = post(seed(), { count: 3, date: "2026-10-12" });
  const multi = d.shifts[0].id;
  const [, tue] = d.shifts[0].days.map((x) => x.date);
  d = transition(d, { type: "respond", actor: "poppy", shift: multi });
  d = post(d, { date: tue, mode: "invite", invitees: ["poppy"] }, "harper");
  d = transition(d, { type: "accept", actor: "poppy", shift: d.shifts[0].id });
  const r = d.responses.find((r) => r.shift === multi && r.talent === "poppy");
  assert.equal(r.status, "can-cover");
  assert.equal(r.days.length, 2);
  assert.ok(!r.days.includes(tue));
});
test("one person for all days: partial offers and partial bookings are refused", () => {
  let d = post(seed(), { count: 3, together: true });
  const s = d.shifts[0].id;
  assert.equal(d.shifts[0].together, true);
  const [thu] = d.shifts[0].days.map((x) => x.date);
  assert.throws(
    () => transition(d, { type: "respond", actor: "poppy", shift: s, days: [thu] }),
    /Each person must cover every day/,
  );
  d = respond(d, s);
  assert.throws(
    () => transition(d, { type: "book", actor: "spruce", shift: s, talent: "poppy", days: [thu] }),
    /Each person must cover every day/,
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
  // Theo for Thursday only, Poppy for Friday only.
  d = transition(d, { type: "book", actor: "spruce", shift: s, talent: "theo", days: [thu] });
  d = transition(d, { type: "book", actor: "spruce", shift: s, talent: "poppy", days: [fri] });
  assert.deepEqual(openDates(d, d.shifts[0]), [sat]);
  assert.throws(
    () => transition(d, { type: "book", actor: "spruce", shift: s, talent: "poppy", days: [thu] }),
    /still open/,
  );
  // Adding Saturday extends Poppy's existing booking instead of creating a second one.
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
test("Worked with you comes only from a past, uncancelled booking the venue didn't flag", () => {
  let d = seed();
  // Seeded: Poppy worked a past Spruce service; Camille has no history with The Sea The Sea.
  assert.equal(workedWith(d, "spruce", "poppy"), true);
  assert.equal(workedWith(d, "sea", "camille"), false);
  // A future booking doesn't count yet.
  d = post(d);
  const s = d.shifts[0].id;
  d = respond(d, s, "theo");
  d = book(d, s, "theo");
  assert.equal(workedWith(d, "spruce", "theo"), false);
  // A venue-reported no-show removes it.
  d = transition(d, { type: "outcome", actor: "spruce", booking: "past-booking", value: "No-show" });
  assert.equal(workedWith(d, "spruce", "poppy"), false);
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
  // The venue can text everyone again, and Ethan-style newcomers or Theo can offer.
  d = transition(d, { type: "realert", actor: "spruce", shift: s });
  assert.ok(d.notices.some((n) => n.title === "Spruce still needs cover"));
});
test("people told it was filled can offer again once it reopens", () => {
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
test("talent booked for one day can still offer the other days", () => {
  let d = post(seed(), { count: 2 });
  const s = d.shifts[0].id;
  const [thu, fri] = d.shifts[0].days.map((x) => x.date);
  d = transition(d, { type: "respond", actor: "poppy", shift: s, days: [thu] });
  d = book(d, s);
  assert.deepEqual(offerableDates(d, "poppy", d.shifts[0]), [fri]);
  d = transition(d, { type: "respond", actor: "poppy", shift: s, days: [fri] });
  assert.ok(d.notices.some((n) => n.to === "spruce" && /can also cover/.test(n.title)));
  d = book(d, s);
  assert.deepEqual(d.bookings.find((b) => b.talent === "poppy").days, [thu, fri]);
  assert.equal(d.shifts[0].status, "filled");
});
test("any dates within the window, with the same hours", () => {
  const days = makeDays({ dates: ["2026-10-12", "2026-10-05", "2026-10-07"], start: "17:00", end: "23:00" });
  assert.deepEqual(days.map((x) => x.date), ["2026-10-05", "2026-10-07", "2026-10-12"]);
  let d = post(seed(), { dates: ["2026-10-05", "2026-10-07"] });
  assert.equal(d.shifts[0].days.length, 2);
  assert.throws(() => makeDays({ dates: [], start: "17:00", end: "23:00" }), /1 and 7 dates/);
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
test("a venue sees everyone vetted for a team, free people in the role first", async () => {
  const { rankTalent, offerDays } = await import("../lib/preview/model.ts");
  const d = seed();
  const days = offerDays({ family: "Kitchen", role: "CDP", dates: ["2026-10-06"], start: "17:00", end: "23:00" });
  const { free, unavailable, others } = rankTalent(d, "spruce", "Kitchen", "CDP", days);
  // Poppy marked Tue 6 not free; Theo never set availability.
  assert.deepEqual(free.map((m) => m.id), []);
  assert.deepEqual(unavailable.map((m) => m.id).sort(), ["poppy", "theo"]);
  // Everyone else is still listed, kitchen first.
  assert.ok(others.length === d.members.filter((m) => m.side === "talent").length - 2);
  assert.ok(["camille", "ethan"].includes(others[0].id));
  const wed = offerDays({ family: "Kitchen", role: "CDP", dates: ["2026-10-07"], start: "17:00", end: "23:00" });
  assert.deepEqual(rankTalent(d, "spruce", "Kitchen", undefined, wed).free.map((m) => m.id).sort(), ["camille", "ethan", "poppy"]);
});
test("direct message → booking card → changes → revised card → accept books once", async () => {
  const { threadBetween, currentOffer } = await import("../lib/preview/model.ts");
  // Anyone can be messaged, free or not.
  let d = transition(seed(), { type: "open-thread", actor: "spruce", with: "theo" });
  const t = threadBetween(d, "spruce", "theo");
  d = transition(d, { type: "message", actor: "theo", response: t.id, text: "Hi! Happy to chat." });
  const terms = { family: "Kitchen", role: "CDP", dates: ["2026-10-09", "2026-10-10"], start: "17:00", end: "23:00", rate: 15, note: "Chef whites" };
  assert.throws(() => transition(d, { type: "send-offer", actor: "theo", thread: t.id, offer: terms }), /Only the venue/);
  d = transition(d, { type: "send-offer", actor: "spruce", thread: t.id, offer: terms });
  const first = currentOffer(d, t.id);
  assert.ok(d.notices.some((n) => n.to === "theo" && n.target === `chat/${t.id}`));
  d = transition(d, { type: "answer-offer", actor: "theo", offer: first.id, answer: "changes", note: "£17/h please" });
  assert.equal(currentOffer(d, t.id).status, "changes");
  assert.throws(() => transition(d, { type: "answer-offer", actor: "theo", offer: first.id, answer: "accept" }), /already been answered/);
  d = transition(d, { type: "send-offer", actor: "spruce", thread: t.id, offer: { ...terms, rate: 17 } });
  const revised = currentOffer(d, t.id);
  assert.equal(d.offers.find((o) => o.id === first.id).status, "replaced");
  d = transition(d, { type: "answer-offer", actor: "theo", offer: revised.id, answer: "accept" });
  const b = d.bookings.find((b) => b.talent === "theo");
  assert.equal(currentOffer(d, t.id).booking, b.id);
  const s = d.shifts.find((s) => s.id === b.shift);
  assert.equal(s.rate, 17);
  assert.deepEqual(b.days, ["2026-10-09", "2026-10-10"]);
  assert.equal(s.together, true);
  assert.equal(s.status, "filled");
  // Booking updates land in the same conversation.
  assert.ok(d.messages.some((m) => m.response === t.id && m.system && /Booked/.test(m.text)));
  d = transition(d, { type: "cancel", actor: "theo", booking: b.id, reason: "Unwell" });
  assert.ok(d.messages.some((m) => m.response === t.id && /cancelled/.test(m.text)));
});
test("a booking card can't double-book, and declining tells the venue", async () => {
  const { threadBetween, currentOffer } = await import("../lib/preview/model.ts");
  let d = book(respond(seed(), "spruce-friday"), "spruce-friday");
  d = transition(d, { type: "open-thread", actor: "harper", with: "poppy" });
  const t = threadBetween(d, "harper", "poppy");
  d = transition(d, { type: "send-offer", actor: "harper", thread: t.id, offer: { family: "Kitchen", role: "CDP", dates: ["2026-10-02"], start: "18:00", end: "22:00", rate: 24, note: "" } });
  const o = currentOffer(d, t.id);
  assert.throws(() => transition(d, { type: "answer-offer", actor: "poppy", offer: o.id, answer: "accept" }), /booked elsewhere/);
  d = transition(d, { type: "answer-offer", actor: "poppy", offer: o.id, answer: "decline" });
  assert.ok(d.notices.some((n) => n.to === "harper" && /declined/.test(n.title)));
});
