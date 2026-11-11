// One typed function per database function the app calls (the website's
// lib/live/actions.ts and the submit half of lib/onboardingSelfServe.ts).
// Arguments are the database's own names. Refusals the database writes for
// people (P0001) come back as Refusal with the message verbatim; use
// errorMessage() to turn anything thrown into the line to show.
//
// client_ref: functions that take one accept an optional clientRef. Create
// one per tap (newClientRef) and pass the same one again when retrying that
// tap, so the server applies it once. LiveProvider.run does this for you.
import { randomUUID } from 'expo-crypto';
import {
  CONNECTION_ERROR,
  GENERIC_ERROR,
  Refusal,
  SKILLS,
  isRefusal,
  makeDays,
  needsKitchenDocuments,
  talentAnswers,
  validateDatedAvailability,
  venueAnswers,
  availabilityRows,
  type Member,
  type ShiftDraft,
  type TalentIdentity,
  type UploadedFile,
  type VenueIdentity,
} from '@/domain';
import { supabase } from './supabase';
import { writeDraft, clearJoinDraft } from './drafts';
import {
  DOCUMENT_BUCKET,
  DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_BYTES,
  MAX_PHOTO_BYTES,
  PHOTO_BUCKET,
  UPLOAD_COPY,
  compressToJpeg,
  documentPath,
  fileSize,
  photoPath,
  readBytes,
  removeFile,
  uploadFile,
} from './upload';

