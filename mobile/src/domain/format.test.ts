import test from "node:test";
import assert from "node:assert/strict";
import { daysPhrase, hoursLabel, hoursNumber, minutesToHours, money, people, sentTo, whenLine } from "./format.ts";
import { addResponse, addShift, world } from "./testData.ts";

const OCT = (d: number) => `2026-10-${String(d).padStart(2, "0")}`;

test("money: whole pounds bare, otherwise two decimals (§10.8)", () => {
  assert.equal(money(18), "£18");
  assert.equal(money(18.5), "£18.50");
  assert.equal(money(12.71), "£12.71");
  assert.equal(money(0), "£0");
  assert.equal(money(108.000000001), "£108");
  assert.equal(money(0.1 + 0.2), "£0.30");
});

test("hours read without float noise", () => {
  assert.equal(hoursNumber(6), "6");
  assert.equal(hoursNumber(6.5), "6.5");
  assert.equal(hoursNumber(6.25), "6.25");
  assert.equal(hoursNumber(1 / 3), "0.33");
  assert.equal(hoursLabel(6.25), "6.25 hours");
  assert.equal(hoursLabel(1), "1 hour");
  assert.equal(hoursLabel(6.25, "h"), "6.25 h");
  assert.equal(hoursLabel(minutesToHours(375)), "6.25 hours");
});

test("whenLine: one day is relative, several are a dates label, times from the earliest picked day", () => {
  const d = world(); // now is Thu 1 Oct
  const one = addShift(d, { dates: [OCT(2)] });
  assert.equal(whenLine(d, one), "Tomorrow · 17:00–23:00");
  const three = addShift(d, { dates: [OCT(5), OCT(6), OCT(7)], start: "18:00", end: "23:30" });
  assert.equal(whenLine(d, three), "Mon 5–Wed 7 Oct · 18:00–23:30");
  assert.equal(whenLine(d, three, [OCT(7), OCT(6)]), "Tue 6–Wed 7 Oct · 18:00–23:30");
  assert.equal(whenLine(d, three, [OCT(7)]), "Wed 7 Oct · 18:00–23:30");
  // Empty picks mean the whole shift (the web would crash here).
  assert.equal(whenLine(d, three, []), "Mon 5–Wed 7 Oct · 18:00–23:30");
  assert.equal(whenLine(d, { days: [] }), "");
});

test("daysPhrase", () => {
  assert.equal(daysPhrase([OCT(5), OCT(6), OCT(7)], 3), "all 3 days");
  assert.equal(daysPhrase([OCT(8)], 3), "Thu 8 only");
  assert.equal(daysPhrase([OCT(8)], 1), "Thu 8 only");
  assert.equal(daysPhrase([OCT(5), OCT(6)], 3), "2 days");
});

test("people", () => {
  assert.equal(people(1), "1 person");
  assert.equal(people(3), "3 people");
});

test("sentTo names up to two invitees, then counts", () => {
  const d = world();
  const post = addShift(d, { mode: "post" });
  assert.equal(sentTo(d, post), "Job post");
  const ask = addShift(d, { mode: "request" });
  addResponse(d, ask, "poppy", { source: "invite", status: "invited" });
  addResponse(d, ask, "theo", { source: "invite", status: "invited" });
  addResponse(d, ask, "ethan", { source: "response" });
  assert.equal(sentTo(d, ask), "Request · Poppy, Theo");
  addResponse(d, ask, "camille", { source: "invite", status: "invited" });
  assert.equal(sentTo(d, ask), "Request · 3 people");
  addResponse(d, ask, "ghost", { source: "invite", status: "invited" });
  assert.equal(sentTo(d, ask), "Request · 4 people");
});
