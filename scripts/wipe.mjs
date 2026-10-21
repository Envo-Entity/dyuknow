// Removes every trace of the fake data: the app rows of members whose login
// ends in @example.com, their files in member-photos and member-documents,
// the @example.com logins, and the fake admin (admin@dyuknow.com).
// Other app members are listed and left alone.
//
// Run: node scripts/wipe.mjs   (reads .env.local; never prints the key)
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FAKE_DOMAIN = "@example.com";
export const ADMIN_EMAIL = "admin@dyuknow.com";
export const BUCKETS = ["member-photos", "member-documents"];

export function loadEnv() {
  const env = {};
  let text;
  try {
    text = readFileSync(path.join(ROOT, ".env.local"), "utf8");
  } catch {
    throw new Error(".env.local not found in the project root.");
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

export function client(env) {
  for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])
    if (!env[k]) throw new Error(`${k} is missing from .env.local.`);
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function check(res, what) {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

export async function listAllUsers(db) {
  const users = [];
  for (let page = 1; ; page++) {
    const data = check(await db.auth.admin.listUsers({ page, perPage: 1000 }), "list logins");
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

const isFake = (email) => (email ?? "").toLowerCase().endsWith(FAKE_DOMAIN);

async function selectIds(db, table, column, filterCol, values) {
  if (!values.length) return [];
  const out = [];
  for (let i = 0; i < values.length; i += 100) {
    const rows = check(
      await db.from(table).select(column).in(filterCol, values.slice(i, i + 100)),
      `read ${table}`,
    );
    out.push(...rows.map((r) => r[column]));
  }
  return [...new Set(out)];
}

async function del(db, table, filterCol, values) {
  if (!values.length) return 0;
  let n = 0;
  for (let i = 0; i < values.length; i += 100) {
    const res = await db
      .from(table)
      .delete({ count: "exact" })
      .in(filterCol, values.slice(i, i + 100));
    check(res, `delete ${table}`);
    n += res.count ?? 0;
  }
  return n;
}

// Deletes every app row belonging to these members, children first.
export async function wipeMembers(db, memberIds) {
  if (!memberIds.length) return {};
  const shiftIds = await selectIds(db, "shifts", "id", "venue_id", memberIds);
  const convIds = [
    ...new Set([
      ...(await selectIds(db, "conversations", "id", "venue_id", memberIds)),
      ...(await selectIds(db, "conversations", "id", "talent_id", memberIds)),
    ]),
  ];
  const answerIds = [
    ...new Set([
      ...(await selectIds(db, "answers", "id", "talent_id", memberIds)),
      ...(await selectIds(db, "answers", "id", "shift_id", shiftIds)),
    ]),
  ];
  const counts = {};
  const add = (k, n) => (counts[k] = (counts[k] ?? 0) + n);
  add("notifications", await del(db, "notifications", "member_id", memberIds));
  add("conversation_reads", await del(db, "conversation_reads", "conversation_id", convIds));
  add("conversation_reads", await del(db, "conversation_reads", "member_id", memberIds));
  add("messages", await del(db, "messages", "conversation_id", convIds));
  add("messages", await del(db, "messages", "shift_id", shiftIds));
  add("conversations", await del(db, "conversations", "id", convIds));
  add("booking_days", await del(db, "booking_days", "talent_id", memberIds));
  add("booking_days", await del(db, "booking_days", "shift_id", shiftIds));
  add("bookings", await del(db, "bookings", "talent_id", memberIds));
  add("bookings", await del(db, "bookings", "shift_id", shiftIds));
  add("answer_days", await del(db, "answer_days", "answer_id", answerIds));
  add("answer_days", await del(db, "answer_days", "shift_id", shiftIds));
  add("answers", await del(db, "answers", "id", answerIds));
  add("shift_days", await del(db, "shift_days", "shift_id", shiftIds));
  add("shifts", await del(db, "shifts", "id", shiftIds));
  add("call_receipts", await del(db, "call_receipts", "member_id", memberIds));
  add("availability", await del(db, "availability", "member_id", memberIds));
  add("documents", await del(db, "documents", "member_id", memberIds));
  add("admin_actions", await del(db, "admin_actions", "member_id", memberIds));
  add("talents", await del(db, "talents", "member_id", memberIds));
  add("venues", await del(db, "venues", "member_id", memberIds));
  add("members", await del(db, "members", "id", memberIds));
  return counts;
}

// Removes every file under <login id>/ in the app's two buckets.
export async function clearFolders(db, userIds) {
  let n = 0;
  for (const bucket of BUCKETS)
    for (const uid of userIds) {
      for (;;) {
        const files = check(await db.storage.from(bucket).list(uid, { limit: 1000 }), `list ${bucket}`);
        const paths = files.filter((f) => f.id).map((f) => `${uid}/${f.name}`);
        if (!paths.length) break;
        check(await db.storage.from(bucket).remove(paths), `remove from ${bucket}`);
        n += paths.length;
      }
    }
  return n;
}

async function main() {
  const env = loadEnv();
  const db = client(env);
  const users = await listAllUsers(db);
  const fakeUsers = users.filter((u) => isFake(u.email));
  const adminUser = users.find((u) => (u.email ?? "").toLowerCase() === ADMIN_EMAIL);
  const fakeUserIds = new Set(fakeUsers.map((u) => u.id));
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  const members = check(await db.from("members").select("id,user_id,side"), "read members");
  const fakeMembers = members.filter((m) => fakeUserIds.has(m.user_id));
  const others = members.filter((m) => !fakeUserIds.has(m.user_id));

  const counts = await wipeMembers(
    db,
    fakeMembers.map((m) => m.id),
  );
  const files = await clearFolders(db, [...fakeUserIds, ...(adminUser ? [adminUser.id] : [])]);

  if (adminUser) check(await db.from("admins").delete().eq("user_id", adminUser.id), "delete admins");
  const doomed = [...fakeUsers, ...(adminUser ? [adminUser] : [])];
  for (const u of doomed) check(await db.auth.admin.deleteUser(u.id), `delete login ${u.email}`);

  console.log("Wiped fake data.");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  console.log(`  files: ${files}`);
  console.log(`  logins: ${doomed.length}`);
  if (others.length) {
    console.log("Other app members found and left alone:");
    for (const m of others) console.log(`  ${m.id}  ${m.side}  ${emailById.get(m.user_id) ?? "(no login)"}`);
  } else console.log("No other app members found.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