export function newClientRef() {
  return randomUUID();
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

type RpcError = { code?: string; message?: string };
const NETWORK = /failed to fetch|network request failed|networkerror|load failed|network|fetch/i;

/** True when this looks like no connection rather than a refusal. */
export function isNetworkError(e: unknown) {
  if (isRefusal(e)) return e.message === CONNECTION_ERROR;
  if (e instanceof TypeError) return true;
  const err = e as RpcError | null;
  return !!err && !err.code && NETWORK.test(err.message ?? '');
}
function rpcError(error: RpcError): Error {
  // P0001 is a plain refusal written for people (raise exception '...').
  if (error.code === 'P0001' && error.message) return new Refusal(error.message);
  if (!error.code && NETWORK.test(error.message ?? '')) return new Refusal(CONNECTION_ERROR);
  return new Error(error.message || GENERIC_ERROR);
}
/** The line to show for anything an action threw. */
export function errorMessage(e: unknown): string {
  if (isRefusal(e)) return e.message;
  if (isNetworkError(e)) return CONNECTION_ERROR;
  return GENERIC_ERROR;
}

async function call<T = Record<string, unknown>>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw rpcError(error);
  return (data ?? {}) as T;
}
const sorted = (dates: string[]) => [...new Set(dates)].sort();
const ref = (clientRef?: string) => clientRef ?? newClientRef();
// A domain rule's message (makeDays and friends throw plain Errors) is shown as is.
function rule<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    throw new Refusal((e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Shifts, answers and bookings
// ---------------------------------------------------------------------------

export type PostShiftResult = { shift_id: string; mode: 'post' | 'request'; in_position_count?: number; alerted_count?: number };
/** post_shift: a job post (draft.to empty) or a booking request to draft.to. */
export async function postShift(draft: ShiftDraft, clientRef?: string) {
  const days = rule(() => makeDays(draft));
  return call<PostShiftResult>('post_shift', {
    p_team: draft.family,
    p_positions: draft.roles,
    p_dates: days.map((x) => x.date),
    p_start_time: draft.start,
    p_end_time: draft.end,
    p_capacity: draft.capacity,
    p_rate_pence: Math.round(draft.rate * 100),
    p_note: draft.note,
    p_to: [...new Set(draft.to)],
    p_client_ref: ref(clientRef),
  });
}
/** The website's success line after posting; undefined means use the screen's own. */
export function postShiftMessage(r: PostShiftResult) {
  return r.mode === 'post' && r.alerted_count === 0
    ? 'Nobody will be alerted about this job post. Try sending booking requests instead.'
    : undefined;
}
/** send_to_more: more people for an open shift. */
export async function sendToMore(shiftId: string, talentIds: string[], clientRef?: string) {
  if (!talentIds.length) throw new Refusal('Choose at least one person.');
  return call('send_to_more', { p_shift_id: shiftId, p_talent_ids: talentIds, p_client_ref: ref(clientRef) });
}
export type SayYesResult = { result: 'booked' | 'said-yes'; booking_id: string | null };
/** say_yes: talent says yes to these dates (web default: availableDates(data, me, shift)). */
export async function sayYes(shiftId: string, dates: string[], clientRef?: string) {
  return call<SayYesResult>('say_yes', { p_shift_id: shiftId, p_dates: sorted(dates), p_client_ref: ref(clientRef) });
}
/** The website's success line after say_yes. */
export function sayYesMessage(r: SayYesResult, venueName: string) {
  return r.result === 'booked' ? `You’re booked at ${venueName}.` : `Sent to ${venueName}.`;
}
export async function declineRequest(shiftId: string, clientRef?: string) {
  return call('decline_request', { p_shift_id: shiftId, p_client_ref: ref(clientRef) });
}
export async function withdrawYes(shiftId: string, clientRef?: string) {
  return call('withdraw_yes', { p_shift_id: shiftId, p_client_ref: ref(clientRef) });
}
export async function closeShift(shiftId: string, reason: string, clientRef?: string) {
  return call('close_shift', { p_shift_id: shiftId, p_reason: reason, p_client_ref: ref(clientRef) });
}
/** book_talent: the venue books these dates (web default: bookableDates(data, shift, response)). */
export async function bookTalent(shiftId: string, talentId: string, dates: string[], clientRef?: string) {
  return call<{ booking_id: string }>('book_talent', {
    p_shift_id: shiftId,
    p_talent_id: talentId,
    p_dates: sorted(dates),
    p_client_ref: ref(clientRef),
  });
}
/** cancel_days: either side cancels days not yet started (web default: every future day). */
export async function cancelDays(bookingId: string, dates: string[], reason: string, clientRef?: string) {
  return call('cancel_days', {
    p_booking_id: bookingId,
    p_dates: sorted(dates),
    p_reason: reason,
    p_client_ref: ref(clientRef),
  });
}
/** confirm_day: the venue records a finished day. start/end only for "worked" (default: scheduled hours). */
export async function confirmDay(
  bookingId: string,
  date: string,
  outcome: 'worked' | 'no-show',
  hours?: { start?: string | null; end?: string | null },
  clientRef?: string,
) {
  const worked = outcome === 'worked';
  return call('confirm_day', {
    p_booking_id: bookingId,
    p_day_date: date,
    p_outcome: outcome,
    p_start_time: worked ? hours?.start || null : null,
    p_end_time: worked ? hours?.end || null : null,
    p_client_ref: ref(clientRef),
  });
}

// ---------------------------------------------------------------------------
// Availability, messages, reading
// ---------------------------------------------------------------------------

/** set_availability: free (with hours; 00:00–00:00 is all day) or not-free for these dates. */
export async function setAvailability(dates: string[], kind: 'free' | 'not-free', start: string, end: string) {
  if (!dates.length) throw new Refusal('Choose at least one date.');
  return call<{ saved: number }>('set_availability', {
    p_dates: sorted(dates),
    p_kind: kind,
    p_start_time: start,
    p_end_time: end,
  });
}
/** open_conversation: starts (or finds) the one conversation with another member. */
export async function openConversation(otherMemberId: string) {
  return call<{ conversation_id: string }>('open_conversation', { p_other_member_id: otherMemberId });
}
/** send_message. Clears this conversation's draft on success. */
export async function sendMessage(memberId: string, conversationId: string, text: string, clientRef?: string) {
  const body = text.trim();
  if (!body) throw new Refusal('Write a message first.');
  const result = await call<{ message_id: number; seq: number }>('send_message', {
    p_conversation_id: conversationId,
    p_body: body,
    p_client_ref: ref(clientRef),
  });
  writeDraft(memberId, conversationId, '');
  return result;
}
/** Quiet: true when saved. A failure leaves the unread dot for next time. */
export async function markConversationRead(conversationId: string, upToSeq: number) {
  if (!upToSeq) return false;
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
    p_up_to_seq: upToSeq,
  });
  return !error;
}
/** Quiet: ids (notice ids as strings), a target ("shift/<id>", "booking/<id>"), or neither for all. */
export async function markNotificationsRead(opts: { ids?: string[]; target?: string } = {}) {
  const { error } = await supabase.rpc('mark_notifications_read', {
    p_ids: opts.ids?.length ? opts.ids.map(Number) : null,
    p_target: opts.target ?? null,
  });
  return !error;
}

