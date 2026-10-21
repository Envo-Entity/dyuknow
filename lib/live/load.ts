// Reads everything the signed-in member may see (row-level security decides)
// and builds the demo's Data object from it, so every helper in
// lib/preview/model.ts keeps working unchanged.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  datePlus,
  londonDate,
  type Account,
  type Availability,
  type Booking,
  type Data,
  type DayLog,
  type DocStatus,
  type Member,
  type Message,
  type Notice,
  type Response,
  type Service,
  type Shift,
  type Thread,
} from "@/lib/preview/model";
import type {
  AnswerDayRow,
  AnswerRow,
  AvailabilityRow,
  BadgeCounts,
  BookingDayRow,
  BookingRow,
  BusyRow,
  ContactRow,
  ConversationReadRow,
  ConversationRow,
  DocumentRow,
  DocumentTypeRow,
  MemberRow,
  MessageRow,
  NotificationRow,
  ShiftDayRow,
  ShiftRow,
  TalentCardRow,
  TalentRow,
  VenueCardRow,
  VenueRow,
} from "./rows";
import { readDrafts } from "./drafts";

// Stand-ins for people the viewer may not see: never approved, so no list,
// count or ask ever offers them.
export const SOMEONE = "__someone";
export const ELSEWHERE = "__elsewhere";
// How far ahead a venue may ask when talent are already booked.
const BUSY_DAYS = 55;
const CONTACT_WINDOW = 48 * 3600000;

export type LiveSnapshot = {
  data: Data;
  me: MemberRow;
  userId: string;
  email: string;
  // Document label → code, for uploads; label → why it wasn't accepted.
  docCodes: Record<string, string>;
  rejected: Record<string, string>;
  // Message id → its place in the conversation; conversation → newest seq.
  seqs: Record<string, number>;
  lastSeq: Record<string, number>;
  myReads: Record<string, number>;
  photoPath: string;
  badges: BadgeCounts | null;
};
export type LoadResult =
  | { kind: "signed-out" }
  | { kind: "no-member"; userId: string }
  | { kind: "ready"; snapshot: LiveSnapshot };

// Postgres timestamps as the demo writes them, so string comparisons hold.
export function iso(value: string) {
  return new Date(value).toISOString();
}
function hm(time: string | null | undefined) {
  return (time || "00:00").slice(0, 5);
}
const londonClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
function londonTime(instant: string) {
  return londonClock.format(new Date(instant));
}
// "TW9" is all others ever see of a postcode. The demo's areaOf() reads the
// part before a space, so an area alone is followed by a space and an
// invisible character that trim() keeps.
function areaOnly(area: string | null) {
  return area ? `${area} ​` : "";
}
function pounds(pence: number | null | undefined) {
  return pence == null ? undefined : Math.round(pence) / 100;
}
async function rows<T>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
function placeholder(id: string, side: Member["side"]): Member {
  return {
    id,
    side,
    name: id === ELSEWHERE ? "Another venue" : id === SOMEONE ? "Someone" : "Dyuknow member",
    phone: "",
    postcode: "",
    photo: "",
    bio: "",
    roles: [],
    skills: [],
    approved: false,
    alert: "off",
    venue:
      side === "venue"
        ? { address: "", contactName: "", contactRole: "", types: [], cuisines: [], instagram: "" }
        : undefined,
  };
}
function verifiedAccount(labels: string[] | null): Account {
  return {
    texts: { messages: true, reminders: true },
    docs: Object.fromEntries(
      (labels ?? []).map((l) => [l, { status: "verified" as DocStatus }]),
    ),
  };
}

