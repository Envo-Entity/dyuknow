// Seeds the demo's sample world (lib/preview/model.ts seed()) into the app
// tables, with every date moved so the demo's "1 Oct 2026" is today in London.
// Safe to run again: it removes the fake members' app rows and files first.
//
// Run: node scripts/seed.mjs   (reads .env.local; never prints the key or password)
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  ROOT,
  FAKE_DOMAIN,
  ADMIN_EMAIL,
  loadEnv,
  client,
  check,
  listAllUsers,
  wipeMembers,
  clearFolders,
} from "./wipe.mjs";

// ---------------------------------------------------------------------------
// Dates and London time
// ---------------------------------------------------------------------------
const DEMO_TODAY = "2026-10-01";
const DAY_MS = 86400000;
const londonFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
// UK postcode -> place name (e.g. "Richmond upon Thames"); null if unknown.
async function areaName(postcode) {
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    if (res.ok) return (await res.json())?.result?.admin_district ?? null;
    // Made-up postcodes: fall back to the outward part, e.g. "E8".
    const out = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(postcode.split(" ")[0])}`);
    return out.ok ? ((await out.json())?.result?.admin_district?.[0] ?? null) : null;
  } catch {
    return null;
  }
}

function londonToday() {
  return londonFmt.format(new Date()).slice(0, 10);
}
function datePlus(date, n) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY_MS);
}
// London wall time -> ISO instant. Refuses times that don't exist or happen twice.
function londonInstant(date, time) {
  const target = `${date} ${time}`;
  const guess = Date.parse(`${date}T${time}:00Z`);
  const matches = [guess - 3600000, guess, guess + 3600000].filter(
    (t) => londonFmt.format(new Date(t)) === target,
  );
  if (matches.length !== 1) throw new Error(`London time ${target} is not a single instant (clock change).`);
  return new Date(matches[0]).toISOString();
}
// A span of London days: { date, start, end, starts_at, ends_at }, overnight aware.
function span(date, start, end) {
  const endDate = end < start ? datePlus(date, 1) : date;
  return { date, start, end, starts_at: londonInstant(date, start), ends_at: londonInstant(endDate, end) };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayParts = (date) => {
  const d = new Date(`${date}T12:00:00Z`);
  return { wd: WEEKDAYS[d.getUTCDay()], day: d.getUTCDate(), mon: MONTHS[d.getUTCMonth()] };
};
const dayLabel = (date, withMonth) => {
  const p = dayParts(date);
  return `${p.wd} ${p.day}${withMonth ? ` ${p.mon}` : ""}`;
};
// "Thu 8 Oct"; "Mon 5–Wed 7 Oct"; "Sat 3–Sun 4, Tue 6 Oct"
function datesLabel(dates) {
  const list = [...new Set(dates)].sort();
  const runs = [];
  for (const d of list) {
    const last = runs.at(-1);
    if (last && datePlus(last.at(-1), 1) === d) last.push(d);
    else runs.push([d]);
  }
  const oneMonth = new Set(list.map((d) => d.slice(0, 7))).size === 1;
  const text = runs
    .map((r) =>
      r.length === 1
        ? dayLabel(r[0], !oneMonth)
        : `${dayLabel(r[0], !oneMonth)}–${dayLabel(r.at(-1), !oneMonth)}`,
    )
    .join(", ");
  return oneMonth ? `${text} ${dayParts(list[0]).mon}` : text;
}
function serviceLabel(s) {
  return s.end < s.start
    ? `${dayLabel(s.date, true)} · ${s.start} → ${dayLabel(datePlus(s.date, 1), true)} ${s.end}`
    : `${dayLabel(s.date, true)} · ${s.start}–${s.end}`;
}
const pay = (pence) => `£${pence % 100 ? (pence / 100).toFixed(2) : pence / 100}`;

// ---------------------------------------------------------------------------
// The sample world, from the demo's seed()
// ---------------------------------------------------------------------------
const VENUES = [
  {
    key: "spruce",
    email: "spruce@example.com",
    name: "Spruce",
    phone: "+44 7700 900101",
    postcode: "TW9 1UA",
    photo: "venue-larkspur-dining.webp",
    bio: "A neighbourhood dining room built around seasonal British produce.",
    address: "14 Church Road, Richmond, London",
    contactName: "Alex",
    contactRole: "Duty manager",
    types: ["Restaurant"],
    cuisines: ["British"],
    instagram: "@spruce.richmond",
  },
  {
    key: "sea",
    email: "sea@example.com",
    name: "The Sea The Sea",
    phone: "+44 7700 900102",
    postcode: "SW1X 0AW",
    photo: "venue-hotel-bar.webp",
    bio: "A seafood counter with an open kitchen and a calm service.",
    address: "174 Pavilion Road, Chelsea, London",
    contactName: "Morgan",
    contactRole: "On-site manager",
    types: ["Restaurant"],
    cuisines: ["Seafood"],
    instagram: "@theseathesea",
  },
  {
    key: "harper",
    email: "harper@example.com",
    name: "Harper Privé",
    phone: "+44 7700 900103",
    postcode: "W1K 5DB",
    photo: "venue-members-club.webp",
    bio: "Intimate private dinners and considered events.",
    address: "8 Brook Street, Mayfair, London",
    contactName: "Jamie",
    contactRole: "Events manager",
    types: ["Private Members Club", "Events"],
    cuisines: ["Modern European"],
    instagram: "@harperprive",
  },
];
const TALENT = [
  {
    key: "poppy",
    email: "poppy@example.com",
    name: "Poppy Bertram",
    phone: "+44 7700 900201",
    postcode: "TW9 2AA",
    photo: "talent-chef-4.webp",
    bio: "Five years in seasonal kitchens. Comfortable on a busy section, happiest working with British produce.",
    roles: ["CDP", "Senior CDP"],
    skills: ["Fine Dining", "Open Fire", "Grill"],
    minRate: 16,
  },
  {
    key: "camille",
    email: "camille@example.com",
    name: "Camille Aubert",
    phone: "+44 7700 900202",
    postcode: "SW3 4RY",
    photo: "talent-camille-portrait.webp",
    bio: "Nine years leading kitchens. Ex-Core by Clare Smyth. A calm hand at the pass.",
    roles: ["Head Chef", "Sous Chef"],
    skills: ["Open Fire", "Fine Dining", "Fish"],
    minRate: 25,
  },
  {
    key: "theo",
    email: "theo@example.com",
    name: "Theo Marchetti",
    phone: "+44 7700 900203",
    postcode: "W1T 2EZ",
    photo: "talent-chef-2.webp",
    bio: "Six years on sections in contemporary London restaurants. Produce-led, steady on service.",
    roles: ["CDP", "Senior CDP"],
    skills: ["Fine Dining", "Pasta"],
    minRate: 17,
  },
  {
    key: "ethan",
    email: "ethan@example.com",
    name: "Ethan Russell",
    phone: "+44 7700 900204",
    postcode: "E8 3PB",
    photo: "talent-chef-3.webp",
    bio: "",
    roles: ["Sous Chef", "Junior Sous"],
    skills: ["High Volume", "Events"],
    minRate: 20,
  },
  {
    key: "noor",
    email: "noor@example.com",
    name: "Noor Haddad",
    phone: "+44 7700 900205",
    postcode: "W1D 4DE",
    photo: "talent-bartender-1.webp",
    bio: "Four years behind London hotel and restaurant bars. Cocktail service with care and pace.",
    roles: ["Bartender", "Mixologist"],
    skills: ["Cocktails", "High Volume", "Guest Relations"],
    minRate: 15,
  },
  {
    key: "ines",
    email: "ines@example.com",
    name: "Inès Laurent",
    phone: "+44 7700 900206",
    postcode: "W8 7AG",
    photo: "talent-maitred-1.webp",
    bio: "Guest service from intimate dinners to a busy dining room. Fluent in English and French.",
    roles: ["Waiter", "Host", "Section Waiter"],
    skills: ["Wine Service", "Guest Relations", "Fine Dining"],
    minRate: 14,
  },
  // New: a waiting member, so /admin has someone to approve.
  {
    key: "maya",
    email: "maya@example.com",
    name: "Maya Clarke",
    phone: "+44 7700 900207",
    postcode: "N1 7GU",
    photo: "talent-pastry-1.webp",
    bio: "Pastry chef with seven years in hotel and restaurant kitchens. Laminated doughs, plated desserts and petits fours.",
    roles: ["Pastry Chef"],
    skills: ["Pastry", "Bakery", "Fine Dining"],
    minRate: 18,
    waiting: true,
  },
];
const KITCHEN = new Set([
  "Demi CDP", "CDP", "Senior CDP", "Junior Sous", "Sous Chef", "Head Chef", "Executive Chef", "Pastry Chef",
]);
const TEAM_OF = {
  CDP: "Kitchen", "Senior CDP": "Kitchen", "Head Chef": "Kitchen", "Sous Chef": "Kitchen",
  "Junior Sous": "Kitchen", Bartender: "Bar", Mixologist: "Bar", Waiter: "Floor",
};
const DOC_LABEL = {
  "right-to-work": "Right to work",
  "photo-id": "Photo ID",
  "food-hygiene": "Food hygiene certificate",
  "allergen-awareness": "Allergen awareness",
  "business-registration": "Business registration",
  "premises-licence": "Premises licence",
};
function requiredDocs(p) {
  if (!p.roles) return ["business-registration", "premises-licence"];
  return ["right-to-work", "photo-id", p.roles.some((r) => KITCHEN.has(r)) ? "food-hygiene" : "allergen-awareness"];
}

// A tiny valid one-page PDF with the given line of text.
function placeholderPdf(text) {
  const safe = text.replace(/[\\()]/g, "");
  const stream = `BT /F1 18 Tf 72 720 Td (${safe}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

// ---------------------------------------------------------------------------
async function main() {
  const env = loadEnv();
  if (!env.SEED_PASSWORD) throw new Error("SEED_PASSWORD is missing from .env.local.");
  const db = client(env);

  const everyone = [...VENUES, ...TALENT];
  const emails = [...everyone.map((p) => p.email), ADMIN_EMAIL];
  const bad = emails.filter((e) => !e.toLowerCase().endsWith(FAKE_DOMAIN) && e !== ADMIN_EMAIL);
  if (bad.length) throw new Error(`Refusing to run: these addresses are not ${FAKE_DOMAIN}: ${bad.join(", ")}`);

  // Dates: the demo's 1 Oct 2026 becomes today in London.
  const today = londonToday();
  const offset = daysBetween(DEMO_TODAY, today);
  const shiftDate = (demoDate) => datePlus(demoDate, offset);
  const shiftInstant = (iso) => new Date(Date.parse(iso) + offset * DAY_MS).toISOString();
  const now = new Date().toISOString();

  // 1. Logins: create, or reset the password of an existing one.
  const existing = new Map((await listAllUsers(db)).map((u) => [(u.email ?? "").toLowerCase(), u]));
  const uid = {};
  for (const email of emails) {
    const found = existing.get(email);
    if (found) {
      check(
        await db.auth.admin.updateUserById(found.id, { password: env.SEED_PASSWORD, email_confirm: true }),
        `update login ${email}`,
      );
      uid[email] = found.id;
    } else {
      const data = check(
        await db.auth.admin.createUser({ email, password: env.SEED_PASSWORD, email_confirm: true }),
        `create login ${email}`,
      );
      uid[email] = data.user.id;
    }
  }
  const adminId = uid[ADMIN_EMAIL];
  const userIds = everyone.map((p) => uid[p.email]);

  // 2. Remove existing app rows and files for these logins.
  const old = check(await db.from("members").select("id").in("user_id", userIds), "read members");
  await wipeMembers(
    db,
    old.map((m) => m.id),
  );
  await clearFolders(db, [...userIds, adminId]);

  // 3. Admin: a login in admins, no members row.
  check(
    await db.from("admins").upsert({ user_id: adminId, name: "Dyuknow admin (seed)" }, { onConflict: "user_id" }),
    "insert admins",
  );

  // 4. Members (inserted approved, so the approval trigger sends nothing).
  const approvedAt = shiftInstant("2026-09-20T09:00:00.000Z");
  const memberRows = check(
    await db
      .from("members")
      .insert(
        everyone.map((p) => ({
          user_id: uid[p.email],
          side: p.roles ? "talent" : "venue",
          approved: !p.waiting,
          approved_at: p.waiting ? null : approvedAt,
        })),
      )
      .select("id,user_id"),
    "insert members",
  );
  const mid = {};
  for (const p of everyone) {
    p.userId = uid[p.email];
    p.id = memberRows.find((r) => r.user_id === p.userId).id;
    mid[p.key] = p.id;
  }
  const byKey = Object.fromEntries(everyone.map((p) => [p.key, p]));

  // 5. Photos.
  for (const p of everyone) {
    p.photoPath = `${p.userId}/seed.webp`;
    const bytes = readFileSync(path.join(ROOT, "public", "assets", p.photo));
    check(
      await db.storage.from("member-photos").upload(p.photoPath, bytes, { contentType: "image/webp", upsert: true }),
      `upload photo for ${p.email}`,
    );
  }

  // 6. Profiles.
  const completedAt = shiftInstant("2026-09-15T10:00:00.000Z");
  check(
    await db.from("venues").insert(
      VENUES.map((v) => ({
        member_id: v.id,
        business_name: v.name,
        instagram_handle: v.instagram,
        contact_name: v.contactName,
        contact_position: v.contactRole,
        contact_phone: v.phone,
        street_address: v.address,
        postcode: v.postcode,
        photo_path: v.photoPath,
        venue_types: v.types,
        cuisines: v.cuisines,
        bio: v.bio,
        agreed_pay_fairly: true,
        agreed_treat_team_like_our_own: true,
        agreed_provide_clear_brief: true,
        agreed_rate_honestly: true,
        onboarding_completed_at: completedAt,
      })),
    ),
    "insert venues",
  );
  check(
    await db.from("talents").insert(
      TALENT.map((t) => ({
        member_id: t.id,
        full_name: t.name,
        mobile_number: t.phone,
        home_postcode: t.postcode,
        photo_path: t.photoPath,
        category: t.roles.some((r) => KITCHEN.has(r)) ? "Chef" : "Front of House",
        positions: t.roles,
        skills: t.skills,
        bio: t.bio || null,
        minimum_same_day_rate_gbp: t.minRate,
        shift_alerts: "all",
        agreed_turn_up_on_time: true,
        agreed_treat_venues_with_respect: true,
        agreed_give_notice_if_cancelling: true,
        agreed_represent_professionally: true,
        onboarding_completed_at: t.waiting ? shiftInstant(`${datePlus(DEMO_TODAY, -1)}T15:00:00.000Z`) : completedAt,
      })),
    ),
    "insert talents",
  );

  // 6b. Place names shown instead of postcodes, from postcodes.io.
  for (const p of [...VENUES, ...TALENT]) {
    const name = await areaName(p.postcode);
    if (!name) continue;
    check(
      await db.from(VENUES.includes(p) ? "venues" : "talents").update({ area_name: name }).eq("member_id", p.id),
      `set area name for ${p.email}`,
    );
  }

  // 7. Documents: one per required type, mostly verified.
  const docRows = [];
  for (const p of everyone) {
    for (const code of requiredDocs(p)) {
      let status = "verified";
      let filename = `${code}.pdf`;
      let uploaded = shiftInstant("2026-09-20T09:00:00.000Z");
      if (p.key === "noor" && code === "allergen-awareness") continue; // missing
      if (p.key === "theo" && code === "food-hygiene") {
        status = "review";
        filename = "food-hygiene-level-2.pdf";
        uploaded = shiftInstant("2026-09-30T09:00:00.000Z");
      }
      if (p.waiting) {
        if (code !== "food-hygiene") continue; // the waiting member uploaded one document
        status = "review";
        filename = "food-hygiene-level-3.pdf";
        uploaded = shiftInstant("2026-09-30T15:00:00.000Z");
      }
      const storagePath = `${p.userId}/${code}.pdf`;
      const pdf = placeholderPdf(`Placeholder: ${DOC_LABEL[code]} for ${p.name}`);
      check(
        await db.storage
          .from("member-documents")
          .upload(storagePath, pdf, { contentType: "application/pdf", upsert: true }),
        `upload document for ${p.email}`,
      );
      docRows.push({
        member_id: p.id,
        doc_type: code,
        storage_path: storagePath,
        original_filename: filename,
        content_type: "application/pdf",
        size_bytes: pdf.length,
        status,
        uploaded_at: uploaded,
        reviewed_at: status === "verified" ? new Date(Date.parse(uploaded) + 3600000).toISOString() : null,
        reviewed_by: status === "verified" ? adminId : null,
      });
    }
  }
  check(await db.from("documents").insert(docRows), "insert documents");

  // 8. Availability: 14 free evenings from today for approved talent except Theo.
  const availRows = [];
  for (const t of TALENT.filter((t) => !t.waiting && t.key !== "theo"))
    for (let i = 0; i < 14; i++) {
      const date = datePlus(today, i);
      if (t.key === "poppy" && date === shiftDate("2026-10-06")) {
        availRows.push({ member_id: t.id, day_date: date, kind: "not-free", start_time: "00:00", end_time: "00:00" });
        continue;
      }
      const s = span(date, "16:00", "23:59");
      availRows.push({
        member_id: t.id,
        day_date: date,
        kind: "free",
        start_time: "16:00",
        end_time: "23:59",
        starts_at: s.starts_at,
        ends_at: s.ends_at,
      });
    }
  check(await db.from("availability").insert(availRows), "insert availability");

  // 9. Shifts and their days.
  const days = (demoDate, count, start, end) =>
    Array.from({ length: count }, (_, i) => span(shiftDate(datePlus(demoDate, i)), start, end));
  const SHIFTS = [
    { key: "spruce-friday", venue: "spruce", roles: ["CDP", "Senior CDP"], days: days("2026-10-02", 1, "17:00", "23:00"), rate: 18, note: "Chef whites · Uniform provided · Staff meal", mode: "post", status: "open" },
    { key: "sea-saturday", venue: "sea", roles: ["Head Chef", "Sous Chef"], days: days("2026-10-03", 1, "18:00", "23:00"), rate: 28, note: "Chef whites · Staff meal", mode: "request", status: "open" },
    { key: "harper-weekend", venue: "harper", roles: ["CDP"], days: days("2026-10-04", 3, "17:00", "23:00"), rate: 24, note: "Blacks · Staff meal", mode: "post", status: "open" },
    { key: "sea-residency", venue: "sea", roles: ["Sous Chef", "Junior Sous"], days: days("2026-10-08", 3, "16:00", "23:00"), rate: 26, note: "Chef whites · staff meal · running the pass while our head chef is away.", mode: "post", status: "open" },
    { key: "harper-bar", venue: "harper", roles: ["Bartender", "Mixologist"], days: days("2026-10-02", 1, "22:00", "02:00"), rate: 22, note: "Black shirt · cocktail service · taxi home arranged directly with the venue.", mode: "post", status: "open" },
    { key: "spruce-floor", venue: "spruce", roles: ["Waiter"], days: days("2026-10-07", 1, "18:00", "23:00"), rate: 18, note: "Black shirt · staff meal · relaxed evening service.", mode: "post", status: "open" },
    { key: "past-poppy", venue: "spruce", roles: ["CDP"], days: days("2026-09-28", 1, "17:00", "23:00"), rate: 18, note: "Chef whites · Uniform provided · Staff meal", mode: "request", status: "filled", created: shiftInstant("2026-09-27T09:00:00.000Z") },
  ];
  const shiftRows = check(
    await db
      .from("shifts")
      .insert(
        SHIFTS.map((s) => ({
          venue_id: mid[s.venue],
          mode: s.mode,
          status: s.status,
          team: TEAM_OF[s.roles[0]],
          positions: s.roles,
          capacity: 1,
          rate_pence: s.rate * 100,
          start_time: s.days[0].start,
          end_time: s.days[0].end,
          note: s.note,
          created_at: s.created ?? now,
        })),
      )
      .select("id"),
    "insert shifts",
  );
  SHIFTS.forEach((s, i) => (s.id = shiftRows[i].id));
  const shift = Object.fromEntries(SHIFTS.map((s) => [s.key, s]));
  const dayRows = check(
    await db
      .from("shift_days")
      .insert(
        SHIFTS.flatMap((s) =>
          s.days.map((d) => ({ shift_id: s.id, day_date: d.date, starts_at: d.starts_at, ends_at: d.ends_at })),
        ),
      )
      .select("id,shift_id,day_date,starts_at,ends_at"),
    "insert shift_days",
  );

  // 10. Answers, and Poppy's past booking (one day, worked 17:00–23:00).
  const past = shift["past-poppy"];
  check(
    await db.from("answers").insert([
      { shift_id: shift["sea-saturday"].id, talent_id: mid.camille, source: "invite", status: "invited", created_at: now },
      { shift_id: past.id, talent_id: mid.poppy, source: "invite", status: "booked", created_at: past.created },
    ]),
    "insert answers",
  );
  const bookedAt = new Date(Date.parse(past.created) + 30 * 60000).toISOString();
  const booking = check(
    await db
      .from("bookings")
      .insert({
        shift_id: past.id,
        talent_id: mid.poppy,
        status: "active",
        booked_at: bookedAt,
        reminded_at: new Date(Date.parse(past.days[0].starts_at) - 3 * 3600000).toISOString(),
      })
      .select("id")
      .single(),
    "insert bookings",
  );
  const pastDay = dayRows.find((d) => d.shift_id === past.id);
  const bookingDay = check(
    await db
      .from("booking_days")
      .insert({
        booking_id: booking.id,
        shift_day_id: pastDay.id,
        shift_id: past.id,
        talent_id: mid.poppy,
        starts_at: pastDay.starts_at,
        ends_at: pastDay.ends_at,
        status: "booked",
        created_at: bookedAt,
      })
      .select("id")
      .single(),
    "insert booking_days",
  );
  const workedStart = londonInstant(past.days[0].date, "17:00");
  const workedEnd = londonInstant(past.days[0].date, "23:00");
  const workedMinutes = Math.round((Date.parse(workedEnd) - Date.parse(workedStart)) / 60000);
  check(
    await db
      .from("booking_days")
      .update({
        status: "worked",
        recorded_at: shiftInstant("2026-09-29T10:00:00.000Z"),
        recorded_by: mid.spruce,
        worked_start_time: "17:00",
        worked_end_time: "23:00",
        worked_minutes: workedMinutes,
        pay_pence: Math.round((workedMinutes * past.rate * 100) / 60),
      })
      .eq("id", bookingDay.id),
    "record worked day",
  );

  // 11. Conversations and messages.
  const terms = (s) => `${datesLabel(s.days.map((d) => d.date))} · ${s.days[0].start}–${s.days[0].end} · £${s.rate}/h.`;
  const at = (iso, minutes) => new Date(Date.parse(iso) + minutes * 60000).toISOString();
  const workedAt = shiftInstant("2026-09-29T10:00:00.000Z");
  const sea = shift["sea-saturday"];
  const CONVS = [
    {
      venue: "spruce",
      talent: "poppy",
      messages: [
        { kind: "card", from: "spruce", body: "Booking request", shift: past.id, at: past.created },
        { kind: "event", body: `Poppy Bertram accepted. Booked: ${terms(past)}`, shift: past.id, at: bookedAt },
        { kind: "text", from: "spruce", body: "Thanks Poppy. Come to the staff door on Church Road, Alex will meet you at 16:45.", at: at(bookedAt, 20) },
        { kind: "text", from: "poppy", body: "Perfect, see you then. I'll bring my own knives.", at: at(bookedAt, 35) },
        { kind: "text", from: "spruce", body: "Great service last night, thank you. Hours are confirmed. We'd love to have you back.", at: at(workedAt, 2) },
      ],
      reads: { spruce: "all", poppy: "all" },
    },
    {
      venue: "sea",
      talent: "camille",
      messages: [
        { kind: "card", from: "sea", body: "Booking request", shift: sea.id, at: now },
        { kind: "text", from: "sea", body: `Hi Camille, our head chef is away ${dayLabel(sea.days[0].date, true)}. Would you run the pass for us? Morgan will be on site.`, at: at(now, 1) },
      ],
      reads: { sea: "all", camille: 1 },
    },
  ];
  for (const c of CONVS) {
    const last = c.messages.at(-1).at;
    const conv = check(
      await db
        .from("conversations")
        .insert({
          venue_id: mid[c.venue],
          talent_id: mid[c.talent],
          created_at: c.messages[0].at,
          last_seq: c.messages.length,
          last_message_at: last,
        })
        .select("id")
        .single(),
      "insert conversations",
    );
    c.id = conv.id;
    check(
      await db.from("messages").insert(
        c.messages.map((m, i) => ({
          conversation_id: conv.id,
          seq: i + 1,
          kind: m.kind,
          sender_id: m.from ? mid[m.from] : null,
          body: m.body,
          shift_id: m.shift ?? null,
          created_at: m.at,
        })),
      ),
      "insert messages",
    );
    check(
      await db.from("conversation_reads").insert(
        Object.entries(c.reads).map(([who, upTo]) => {
          const seq = upTo === "all" ? c.messages.length : upTo;
          return { conversation_id: conv.id, member_id: mid[who], last_read_seq: seq, read_at: c.messages[seq - 1].at };
        }),
      ),
      "insert conversation_reads",
    );
  }

  // 12. Notifications, as the demo's seed: the booking request, then job posts.
  const label = (s) => s.roles.join(" or ");
  const notices = [
    {
      member_id: mid.camille,
      kind: "booking-request",
      title: `${byKey.sea.name} sent you a booking request`,
      body: `${label(sea)} · ${datesLabel(sea.days.map((d) => d.date))} · ${sea.days[0].start}–${sea.days[0].end} · £${sea.rate}/h`,
      target: `shift/${sea.id}`,
      actor_id: mid.sea,
      shift_id: sea.id,
      created_at: now,
    },
  ];
  for (const s of SHIFTS.filter((s) => s.mode === "post"))
    for (const t of TALENT.filter((t) => !t.waiting && t.roles.some((r) => s.roles.includes(r))))
      notices.push({
        member_id: t.id,
        kind: "job-posted",
        title: `${byKey[s.venue].name} posted a job`,
        body:
          s.days.length === 1
            ? `${label(s)} · ${serviceLabel(s.days[0])} · ${pay(s.rate * 100)}/h`
            : `${label(s)} · ${datesLabel(s.days.map((d) => d.date))} · ${s.days[0].start}–${s.days[0].end} · ${pay(s.rate * 100)}/h`,
        target: `shift/${s.id}`,
        actor_id: mid[s.venue],
        shift_id: s.id,
        created_at: now,
      });
  check(await db.from("notifications").insert(notices), "insert notifications");

  // 13. Summary.
  const ids = Object.values(mid);
  const count = async (table, col, values) => {
    const res = await db.from(table).select("*", { count: "exact", head: true }).in(col, values);
    check(res, `count ${table}`);
    return res.count;
  };
  const shiftIds = SHIFTS.map((s) => s.id);
  const convIds = CONVS.map((c) => c.id);
  const summary = {
    logins: emails.length,
    members: await count("members", "id", ids),
    "members approved": everyone.filter((p) => !p.waiting).length,
    venues: await count("venues", "member_id", ids),
    talents: await count("talents", "member_id", ids),
    documents: await count("documents", "member_id", ids),
    availability: await count("availability", "member_id", ids),
    shifts: await count("shifts", "venue_id", ids),
    shift_days: await count("shift_days", "shift_id", shiftIds),
    answers: await count("answers", "shift_id", shiftIds),
    bookings: await count("bookings", "shift_id", shiftIds),
    booking_days: await count("booking_days", "shift_id", shiftIds),
    conversations: convIds.length,
    messages: await count("messages", "conversation_id", convIds),
    notifications: await count("notifications", "member_id", ids),
  };
  console.log(`Seeded the demo world (demo 1 Oct 2026 -> ${today}, ${offset} days on).`);
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`);
  console.log(`  logins: ${emails.join(", ")} (password from SEED_PASSWORD)`);
}

main().catch((e) => {
  console.error(e.message);
  if (/permission denied for function (postcode_area|valid_free_text_items)/.test(e.message))
    console.error(
      "The service role can't compute talents/venues columns. A migration must run:\n" +
        "  grant execute on function private.postcode_area(text), private.valid_free_text_items(text[]) to service_role;\n" +
        "Then run the seed again (it is safe to re-run), or `npm run wipe` to clear this partial seed.",
    );
  process.exit(1);
});