// ---------------------------------------------------------------------------
// Profile and account
// ---------------------------------------------------------------------------

/** The fields of a profile edit, in the database's words; only what changed. */
export function profileChanges(me: Member, patch: Partial<Member>) {
  const changes: Record<string, unknown> = {};
  const set = (key: string, next: unknown, now: unknown) => {
    if (next !== undefined && JSON.stringify(next) !== JSON.stringify(now)) changes[key] = next;
  };
  const text = (v: string | undefined) => (v === undefined ? undefined : v.trim());
  set(me.side === 'talent' ? 'full_name' : 'name', text(patch.name), me.name);
  set('bio', text(patch.bio), me.bio);
  if (me.side === 'talent') {
    set('home_postcode', text(patch.postcode), me.postcode);
    set('mobile_number', text(patch.phone), me.phone);
    set('positions', patch.roles, me.roles);
    if (patch.skills && JSON.stringify(patch.skills) !== JSON.stringify(me.skills)) {
      const known = new Set(SKILLS);
      changes.skills = patch.skills.filter((s) => known.has(s));
      changes.custom_skills = patch.skills.filter((s) => !known.has(s));
    }
    if ('minRate' in patch && patch.minRate !== me.minRate) changes.minimum_same_day_rate_gbp = patch.minRate ?? null;
  } else {
    set('postcode', text(patch.postcode), me.postcode);
    set('contact_phone', text(patch.phone), me.phone);
    const v = patch.venue;
    const was = me.venue;
    if (v && was) {
      set('street_address', text(v.address), was.address);
      set('contact_name', text(v.contactName), was.contactName);
      set('contact_position', text(v.contactRole), was.contactRole);
      set('venue_types', v.types, was.types);
      set('cuisines', v.cuisines, was.cuisines);
      set('instagram_handle', text(v.instagram), was.instagram);
    }
  }
  return changes;
}
export async function updateMyProfile(changes: Record<string, unknown>) {
  return call('update_my_profile', { p_changes: changes });
}
export async function updateMySettings(shiftAlerts: 'all' | 'soon' | 'off') {
  return call('update_my_settings', { p_shift_alerts: shiftAlerts });
}
/** The website's "profile" action: shift alerts (talent) then only the changed fields. */
export async function saveProfile(me: Member, patch: Partial<Member>) {
  const { alert, ...rest } = patch;
  if (alert !== undefined && alert !== me.alert && me.side === 'talent') await updateMySettings(alert);
  const changes = profileChanges(me, rest);
  if (Object.keys(changes).length) await updateMyProfile(changes);
}

/**
 * A new profile photo from a local image uri (already cropped 4:5): compress
 * to ≈200 KB JPEG, upload to member-photos/<uid>/<uuid>.jpg, set_my_photo,
 * then remove the old file (or the new one if saving failed).
 */