export async function loadLive(supabase: SupabaseClient): Promise<LoadResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "signed-out" };
  const { data: meRow, error: meError } = await supabase
    .from("members")
    .select("id, user_id, side, approved, deletion_requested_at, deleted_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (meError) throw new Error(meError.message);
  if (!meRow) return { kind: "no-member", userId: user.id };
  const me = meRow as MemberRow;
  const now = new Date().toISOString();
  const today = londonDate(now);
  const photoUrl = (path: string | null) =>
    path ? supabase.storage.from("member-photos").getPublicUrl(path).data.publicUrl : "";

  const [
    own,
    talentCards,
    venueCards,
    availability,
    documents,
    documentTypes,
    shifts,
    shiftDays,
    answers,
    answerDays,
    bookings,
    bookingDays,
    conversations,
    messages,
    reads,
    notifications,
  ] = await Promise.all([
    me.side === "talent"
      ? rows<TalentRow>(supabase.from("talents").select("*").eq("member_id", me.id))
      : rows<VenueRow>(supabase.from("venues").select("*").eq("member_id", me.id)),
    rows<TalentCardRow>(supabase.from("talent_cards").select("*")),
    rows<VenueCardRow>(supabase.from("venue_cards").select("*")),
    rows<AvailabilityRow>(
      supabase
        .from("availability")
        .select("member_id, day_date, kind, start_time, end_time")
        .gte("day_date", datePlus(today, -1))
        .lte("day_date", datePlus(today, BUSY_DAYS + 1)),
    ),
    rows<DocumentRow>(
      supabase
        .from("documents")
        .select("id, doc_type, status, original_filename, uploaded_at, reviewed_at, reject_reason")
        .eq("member_id", me.id),
    ),
    rows<DocumentTypeRow>(supabase.from("document_types").select("code, label, side")),
    rows<ShiftRow>(supabase.from("shifts").select("*").order("created_at", { ascending: false })),
    rows<ShiftDayRow>(supabase.from("shift_days").select("*")),
    rows<AnswerRow>(supabase.from("answers").select("*")),
    rows<AnswerDayRow>(supabase.from("answer_days").select("*")),
    rows<BookingRow>(supabase.from("bookings").select("*").order("booked_at", { ascending: false })),
    rows<BookingDayRow>(supabase.from("booking_days").select("*").order("created_at")),
    rows<ConversationRow>(supabase.from("conversations").select("*")),
    rows<MessageRow>(supabase.from("messages").select("*").order("created_at").order("seq")),
    rows<ConversationReadRow>(
      supabase.from("conversation_reads").select("*").eq("member_id", me.id),
    ),
    rows<NotificationRow>(
      supabase
        .from("notifications")
        .select("*")
        .eq("member_id", me.id)
        .order("id", { ascending: false })
        .limit(200),
    ),
  ]);

  // ---- Members: own row in full, everyone else from their card. ----
  const labelOf = Object.fromEntries(documentTypes.map((t) => [t.code, t.label]));
  const docCodes = Object.fromEntries(
    documentTypes.filter((t) => t.side === me.side).map((t) => [t.label, t.code]),
  );
  const rejected: Record<string, string> = {};
  const ownDocs: Account["docs"] = {};
  for (const d of documents) {
    const label = labelOf[d.doc_type] || d.doc_type;
    if (d.status === "rejected") {
      rejected[label] = d.reject_reason || "";
      ownDocs[label] = { status: "missing", file: d.original_filename, updated: d.uploaded_at };
    } else
      ownDocs[label] = {
        status: d.status,
        file: d.original_filename,
        updated: d.status === "verified" ? d.reviewed_at || d.uploaded_at : d.uploaded_at,
      };
  }
  const account: Account = {
    texts: { messages: true, reminders: true },
    docs: ownDocs,
    deletion: me.deletion_requested_at || undefined,
  };
  const approved = me.approved && !me.deleted_at;
  let self: Member;
  let photoPath = "";
  if (me.side === "talent") {
    const t = own[0] as TalentRow | undefined;
    photoPath = t?.photo_path || "";
    self = {
      id: me.id,
      side: "talent",
      name: t?.full_name || "",
      phone: t?.mobile_number || "",
      postcode: t?.home_postcode || "",
      photo: photoUrl(t?.photo_path ?? null),
      bio: t?.bio || "",
      roles: t?.positions ?? [],
      skills: [...(t?.skills ?? []), ...(t?.custom_skills ?? [])],
      approved,
      alert: t?.shift_alerts || "all",
      minRate:
        t?.minimum_same_day_rate_gbp == null ? undefined : Number(t.minimum_same_day_rate_gbp),
      account,
    };
  } else {
    const v = own[0] as VenueRow | undefined;
    photoPath = v?.photo_path || "";
    self = {
      id: me.id,
      side: "venue",
      name: v?.display_name || "",
      phone: v?.contact_phone || "",
      postcode: v?.postcode || "",
      photo: photoUrl(v?.photo_path ?? null),
      bio: v?.bio || "",
      roles: [],
      skills: [],
      approved,
      alert: "all",
      venue: {
        address: v?.street_address || "",
        contactName: v?.contact_name || "",
        contactRole: v?.contact_position || "",
        types: v?.venue_types ?? [],
        cuisines: v?.cuisines ?? [],
        instagram: v?.instagram_handle || "",
      },
      account,
    };
  }
  const members = new Map<string, Member>([[me.id, self]]);
  for (const c of talentCards)
    if (c.member_id !== me.id)
      members.set(c.member_id, {
        id: c.member_id,
        side: "talent",
        name: c.full_name || "",
        phone: "",
        postcode: areaOnly(c.home_area),
        photo: photoUrl(c.photo_path),
        bio: c.bio || "",
        roles: c.positions ?? [],
        skills: [...(c.skills ?? []), ...(c.custom_skills ?? [])],
        approved: c.active,
        alert: "all",
        minRate: pounds(c.minimum_pay_pence),
        account: verifiedAccount(c.verified_documents),
      });
  for (const c of venueCards)
    if (c.member_id !== me.id)
      members.set(c.member_id, {
        id: c.member_id,
        side: "venue",
        name: c.display_name || "",
        phone: "",
        postcode: areaOnly(c.area),
        photo: photoUrl(c.photo_path),
        bio: c.bio || "",
        roles: [],
        skills: [],
        approved: c.active,
        alert: "all",
        venue: {
          address: "",
          contactName: "",
          contactRole: "",
          types: c.venue_types ?? [],
          cuisines: c.cuisines ?? [],
          instagram: c.instagram_handle || "",
        },
        account: verifiedAccount(c.verified_documents),
      });
  // Own documents may show on the own card too; keep the full account.
  if (self.account) self.account = account;

  // ---- Shifts and their days. ----
  const dayById = new Map(shiftDays.map((d) => [d.id, d]));
  const daysOf = new Map<string, ShiftDayRow[]>();
  for (const d of shiftDays) {
    const list = daysOf.get(d.shift_id) ?? [];
    list.push(d);
    daysOf.set(d.shift_id, list);
  }
  const dataShifts: Shift[] = [];
  for (const s of shifts) {
    const days = (daysOf.get(s.id) ?? []).sort((a, b) => a.day_date.localeCompare(b.day_date));
    if (!days.length) continue;
    dataShifts.push({
      id: s.id,
      venue: s.venue_id,
      roles: s.positions,
      days: days.map(
        (d): Service => ({
          date: d.day_date,
          start: hm(s.start_time),
          end: hm(s.end_time),
          from: iso(d.starts_at),
          to: iso(d.ends_at),
        }),
      ),
      capacity: s.capacity,
      rate: s.rate_pence / 100,
      note: s.note || "",
      mode: s.mode,
      status: s.status,
      created: iso(s.created_at),
    });
  }
  const shiftIds = new Set(dataShifts.map((s) => s.id));

  // ---- Answers. ----
  const answerDates = new Map<string, string[]>();
  for (const a of answerDays) {
    const d = dayById.get(a.shift_day_id);
    if (!d) continue;
    const list = answerDates.get(a.answer_id) ?? [];
    list.push(d.day_date);
    answerDates.set(a.answer_id, list);
  }
  const responses: Response[] = answers
    .filter((a) => shiftIds.has(a.shift_id))
    .map((a) => {
      const dates = answerDates.get(a.id);
      return {
        id: a.id,
        shift: a.shift_id,
        talent: a.talent_id,
        source: a.source,
        status: a.status,
        // A booking request asks for every day; a yes names its days.
        days:
          a.status === "invited"
            ? undefined
            : dates?.length
              ? [...new Set(dates)].sort()
              : ["booked", "cancelled"].includes(a.status)
                ? []
                : undefined,
      };
    });

  // ---- Bookings: one per person per shift, days and what happened. ----
  const rowsOfBooking = new Map<string, BookingDayRow[]>();
  for (const d of bookingDays) {
    const list = rowsOfBooking.get(d.booking_id) ?? [];
    list.push(d);
    rowsOfBooking.set(d.booking_id, list);
  }
  const dataBookings: Booking[] = [];
  for (const b of bookings) {
    if (!shiftIds.has(b.shift_id)) continue;
    // The current row for each day: a live one, else the newest cancelled one.
    const perDay = new Map<string, BookingDayRow>();
    for (const r of rowsOfBooking.get(b.id) ?? []) {
      const kept = perDay.get(r.shift_day_id);
      if (!kept || kept.status === "cancelled") perDay.set(r.shift_day_id, r);
    }
    const log: Record<string, DayLog> = {};
    const days: string[] = [];
    let lastCancel: BookingDayRow | undefined;
    for (const r of perDay.values()) {
      const date = dayById.get(r.shift_day_id)?.day_date ?? londonDate(iso(r.starts_at));
      days.push(date);
      if (r.status === "booked") continue;
      log[date] = {
        status: r.status,
        by: r.recorded_by || (r.auto_confirmed ? "dyuknow" : ""),
        at: r.recorded_at ? iso(r.recorded_at) : now,
        start: r.worked_start_time ? hm(r.worked_start_time) : undefined,
        end: r.worked_end_time ? hm(r.worked_end_time) : undefined,
        hours:
          r.worked_minutes != null ? Math.round((r.worked_minutes / 60) * 100) / 100 : undefined,
        auto: r.auto_confirmed || undefined,
        reason: r.cancel_reason || undefined,
      };
      if (r.status === "cancelled" && (!lastCancel || (r.recorded_at || "") > (lastCancel.recorded_at || "")))
        lastCancel = r;
    }
    if (!days.length) continue;
    const cancelled = b.status === "cancelled";
    dataBookings.push({
      id: b.id,
      shift: b.shift_id,
      talent: b.talent_id,
      days: [...new Set(days)].sort(),
      cancelled,
      reason: cancelled ? lastCancel?.cancel_reason || undefined : undefined,
      by: cancelled ? lastCancel?.recorded_by || undefined : undefined,
      cancelledAt: b.cancelled_at ? iso(b.cancelled_at) : undefined,
      bookedAt: iso(b.booked_at),
      log,
    });
  }

  // Talent never see who else is booked, only how many: stand-in bookings
  // keep places-left right on each day.
  if (me.side === "talent")
    for (const s of dataShifts) {
      if (s.venue === me.id) continue;
      const mineOn = new Set(
        dataBookings
          .filter((b) => b.shift === s.id && b.talent === me.id && !b.cancelled)
          .flatMap((b) => b.days.filter((d) => b.log[d]?.status !== "cancelled")),
      );
      const others = (daysOf.get(s.id) ?? []).map((d) => ({
        date: d.day_date,
        k: Math.max(0, d.booked_count - (mineOn.has(d.day_date) ? 1 : 0)),
      }));
      const most = Math.max(0, ...others.map((o) => o.k));
      for (let k = 0; k < most; k++)
        dataBookings.push({
          id: `others:${s.id}:${k}`,
          shift: s.id,
          talent: SOMEONE,
          days: others.filter((o) => o.k > k).map((o) => o.date),
          cancelled: false,
          log: {},
        });
    }

  // ---- Conversations, messages, read markers. ----
  const threads: Thread[] = conversations.map((c) => ({
    id: c.id,
    venue: c.venue_id,
    talent: c.talent_id,
    started: iso(c.created_at),
  }));
  // Time order across conversations, seq order within each one.
  const bySeq = new Map<string, MessageRow[]>();
  for (const m of messages) {
    const list = bySeq.get(m.conversation_id) ?? [];
    list.push(m);
    bySeq.set(m.conversation_id, list);
  }
  for (const list of bySeq.values()) list.sort((a, b) => a.seq - b.seq);
  const cursor = new Map<string, number>();
  const seqs: Record<string, number> = {};
  const lastSeq: Record<string, number> = {};
  const dataMessages: Message[] = messages.map((slot) => {
    const i = cursor.get(slot.conversation_id) ?? 0;
    cursor.set(slot.conversation_id, i + 1);
    const m = bySeq.get(slot.conversation_id)![i];
    seqs[String(m.id)] = m.seq;
    lastSeq[m.conversation_id] = Math.max(lastSeq[m.conversation_id] ?? 0, m.seq);
    return {
      id: String(m.id),
      thread: m.conversation_id,
      from: m.sender_id || "system",
      text: m.body,
      time: iso(m.created_at),
      system: m.kind === "event",
      shift: m.kind === "card" && m.shift_id && shiftIds.has(m.shift_id) ? m.shift_id : undefined,
    };
  });
  const myReads: Record<string, number> = {};
  const read: Record<string, string> = {};
  for (const r of reads) {
    myReads[r.conversation_id] = r.last_read_seq;
    const at = (bySeq.get(r.conversation_id) ?? []).findLast((m) => m.seq <= r.last_read_seq);
    if (at) read[`${me.id}/${r.conversation_id}`] = String(at.id);
  }

  // ---- Notices. ----
  const notices: Notice[] = notifications.map((n) => ({
    id: String(n.id),
    to: n.member_id,
    title: n.title,
    text: n.body,
    target: n.target,
    read: !!n.read_at,
    time: iso(n.created_at),
  }));

  const dataAvailability: Availability[] = availability.map((a) => ({
    member: a.member_id,
    date: a.day_date,
    kind: a.kind,
    start: hm(a.start_time),
    end: hm(a.end_time),
  }));

  // ---- A venue's view of when talent are already booked, never where. ----
  if (me.side === "venue" && approved) {
    const talentIds = [...members.values()]
      .filter((m) => m.side === "talent" && m.approved)
      .map((m) => m.id);
    const own = new Set(
      bookingDays
        .filter((d) => d.status !== "cancelled")
        .map((d) => `${d.talent_id}/${iso(d.starts_at)}/${iso(d.ends_at)}`),
    );
    const busy: BusyRow[] = [];
    for (let i = 0; i < talentIds.length; i += 100) {
      const { data: found, error } = await supabase.rpc("get_busy_times", {
        p_talent_ids: talentIds.slice(i, i + 100),
        p_from: today,
        p_to: datePlus(today, BUSY_DAYS),
      });
      if (error) break;
      busy.push(...((found as BusyRow[] | null) ?? []));
    }
    busy.forEach((row, i) => {
      const from = iso(row.starts_at);
      const to = iso(row.ends_at);
      if (own.has(`${row.talent_id}/${from}/${to}`)) return;
      const date = londonDate(from);
      const id = `busy:${i}`;
      dataShifts.push({
        id,
        venue: ELSEWHERE,
        roles: [],
        days: [{ date, start: londonTime(from), end: londonTime(to), from, to }],
        capacity: 1,
        rate: 0,
        note: "",
        mode: "post",
        status: "filled",
        created: now,
      });
      dataBookings.push({
        id,
        shift: id,
        talent: row.talent_id,
        days: [date],
        cancelled: false,
        log: {},
      });
    });
  }

  // ---- Contact details: only for active bookings in their window. ----
  if (approved) {
    const inWindow = dataBookings.filter((b) => {
      if (b.cancelled || b.id.includes(":")) return false;
      const s = dataShifts.find((x) => x.id === b.shift);
      if (!s) return false;
      const live = s.days.filter(
        (d) => b.days.includes(d.date) && b.log[d.date]?.status !== "cancelled",
      );
      const end = live.at(-1)?.to;
      return !!end && Date.parse(end) + CONTACT_WINDOW > Date.parse(now);
    });
    const contacts = await Promise.all(
      inWindow.map(async (b) => {
        const { data: c, error } = await supabase.rpc("get_booking_contact", {
          p_booking_id: b.id,
        });
        return error ? null : { b, c: c as ContactRow };
      }),
    );
    for (const found of contacts) {
      if (!found?.c) continue;
      const { b, c } = found;
      if (me.side === "talent") {
        const s = dataShifts.find((x) => x.id === b.shift)!;
        const v = members.get(s.venue);
        if (!v) continue;
        members.set(v.id, {
          ...v,
          phone: c.contact_phone || "",
          postcode: c.postcode || v.postcode,
          venue: {
            ...(v.venue ?? { types: [], cuisines: [], instagram: "" }),
            address: c.street_address || "",
            contactName: c.contact_name || "",
            contactRole: c.contact_position || "",
          },
        });
      } else {
        const t = members.get(b.talent);
        if (t) members.set(t.id, { ...t, phone: c.mobile_number || "" });
      }
    }
  }

  // ---- Anyone referenced but not visible gets a plain stand-in. ----
  const need = (id: string | undefined, side: Member["side"]) => {
    if (id && id !== "system" && id !== "dyuknow" && !members.has(id))
      members.set(id, placeholder(id, side));
  };
  dataShifts.forEach((s) => need(s.venue, "venue"));
  responses.forEach((r) => need(r.talent, "talent"));
  dataBookings.forEach((b) => {
    need(b.talent, "talent");
    need(b.by, me.side);
    Object.values(b.log).forEach((l) => need(l.by, me.side));
  });
  threads.forEach((t) => {
    need(t.venue, "venue");
    need(t.talent, "talent");
  });
  dataMessages.forEach((m) => need(m.from, me.side === "venue" ? "talent" : "venue"));

  let badges: BadgeCounts | null = null;
  {
    const { data: counts, error } = await supabase.rpc("get_badge_counts");
    if (!error && counts) badges = counts as BadgeCounts;
  }

  const data: Data = {
    version: 3,
    now,
    members: [...members.values()],
    shifts: dataShifts,
    responses,
    bookings: dataBookings,
    messages: dataMessages,
    notices,
    availability: dataAvailability,
    threads,
    read,
    messageDrafts: readDrafts(me.id),
    offline: false,
    failNext: false,
  };
  return {
    kind: "ready",
    snapshot: {
      data,
      me,
      userId: user.id,
      email: user.email || "",
      docCodes,
      rejected,
      seqs,
      lastSeq,
      myReads,
      photoPath,
      badges,
    },
  };
}
