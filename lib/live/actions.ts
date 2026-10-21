// Each tap in the live app becomes one database function call (see
// docs/backend/00-build-brief.md → Function signatures). Refusals come back
// as plain messages and are thrown as they are, so the screens show them.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  availableDates,
  bookableDates,
  bookingServices,
  makeDays,
  member,
  SKILLS,
  type Action,
  type Member,
} from "@/lib/preview/model";
import type { LiveSnapshot } from "./load";
import { writeDraft } from "./drafts";

// What the screens can ask for: the demo's actions, plus the real file for
// an upload and a new profile photo.
export type AppAction =
  | Exclude<Action, { type: "upload-doc" }>
  | (Extract<Action, { type: "upload-doc" }> & { blob?: File })
  | { type: "photo"; actor: string; file: File };

export type LiveOutcome = {
  // Replaces the screen's own success line when the result differs.
  success?: string;
  // A shift to show first, such as the one just posted.
  shift?: string;
  // Changes kept in the browser only; no reload needed.
  local?: boolean;
};

const DOC_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};
const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function plain(message: string) {
  if (/failed to fetch|networkerror|load failed/i.test(message))
    return "Couldn’t save. Check your connection and try again.";
  return message;
}
async function call<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  fn: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(plain(error.message));
  return (data ?? {}) as T;
}
function randomName() {
  return crypto.randomUUID();
}
async function upload(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error)
    throw new Error(
      /exceed|too large|size/i.test(error.message)
        ? bucket === "member-photos"
          ? "Choose a photo up to 5 MB."
          : "Choose a file up to 10 MB."
        : plain(error.message),
    );
}
async function remove(supabase: SupabaseClient, bucket: string, path?: string | null) {
  if (path) await supabase.storage.from(bucket).remove([path]);
}

// The fields of a profile edit, in the database's words; only what changed.
function profileChanges(me: Member, patch: Partial<Member>) {
  const changes: Record<string, unknown> = {};
  const set = (key: string, next: unknown, now: unknown) => {
    if (next !== undefined && JSON.stringify(next) !== JSON.stringify(now)) changes[key] = next;
  };
  const text = (v: string | undefined) => (v === undefined ? undefined : v.trim());
  set(me.side === "talent" ? "full_name" : "name", text(patch.name), me.name);
  set("bio", text(patch.bio), me.bio);
  if (me.side === "talent") {
    set("home_postcode", text(patch.postcode), me.postcode);
    set("mobile_number", text(patch.phone), me.phone);
    set("positions", patch.roles, me.roles);
    if (patch.skills && JSON.stringify(patch.skills) !== JSON.stringify(me.skills)) {
      const known = new Set(SKILLS);
      changes.skills = patch.skills.filter((s) => known.has(s));
      changes.custom_skills = patch.skills.filter((s) => !known.has(s));
    }
    if ("minRate" in patch && patch.minRate !== me.minRate)
      changes.minimum_same_day_rate_gbp = patch.minRate ?? null;
  } else {
    set("postcode", text(patch.postcode), me.postcode);
    set("contact_phone", text(patch.phone), me.phone);
    const v = patch.venue;
    const was = me.venue;
    if (v && was) {
      set("street_address", text(v.address), was.address);
      set("contact_name", text(v.contactName), was.contactName);
      set("contact_position", text(v.contactRole), was.contactRole);
      set("venue_types", v.types, was.types);
      set("cuisines", v.cuisines, was.cuisines);
      set("instagram_handle", text(v.instagram), was.instagram);
    }
  }
  return changes;
}

