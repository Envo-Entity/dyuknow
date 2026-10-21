// Self-serve onboarding at /join: the signed-in person fills the same
// TalentOnboarding / VenueOnboarding steps the owner uses at /admin/onboarding,
// but their answers go to the app's own tables through create_my_profile and
// their files into member-documents / member-photos. /admin/onboarding keeps
// lib/onboardingSubmit.ts and the onboarding archive, untouched.

import { createClient } from "@/utils/supabase/client";
import { dataUrlToBlob } from "@/lib/image";
import { CHEF_KNOWN_FOR, FOH_KNOWN_FOR, TEAM_AGREEMENTS, VENUE_AGREEMENTS } from "@/lib/data";
import { TEAMS } from "@/lib/catalogue";
import { teamsFromLegacyRoles, validateDatedAvailability } from "@/lib/onboardingModel";
import type { TalentIdentity, UploadedFile, VenueIdentity } from "@/lib/types";

export type Side = "talent" | "venue";
export type SelfServeResult = { ok: true } | { ok: false; message: string };

const GENERIC_ERROR = "Couldn’t save. Try again.";
const CONNECTION_ERROR = "Couldn’t save. Check your connection and try again.";
const FILE_ERROR = "Upload a photo or PDF up to 10 MB.";
const DOCUMENT_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const KITCHEN_POSITIONS = new Set<string>([...TEAMS.Kitchen, ...TEAMS.Pastry]);
const KNOWN_FOR = new Set<string>([...CHEF_KNOWN_FOR, ...FOH_KNOWN_FOR]);

/** A refusal we can show as it is. Anything else becomes a plain retry line. */
class Refusal extends Error {}

/** Food hygiene suits talent with at least one Kitchen or Pastry position (document_types.applies_to = kitchen). */
export function needsKitchenDocuments(positions: readonly string[]): boolean {
  return positions.some((p) => KITCHEN_POSITIONS.has(p));
}

// ---------------------------------------------------------------------------
// Answers: TalentIdentity / VenueIdentity -> talents / venues column names
// ---------------------------------------------------------------------------

function text(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function pounds(value: string, label: string): number | null {
  const trimmed = value.trim().replace(/^£/, "");
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) throw new Refusal(`Enter the ${label} in pounds, like 20 or 20.50.`);
  return Number(trimmed);
}

function wholeNumber(value: string, label: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) throw new Refusal(`Enter the ${label} as a whole number.`);
  return Number(trimmed);
}

export function talentAnswers(identity: TalentIdentity): Record<string, unknown> {
  const knownFor = identity.knownFor.filter((t) => KNOWN_FOR.has(t));
  const customKnownFor = identity.knownFor.filter((t) => !KNOWN_FOR.has(t));
  return {
    full_name: text(identity.name),
    mobile_number: text(identity.mobile),
    home_postcode: text(identity.postcode),
    date_of_birth: text(identity.dob),
    category: text(identity.category),
    positions: identity.positions,
    skills: identity.skills,
    custom_skills: identity.customSkills ?? [],
    known_for: knownFor,
    custom_known_for: customKnownFor,
    years_band: text(identity.yearsBand),
    employment_history: identity.employers.filter((e) => e.restaurant.trim() || e.position.trim() || e.dates.trim()),
    bio: text(identity.bio),
    preferred_shifts: identity.preferredShifts,
    max_travel: text(identity.maxTravel),
    preferred_areas: identity.preferredAreas,
    preferred_hourly_rate: text(identity.preferredRate),
    minimum_same_day_rate_gbp: pounds(identity.minSameDayRate, "minimum same-day rate"),
    shift_alerts: identity.shiftAlerts ?? "all",
    agreed_turn_up_on_time: identity.agreedCommunity.includes(TEAM_AGREEMENTS[0]),
    agreed_treat_venues_with_respect: identity.agreedCommunity.includes(TEAM_AGREEMENTS[1]),
    agreed_give_notice_if_cancelling: identity.agreedCommunity.includes(TEAM_AGREEMENTS[2]),
    agreed_represent_professionally: identity.agreedCommunity.includes(TEAM_AGREEMENTS[3]),
  };
}