export async function setMyPhoto(userId: string, uri: string, mimeType?: string) {
  if (mimeType && !mimeType.startsWith('image/')) throw new Refusal(UPLOAD_COPY.photoType);
  let photo;
  try {
    photo = await compressToJpeg(uri);
  } catch {
    throw new Refusal(UPLOAD_COPY.photoType);
  }
  if (photo.size > MAX_PHOTO_BYTES) throw new Refusal(UPLOAD_COPY.photoTooBig);
  const path = photoPath(userId);
  await uploadFile(PHOTO_BUCKET, path, photo.uri, 'image/jpeg');
  try {
    const result = await call<{ old_path?: string | null }>('set_my_photo', { p_storage_path: path });
    await removeFile(PHOTO_BUCKET, result.old_path);
  } catch (e) {
    await removeFile(PHOTO_BUCKET, path);
    throw e;
  }
}

/**
 * A document from the account screen: JPEG, PNG or PDF up to 10 MB, uploaded
 * as is to member-documents/<uid>/<code>-<uuid>.<ext>, then save_document,
 * then the replaced file (or the stray new one) is removed.
 * `code` is snapshot.docCodes[label].
 */
export async function saveDocument(userId: string, code: string | undefined, file: UploadedFile) {
  if (!code) throw new Refusal('Choose one of the listed documents.');
  const ext = DOCUMENT_EXTENSIONS[file.mimeType];
  if (!ext) throw new Refusal(UPLOAD_COPY.documentType);
  const size = file.size ?? fileSize(file.uri) ?? 0;
  if (size > MAX_DOCUMENT_BYTES) throw new Refusal(UPLOAD_COPY.fileTooBig);
  const path = documentPath(userId, code, file.mimeType);
  await uploadFile(DOCUMENT_BUCKET, path, file.uri, file.mimeType);
  try {
    const result = await call<{ document_id: string; old_path?: string | null }>('save_document', {
      p_doc_type: code,
      p_storage_path: path,
      p_original_filename: file.name,
    });
    await removeFile(DOCUMENT_BUCKET, result.old_path);
    return result;
  } catch (e) {
    await removeFile(DOCUMENT_BUCKET, path);
    throw e;
  }
}
export async function requestAccountDeletion() {
  return call<{ requested_at: string }>('request_account_deletion');
}
export async function keepMyAccount() {
  return call('keep_my_account');
}

// ---------------------------------------------------------------------------
// Self-serve onboarding: create_my_profile
// ---------------------------------------------------------------------------

