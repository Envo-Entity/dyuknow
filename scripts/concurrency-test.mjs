// Fires real simultaneous calls at the live database as the seeded fake
// accounts, then removes everything it created.
// Run: node scripts/concurrency-test.mjs   (needs the seed; reads .env.local)
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function as(email) {
  const c = createClient(url, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: env.SEED_PASSWORD });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return c;
}
const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
const datePlus = (d, n) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
async function rpc(c, fn, args) {
  const { data, error } = await c.rpc(fn, args);
  return error ? { error: error.message } : { data };
}
async function memberId(email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const u = data.users.find((x) => x.email === email);
  const { data: m } = await admin.from("members").select("id").eq("user_id", u.id).single();
  return m.id;
}

const created = [];
let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}
async function post(c, date, capacity, extra = {}) {
  const r = await rpc(c, "post_shift", {
    p_team: "Kitchen", p_positions: ["CDP"], p_dates: [date], p_start_time: "17:00",
    p_end_time: "23:00", p_capacity: capacity, p_rate_pence: 1800, p_note: "concurrency test",
    p_to: [], p_client_ref: randomUUID(), ...extra,
  });
  if (r.error) throw new Error(`post_shift: ${r.error}`);
  created.push(r.data.shift_id);
  return r.data.shift_id;
}

try {
  const [spruce, harper, poppy, theo] = await Promise.all(
    ["spruce", "harper", "poppy", "theo"].map((n) => as(`${n}@example.com`)),
  );
  const poppyId = await memberId("poppy@example.com");
  const theoId = await memberId("theo@example.com");
  const date = datePlus(londonToday(), 30);

  // 1. Two venues book the same person for clashing hours at the same instant.
  const a = await post(spruce, date, 1);
  const b = await post(harper, date, 1);
  for (const s of [a, b]) {
    const r = await rpc(poppy, "say_yes", { p_shift_id: s, p_dates: null, p_client_ref: randomUUID() });
    if (r.error) throw new Error(`say_yes: ${r.error}`);
  }
  const both = await Promise.all([
    rpc(spruce, "book_talent", { p_shift_id: a, p_talent_id: poppyId, p_dates: null, p_client_ref: randomUUID() }),
    rpc(harper, "book_talent", { p_shift_id: b, p_talent_id: poppyId, p_dates: null, p_client_ref: randomUUID() }),
  ]);
  const wins = both.filter((r) => !r.error);
  check("two venues, one person, same instant: exactly one booking", wins.length === 1,
    both.map((r) => r.error ?? "booked").join(" | "));
  const { count: poppyDays } = await admin.from("booking_days").select("id", { count: "exact", head: true })
    .eq("talent_id", poppyId).in("shift_id", [a, b]).neq("status", "cancelled");
  check("database holds one live booked day for that person", poppyDays === 1, `${poppyDays}`);

  // 2. Last place: two people said yes to one place; the venue books both at once.
  const c = await post(spruce, datePlus(date, 1), 1);
  for (const t of [poppy, theo]) {
    const r = await rpc(t, "say_yes", { p_shift_id: c, p_dates: null, p_client_ref: randomUUID() });
    if (r.error) throw new Error(`say_yes last place: ${r.error}`);
  }
  const last = await Promise.all([
    rpc(spruce, "book_talent", { p_shift_id: c, p_talent_id: poppyId, p_dates: null, p_client_ref: randomUUID() }),
    rpc(spruce, "book_talent", { p_shift_id: c, p_talent_id: theoId, p_dates: null, p_client_ref: randomUUID() }),
  ]);
  check("last place, two Book taps at once: exactly one booking", last.filter((r) => !r.error).length === 1,
    last.map((r) => r.error ?? "booked").join(" | "));
  const { data: day } = await admin.from("shift_days").select("booked_count").eq("shift_id", c).single();
  check("booked_count never exceeds capacity", day.booked_count === 1, `${day.booked_count}`);

  // 3. Double tap: the same tap sent twice at once acts once.
  const d = await post(spruce, datePlus(date, 2), 2);
  await rpc(theo, "say_yes", { p_shift_id: d, p_dates: null, p_client_ref: randomUUID() });
  const ref = randomUUID();
  const taps = await Promise.all([1, 2].map(() =>
    rpc(spruce, "book_talent", { p_shift_id: d, p_talent_id: theoId, p_dates: null, p_client_ref: ref })));
  const ids = taps.map((r) => r.data?.booking_id).filter(Boolean);
  check("double tap with one client_ref: same result, one booking",
    ids.length === 2 && ids[0] === ids[1], taps.map((r) => r.error ?? r.data?.booking_id).join(" | "));

  // 4. Many say-yes taps from different people on one post at once.
  const e = await post(spruce, datePlus(date, 3), 1);
  const yeses = await Promise.all([poppy, theo].map((t) =>
    rpc(t, "say_yes", { p_shift_id: e, p_dates: null, p_client_ref: randomUUID() })));
  check("simultaneous yeses from different people both land", yeses.every((r) => !r.error),
    yeses.map((r) => r.error ?? "ok").join(" | "));
} catch (err) {
  console.log(`ERROR  ${err.message}`);
  failures++;
} finally {
  // Remove everything this test created.
  const { data: convosBefore } = await admin.from("conversations").select("id");
  if (created.length) {
    const { data: bks } = await admin.from("bookings").select("id").in("shift_id", created);
    const bookingIds = (bks ?? []).map((x) => x.id);
    await admin.from("booking_days").delete().in("shift_id", created);
    if (bookingIds.length) await admin.from("bookings").delete().in("id", bookingIds);
    await admin.from("answer_days").delete().in("shift_id", created);
    await admin.from("answers").delete().in("shift_id", created);
    await admin.from("notifications").delete().in("shift_id", created);
    await admin.from("messages").delete().in("shift_id", created);
    await admin.from("shift_days").delete().in("shift_id", created);
    await admin.from("shifts").delete().in("id", created);
    // Conversations this test started now hold no messages; remove them.
    for (const c of convosBefore ?? []) {
      const { count } = await admin.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", c.id);
      if (count === 0) {
        await admin.from("conversation_reads").delete().eq("conversation_id", c.id);
        await admin.from("conversations").delete().eq("id", c.id);
      }
    }
  }
  console.log(failures ? `${failures} check(s) failed` : "All concurrency checks passed");
  process.exit(failures ? 1 : 0);
}