export async function runLive(
  supabase: SupabaseClient,
  snap: LiveSnapshot,
  action: AppAction,
): Promise<LiveOutcome> {
  const { data } = snap;
  const me = member(data, snap.me.id);
  const ref = () => crypto.randomUUID();
  const shiftOf = (id: string) => {
    const s = data.shifts.find((x) => x.id === id);
    if (!s) throw new Error("This shift no longer exists.");
    return s;
  };
  switch (action.type) {
    case "post": {
      const d = action.draft;
      const days = makeDays(d);
      const result = await call<{ shift_id: string; mode: string; alerted_count?: number }>(
        supabase,
        "post_shift",
        {
        p_team: d.family,
        p_positions: d.roles,
        p_dates: days.map((x) => x.date),
        p_start_time: d.start,
        p_end_time: d.end,
        p_capacity: d.capacity,
        p_rate_pence: Math.round(d.rate * 100),
        p_note: d.note,
        p_to: [...new Set(d.to)],
        p_client_ref: ref(),
        },
      );
      return {
        shift: result.shift_id,
        // A job post nobody hears about: say so, and point to requests.
        success:
          result.mode === "post" && result.alerted_count === 0
            ? "Nobody will be alerted about this job post. Try sending booking requests instead."
            : undefined,
      };
    }
    case "respond": {
      const s = shiftOf(action.shift);
      const dates = action.days?.length ? action.days : availableDates(data, me.id, s);
      const result = await call<{ result: "booked" | "said-yes" }>(supabase, "say_yes", {
        p_shift_id: s.id,
        p_dates: [...new Set(dates)].sort(),
        p_client_ref: ref(),
      });
      const venue = member(data, s.venue).name;
      return {
        success: result.result === "booked" ? `You’re booked at ${venue}.` : `Sent to ${venue}.`,
      };
    }
    case "book": {
      const s = shiftOf(action.shift);
      const r = data.responses.find((x) => x.shift === s.id && x.talent === action.talent);
      const dates = action.days?.length ? action.days : r ? bookableDates(data, s, r) : [];
      await call(supabase, "book_talent", {
        p_shift_id: s.id,
        p_talent_id: action.talent,
        p_dates: [...new Set(dates)].sort(),
        p_client_ref: ref(),
      });
      return {};
    }
    case "withdraw":
      await call(supabase, "withdraw_yes", { p_shift_id: action.shift, p_client_ref: ref() });
      return {};
    case "decline":
      await call(supabase, "decline_request", { p_shift_id: action.shift, p_client_ref: ref() });
      return {};
    case "close":
      await call(supabase, "close_shift", {
        p_shift_id: action.shift,
        p_reason: action.reason,
        p_client_ref: ref(),
      });
      return {};
    case "cancel": {
      const b = data.bookings.find((x) => x.id === action.booking);
      const dates = action.days?.length
        ? action.days
        : b
          ? bookingServices(data, b)
              .filter((d) => d.from > new Date().toISOString())
              .map((d) => d.date)
          : [];
      await call(supabase, "cancel_days", {
        p_booking_id: action.booking,
        p_dates: [...new Set(dates)].sort(),
        p_reason: action.reason,
        p_client_ref: ref(),
      });
      return {};
    }
    case "confirm-day": {
      const b = data.bookings.find((x) => x.id === action.booking);
      const day = b && bookingServices(data, b).find((d) => d.date === action.date);
      const worked = action.status === "worked";
      await call(supabase, "confirm_day", {
        p_booking_id: action.booking,
        p_day_date: action.date,
        p_outcome: action.status,
        p_start_time: worked ? action.start || day?.start || null : null,
        p_end_time: worked ? action.end || day?.end || null : null,
        p_client_ref: ref(),
      });
      return {};
    }
    case "invite":
      if (!action.talents.length) throw new Error("Choose at least one person.");
      await call(supabase, "send_to_more", {
        p_shift_id: action.shift,
        p_talent_ids: action.talents,
        p_client_ref: ref(),
      });
      return {};
    case "message": {
      const body = action.text.trim();
      if (!body) throw new Error("Write a message first.");
      await call(supabase, "send_message", {
        p_conversation_id: action.thread,
        p_body: body,
        p_client_ref: ref(),
      });
      writeDraft(me.id, action.thread, "");
      return {};
    }
    case "open-thread": {
      // Already talking: nothing to start.
      const has = data.threads.some(
        (t) =>
          (t.venue === me.id && t.talent === action.with) ||
          (t.talent === me.id && t.venue === action.with),
      );
      if (!has) await call(supabase, "open_conversation", { p_other_member_id: action.with });
      return { local: has };
    }
    case "availability":
      if (!action.dates.length) throw new Error("Choose at least one date.");
      await call(supabase, "set_availability", {
        p_dates: [...new Set(action.dates)].sort(),
        p_kind: action.kind,
        p_start_time: action.start,
        p_end_time: action.end,
      });
      return {};
    case "profile": {
      const { alert, ...rest } = action.patch;
      if (alert !== undefined && alert !== me.alert && me.side === "talent")
        await call(supabase, "update_my_settings", { p_shift_alerts: alert });
      const changes = profileChanges(me, rest);
      if (Object.keys(changes).length)
        await call(supabase, "update_my_profile", { p_changes: changes });
      return {};
    }
    case "photo": {
      const ext = PHOTO_TYPES[action.file.type];
      if (!ext) throw new Error("Choose a JPEG, PNG or WebP photo.");
      if (action.file.size > 5 * 1024 * 1024) throw new Error("Choose a photo up to 5 MB.");
      const path = `${snap.userId}/${randomName()}.${ext}`;
      await upload(supabase, "member-photos", path, action.file);
      try {
        const result = await call<{ old_path?: string | null }>(supabase, "set_my_photo", {
          p_storage_path: path,
        });
        await remove(supabase, "member-photos", result.old_path);
      } catch (e) {
        await remove(supabase, "member-photos", path);
        throw e;
      }
      return {};
    }
    case "upload-doc": {
      const file = action.blob;
      const code = snap.docCodes[action.doc];
      if (!file || !code) throw new Error("Choose one of the listed documents.");
      const ext = DOC_TYPES[file.type];
      if (!ext) throw new Error("Upload a JPEG, PNG or PDF.");
      if (file.size > 10 * 1024 * 1024) throw new Error("Choose a file up to 10 MB.");
      const path = `${snap.userId}/${code}-${randomName()}.${ext}`;
      await upload(supabase, "member-documents", path, file);
      try {
        const result = await call<{ old_path?: string | null }>(supabase, "save_document", {
          p_doc_type: code,
          p_storage_path: path,
          p_original_filename: file.name,
        });
        await remove(supabase, "member-documents", result.old_path);
      } catch (e) {
        await remove(supabase, "member-documents", path);
        throw e;
      }
      return {};
    }
    case "delete-account":
      await call(supabase, action.cancel ? "keep_my_account" : "request_account_deletion");
      return {};
    case "read-notice": {
      const unread = data.notices.filter(
        (n) => !n.read && (!action.id || n.id === action.id),
      );
      if (!unread.length) return { local: true };
      // Reading is quiet: a failure leaves the dot for next time.
      const { error } = await supabase.rpc("mark_notifications_read", {
        p_ids: action.id ? [Number(action.id)] : null,
        p_target: null,
      });
      return { local: !!error };
    }
    case "read-chat": {
      const upTo = snap.lastSeq[action.thread] ?? 0;
      if (!upTo || (snap.myReads[action.thread] ?? 0) >= upTo) return { local: true };
      const { error } = await supabase.rpc("mark_conversation_read", {
        p_conversation_id: action.thread,
        p_up_to_seq: upTo,
      });
      return { local: !!error };
    }
    case "draft-message":
      writeDraft(me.id, action.thread, action.text);
      return { local: true };
    default:
      // Demo-only actions (preview controls, Setup, texts settings) do
      // nothing in the real app.
      return { local: true };
  }
}
