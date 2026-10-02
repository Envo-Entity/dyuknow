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
  assert.ok(
    d.notices.some((n) => n.to === "spruce" && n.title === "Booking confirmed"),
  );
  assert.ok(
    d.notices.some((n) => n.to === "poppy" && n.title === "Booking confirmed"),
  );
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
  assert.throws(() => book(d, a), /booked elsewhere/);
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
  assert.equal(d.shifts[0].status, "filled");
  assert.ok(
    d.notices.some((n) => n.to === "spruce" && n.title === "Booking cancelled"),
  );
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