export function venueAnswers(identity: VenueIdentity): Record<string, unknown> {
  return {
    business_name: text(identity.name),
    trading_name: text(identity.tradingName),
    registered_company: text(identity.registeredCompany),
    website: text(identity.website),
    instagram_handle: text(identity.instagram),
    contact_name: text(identity.contactName),
    contact_position: text(identity.contactPosition),
    contact_phone: text(identity.contactPhone),
    contact_email: text(identity.contactEmail),
    street_address: text(identity.address),
    postcode: text(identity.postcode),
    venue_types: identity.venueType,
    cuisines: identity.cuisine,
    covers_band: text(identity.covers),
    average_team_size: wholeNumber(identity.teamSize, "team size"),
    average_team_vacancies_per_week: wholeNumber(identity.teamVacanciesPerWeek, "vacancies per week"),
    roles_needed: identity.needs,
    teams_needed: identity.teamsNeeded ?? teamsFromLegacyRoles(identity.needs),
    typical_shifts: identity.typicalShifts,
    typical_notice: identity.typicalNotice,
    dress_code: text(identity.dressCode),
    uniform_provided: identity.uniformProvided,
    staff_meal: identity.staffMeal,
    typical_hourly_rate_chef_gbp: pounds(identity.rateChef, "chef rate"),
    typical_hourly_rate_foh_gbp: pounds(identity.rateFoh, "front-of-house rate"),
    bio: text(identity.bio),
    known_for: identity.knownFor,
    agreed_pay_fairly: identity.agreedCommunity.includes(VENUE_AGREEMENTS[0]),
    agreed_treat_team_like_our_own: identity.agreedCommunity.includes(VENUE_AGREEMENTS[1]),
    agreed_provide_clear_brief: identity.agreedCommunity.includes(VENUE_AGREEMENTS[2]),
    agreed_rate_honestly: identity.agreedCommunity.includes(VENUE_AGREEMENTS[3]),
  };
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

type Supabase = ReturnType<typeof createClient>;

function randomPart() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function extensionFor(mime: string) {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

// Paths already uploaded in this page session, so a retry doesn't upload the
// same document again (the folder holds at most 10 files).
const uploadedDocuments = new Map<string, string>();

async function uploadDocument(supabase: Supabase, userId: string, docType: string, file: UploadedFile): Promise<string> {
  const cacheKey = `${userId}:${docType}:${file.name}:${file.dataUrl.length}:${file.dataUrl.slice(-64)}`;
  const cached = uploadedDocuments.get(cacheKey);
  if (cached) return cached;

  let blob: Blob;
  try {
    blob = dataUrlToBlob(file.dataUrl);
  } catch {
    throw new Refusal("That upload didn’t finish. Add the file again.");
  }
  if (!DOCUMENT_TYPES.has(blob.type) || blob.size > MAX_DOCUMENT_BYTES || blob.size < 1) throw new Refusal(FILE_ERROR);

  const path = `${userId}/${docType}-${randomPart()}.${extensionFor(blob.type)}`;
  const { error } = await supabase.storage.from("member-documents").upload(path, blob, { contentType: blob.type });
  if (error) throw storageRefusal(error);
  uploadedDocuments.set(cacheKey, path);
  return path;
}

function storageRefusal(error: { message?: string; statusCode?: string | number }): Error {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("size") || message.includes("mime") || message.includes("type")) return new Refusal(FILE_ERROR);
  if (message.includes("fetch") || message.includes("network")) return new Refusal(CONNECTION_ERROR);
  return new Refusal("That upload didn’t finish. Add the file again.");
}

/** Best effort: if the photo fails, the member adds one later from Profile. */
async function uploadPhoto(supabase: Supabase, userId: string, dataUrl: string) {
  try {
    const blob = dataUrlToBlob(dataUrl);
    const path = `${userId}/${randomPart()}.${extensionFor(blob.type)}`;
    const { error } = await supabase.storage.from("member-photos").upload(path, blob, { contentType: blob.type });
    if (error) throw error;
    const { error: rpcError } = await supabase.rpc("set_my_photo", { p_storage_path: path });
    if (rpcError) {
      // Remove the stray file so it doesn't count against the two-file cap.
      await supabase.storage.from("member-photos").remove([path]);
      throw rpcError;
    }
  } catch (err) {
    console.error("Couldn't save the profile photo", err);
  }
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

type PostgrestLikeError = { code?: string; message?: string };

function rpcRefusal(error: PostgrestLikeError): Error {
  // P0001 is a plain refusal written for people (raise exception '...').
  if (error.code === "P0001" && error.message) return new Refusal(error.message);
  if (!error.code && /fetch|network/i.test(error.message ?? "")) return new Refusal(CONNECTION_ERROR);
  return new Refusal(GENERIC_ERROR);
}

function toResult(err: unknown): SelfServeResult {
  if (err instanceof Refusal) return { ok: false, message: err.message };
  if (err instanceof TypeError) return { ok: false, message: CONNECTION_ERROR };
  return { ok: false, message: GENERIC_ERROR };
}

async function createProfile(
  side: Side,
  userId: string,
  answers: Record<string, unknown>,
  documents: { kind: string; file: UploadedFile }[],
  availability: { day_date: string; kind: string; start_time: string; end_time: string }[],
  photo: string | null
): Promise<SelfServeResult> {
  const supabase = createClient();
  try {
    const files = [];
    for (const doc of documents) {
      const storage_path = await uploadDocument(supabase, userId, doc.kind, doc.file);
      files.push({ kind: doc.kind, storage_path, original_filename: doc.file.name });
    }
    const { error } = await supabase.rpc("create_my_profile", {
      p_side: side,
      p_answers: answers,
      p_files: files,
      p_availability: availability,
    });
    if (error) throw rpcRefusal(error);
    if (photo) await uploadPhoto(supabase, userId, photo);
    clearJoinDraft(userId);
    return { ok: true };
  } catch (err) {
    if (!(err instanceof Refusal)) console.error("Self-serve onboarding failed", err);
    return toResult(err);
  }
}

export async function submitTalentSelfServe(userId: string, identity: TalentIdentity): Promise<SelfServeResult> {
  try {
    const availabilityError = validateDatedAvailability(identity.datedAvailability ?? []);
    if (availabilityError) throw new Refusal(availabilityError);
    const answers = talentAnswers(identity);
    const documents: { kind: string; file: UploadedFile }[] = [];
    if (identity.rightToWork) documents.push({ kind: "right-to-work", file: identity.rightToWork });
    if (identity.foodSafetyCert && needsKitchenDocuments(identity.positions)) documents.push({ kind: "food-hygiene", file: identity.foodSafetyCert });
    if (identity.cv) documents.push({ kind: "cv", file: identity.cv });
    const availability = (identity.datedAvailability ?? []).map((a) => ({ day_date: a.date, kind: a.kind, start_time: a.start, end_time: a.end }));
    return await createProfile("talent", userId, answers, documents, availability, identity.photo);
  } catch (err) {
    return toResult(err);
  }
}

export async function submitVenueSelfServe(userId: string, identity: VenueIdentity): Promise<SelfServeResult> {
  try {
    const answers = venueAnswers(identity);
    return await createProfile("venue", userId, answers, [], [], identity.photo);
  } catch (err) {
    return toResult(err);
  }
}

// ---------------------------------------------------------------------------
// Drafts: one per login, in this browser only
// ---------------------------------------------------------------------------

export interface JoinDraft {
  side: Side | null;
  talent: { identity: TalentIdentity; step: number } | null;
  venue: { identity: VenueIdentity; step: number } | null;
}

const EMPTY_DRAFT: JoinDraft = { side: null, talent: null, venue: null };

function draftKey(userId: string) {
  return `dyuknow.join-draft.${userId}`;
}

export function loadJoinDraft(userId: string): JoinDraft {
  try {
    const raw = window.localStorage.getItem(draftKey(userId));
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<JoinDraft>;
    return {
      side: parsed.side === "talent" || parsed.side === "venue" ? parsed.side : null,
      talent: parsed.talent ?? null,
      venue: parsed.venue ?? null,
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

function withoutFiles(draft: JoinDraft): JoinDraft {
  return {
    side: draft.side,
    talent: draft.talent && {
      ...draft.talent,
      identity: { ...draft.talent.identity, photo: null, rightToWork: null, foodSafetyCert: null, cv: null },
    },
    venue: draft.venue && { ...draft.venue, identity: { ...draft.venue.identity, photo: null } },
  };
}

export function saveJoinDraft(userId: string, draft: JoinDraft) {
  try {
    window.localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  } catch {
    // Too big for local storage (a large PDF): keep the answers, drop the files.
    try {
      window.localStorage.setItem(draftKey(userId), JSON.stringify(withoutFiles(draft)));
    } catch {
      // Storage unavailable (private window): the draft lives only in memory.
    }
  }
}

export function updateJoinDraft(userId: string, patch: Partial<JoinDraft>) {
  saveJoinDraft(userId, { ...loadJoinDraft(userId), ...patch });
}

export function clearJoinDraft(userId: string) {
  try {
    window.localStorage.removeItem(draftKey(userId));
  } catch {
    // Nothing to clear.
  }
}