export type SelfServeResult = { ok: true } | { ok: false; message: string };
const ONBOARDING_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
// Paths already uploaded in this app session, so a retry doesn't upload the
// same document again (the folder holds at most 10 files).
const uploadedDocuments = new Map<string, string>();
function randomPart() {
  return randomUUID().replace(/-/g, '').slice(0, 16);
}
function onboardingStorageRefusal(message: string): Refusal {
  const m = message.toLowerCase();
  if (m.includes('size') || m.includes('mime') || m.includes('type')) return new Refusal(UPLOAD_COPY.onboardingFile);
  if (m.includes('fetch') || m.includes('network')) return new Refusal(CONNECTION_ERROR);
  return new Refusal(UPLOAD_COPY.onboardingUnfinished);
}
async function uploadOnboardingDocument(userId: string, docType: string, file: UploadedFile): Promise<string> {
  const cacheKey = `${userId}:${docType}:${file.uri}:${file.size ?? ''}`;
  const cached = uploadedDocuments.get(cacheKey);
  if (cached) return cached;
  // Images are compressed like photos; PDFs go as they are.
  let uri = file.uri;
  let type = file.mimeType;
  let size = file.size ?? fileSize(uri) ?? 0;
  if (type.startsWith('image/')) {
    try {
      const jpeg = await compressToJpeg(uri);
      uri = jpeg.uri;
      type = 'image/jpeg';
      size = jpeg.size;
    } catch {
      throw new Refusal(UPLOAD_COPY.onboardingUnfinished);
    }
  }
  if (!ONBOARDING_TYPES.has(type) || size > MAX_DOCUMENT_BYTES || size < 1) throw new Refusal(UPLOAD_COPY.onboardingFile);
  const ext = type === 'application/pdf' ? 'pdf' : type === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${docType}-${randomPart()}.${ext}`;
  let body: ArrayBuffer;
  try {
    body = await readBytes(uri);
  } catch {
    throw new Refusal(UPLOAD_COPY.onboardingUnfinished);
  }
  const { error } = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, body, { contentType: type });
  if (error) throw onboardingStorageRefusal(error.message ?? '');
  uploadedDocuments.set(cacheKey, path);
  return path;
}
/** Best effort: if the photo fails, the member adds one later from Profile. */
async function uploadOnboardingPhoto(userId: string, uri: string) {
  try {
    const photo = await compressToJpeg(uri);
    const path = `${userId}/${randomPart()}.jpg`;
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, await readBytes(photo.uri), { contentType: 'image/jpeg' });
    if (error) throw error;
    const { error: rpcErr } = await supabase.rpc('set_my_photo', { p_storage_path: path });
    if (rpcErr) {
      // Remove the stray file so it doesn't count against the two-file cap.
      await removeFile(PHOTO_BUCKET, path);
      throw rpcErr;
    }
  } catch (err) {
    console.warn("Couldn't save the profile photo", err);
  }
}
function toResult(err: unknown): SelfServeResult {
  if (isRefusal(err)) return { ok: false, message: err.message };
  if (err instanceof TypeError) return { ok: false, message: CONNECTION_ERROR };
  return { ok: false, message: GENERIC_ERROR };
}
async function createProfile(
  side: 'talent' | 'venue',
  userId: string,
  answers: Record<string, unknown>,
  documents: { kind: string; file: UploadedFile }[],
  availability: { day_date: string; kind: string; start_time: string; end_time: string }[],
  photo: string | null,
): Promise<SelfServeResult> {
  try {
    const files = [];
    for (const doc of documents) {
      const storage_path = await uploadOnboardingDocument(userId, doc.kind, doc.file);
      files.push({ kind: doc.kind, storage_path, original_filename: doc.file.name });
    }
    const { error } = await supabase.rpc('create_my_profile', {
      p_side: side,
      p_answers: answers,
      p_files: files,
      p_availability: availability,
    });
    if (error) {
      // Same as the website: P0001 verbatim, no connection, else a retry line.
      if (error.code === 'P0001' && error.message) throw new Refusal(error.message);
      if (!error.code && NETWORK.test(error.message ?? '')) throw new Refusal(CONNECTION_ERROR);
      throw new Refusal(GENERIC_ERROR);
    }
    if (photo) await uploadOnboardingPhoto(userId, photo);
    await clearJoinDraft(userId);
    return { ok: true };
  } catch (err) {
    if (!isRefusal(err)) console.warn('Self-serve onboarding failed', err);
    return toResult(err);
  }
}
/** create_my_profile for talent: documents, answers, dated availability, then the photo. Clears the join draft on success. */
export async function submitTalentSelfServe(userId: string, identity: TalentIdentity): Promise<SelfServeResult> {
  try {
    const availabilityError = validateDatedAvailability(identity.datedAvailability ?? []);
    if (availabilityError) throw new Refusal(availabilityError);
    const answers = talentAnswers(identity);
    const documents: { kind: string; file: UploadedFile }[] = [];
    if (identity.rightToWork) documents.push({ kind: 'right-to-work', file: identity.rightToWork });
    if (identity.foodSafetyCert && needsKitchenDocuments(identity.positions))
      documents.push({ kind: 'food-hygiene', file: identity.foodSafetyCert });
    if (identity.cv) documents.push({ kind: 'cv', file: identity.cv });
    return await createProfile('talent', userId, answers, documents, availabilityRows(identity.datedAvailability ?? []), identity.photo);
  } catch (err) {
    return toResult(err);
  }
}
/** create_my_profile for a venue, then the photo. Clears the join draft on success. */
export async function submitVenueSelfServe(userId: string, identity: VenueIdentity): Promise<SelfServeResult> {
  try {
    return await createProfile('venue', userId, venueAnswers(identity), [], [], identity.photo);
  } catch (err) {
    return toResult(err);
  }
}
