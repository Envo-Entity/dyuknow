import test from "node:test";
import assert from "node:assert/strict";
import {
  clockLabel,
  datePlus,
  displayDate,
  londonClock,
  londonDate,
  londonInstant,
  londonTime,
  londonToday,
  relativeDay,
  shortDay,
  upcomingDates,
} from "./time.ts";
import { makeDays } from "./shifts.ts";

test("London wall time resolves to the right instant in BST and GMT", () => {
  assert.equal(londonInstant("2026-10-02", "17:00"), "2026-10-02T16:00:00.000Z");
  assert.equal(londonInstant("2026-11-02", "17:00"), "2026-11-02T17:00:00.000Z");
  assert.equal(londonInstant("2026-10-02", "00:00"), "2026-10-01T23:00:00.000Z");
  assert.equal(londonInstant("2027-01-01", "00:00"), "2027-01-01T00:00:00.000Z");
});

test("times that happen twice or never at a clock change are refused", () => {
  assert.throws(() => londonInstant("2026-10-25", "01:30"), /happens twice/);
  assert.throws(() => londonInstant("2026-03-29", "01:30"), /doesn’t exist/);
  // Either side of the change is fine.
  assert.equal(londonInstant("2026-10-25", "02:30"), "2026-10-25T02:30:00.000Z");
  assert.equal(londonInstant("2026-03-29", "02:30"), "2026-03-29T01:30:00.000Z");
});

test("overnight days end the next morning, and across a clock change", () => {
  const [day] = makeDays({ dates: ["2026-10-08"], start: "22:00", end: "02:00" });
  assert.equal(day.from, "2026-10-08T21:00:00.000Z");
  assert.equal(day.to, "2026-10-09T01:00:00.000Z");
  // Sat 24 Oct 22:00 BST → Sun 25 Oct 03:00 GMT: six hours.
  const [long] = makeDays({ dates: ["2026-10-24"], start: "22:00", end: "03:00" });
  assert.equal((Date.parse(long.to) - Date.parse(long.from)) / 3600000, 6);
});

test("London dates and clocks read across midnight, BST and calendar boundaries", () => {
  assert.equal(londonDate("2026-10-02T23:30:00.000Z"), "2026-10-03");
  assert.equal(londonDate("2026-10-26T23:30:00.000Z"), "2026-10-26");
  assert.equal(londonToday(new Date("2026-10-02T23:30:00Z")), "2026-10-03");
  assert.equal(londonToday(new Date("2026-10-26T23:30:00Z")), "2026-10-26");
  assert.equal(londonTime("2026-10-02T23:00:00.000Z"), "00:00");
  assert.deepEqual(londonClock("2026-12-31T23:59:00Z"), { year: 2026, month: 12, day: 31, hour: 23, minute: 59 });
  assert.deepEqual(upcomingDates("2026-12-31", 3), ["2026-12-31", "2027-01-01", "2027-01-02"]);
  assert.equal(datePlus("2026-03-28", 2), "2026-03-30");
});

test("labels match the website's en-GB text", () => {
  const f = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });
  for (const d of ["2026-10-02", "2026-09-05", "2027-01-01", "2026-03-29", "2026-06-30"])
    assert.equal(displayDate(d), f.format(new Date(`${d}T12:00:00Z`)));
  assert.equal(displayDate("2026-10-02"), "Fri 2 Oct");
  assert.equal(shortDay("2026-10-08"), "Thu 8");
  const c = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
  for (const t of ["2026-10-01T09:00:00.000Z", "2026-09-05T23:05:00.000Z", "2026-12-24T00:00:00.000Z"])
    assert.equal(clockLabel(t), c.format(new Date(t)));
  assert.equal(relativeDay("2026-10-01", "2026-10-01T09:00:00.000Z"), "Today");
  assert.equal(relativeDay("2026-10-02", "2026-10-01T23:30:00.000Z"), "Today");
  assert.equal(relativeDay("2026-10-02", "2026-10-01T09:00:00.000Z"), "Tomorrow");
  assert.equal(relativeDay("2026-10-05", "2026-10-01T09:00:00.000Z"), "Mon 5 Oct");
});
