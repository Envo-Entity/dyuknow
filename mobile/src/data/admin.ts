// The Dyuknow team's functions (the website's components/admin): who's waiting
// for approval, documents to check, every member, and the two decisions
// (approve, review a document). Same RPCs and argument names as the web; the
// database checks every call is from an admin. Refusals (P0001) come back as
// Refusal with the message verbatim, as in actions.ts.
import { CONNECTION_ERROR, GENERIC_ERROR, Refusal, isRefusal } from '@/domain';

import { DOCUMENT_BUCKET, supabase } from './supabase';

export type AdminSide = 'talent' | 'venue';
export type AdminDocumentStatus = 'review' | 'verified' | 'rejected';

export type AdminMemberListItem = {
  member_id: string;
  side: AdminSide;
  name: string | null;
  email: string | null;
  approved: boolean;
  missing: string[] | null;
  created_at: string;
  approved_at: string | null;
  deletion_requested_at: string | null;
  deleted_at: string | null;
};

export type AdminMemberDocument = {
  document_id: string;
  doc_type: string;
  label: string;
  storage_path: string;
  original_filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  status: AdminDocumentStatus;
  uploaded_at: string;
  reviewed_at: string | null;
  reject_reason: string | null;
};

export type AdminDocumentListItem = {
  document_id: string;
  member_id: string;
  side: AdminSide;
  member_name: string | null;
  doc_type: string;
  label: string;
  original_filename: string | null;
  storage_path: string;
  content_type: string | null;
  size_bytes: number | null;
  status: AdminDocumentStatus;
  uploaded_at: string;
  reject_reason: string | null;
};

export type AdminMemberDetail = {
  member: {
    id: string;
    user_id: string;
    side: AdminSide;
    approved: boolean;
    approved_at: string | null;
    deletion_requested_at: string | null;
    deleted_at: string | null;
    created_at: string;
  };
  email: string | null;
  profile: Record<string, unknown> | null;
  missing: string[] | null;
  documents: AdminMemberDocument[];
};

export type AdminMemberFilter = 'waiting' | 'approved' | 'deletion-requested' | 'all';
export type AdminDocumentFilter = 'review' | 'verified' | 'rejected' | 'all';

// ---------------------------------------------------------------------------
// Errors: actions.ts's mapping, plus the web admin's "not ready" line for a
// function the database doesn't have yet.
// ---------------------------------------------------------------------------

type RpcError = { code?: string; message?: string };
const NETWORK = /failed to fetch|network request failed|networkerror|load failed|network|fetch/i;
const NOT_READY = 'This part of the admin page isn’t ready yet. Try again later.';
/** A list or a member that couldn't be read (web format.ts). */
export const ADMIN_LOAD_OFFLINE = 'Couldn’t reach Dyuknow. Check your connection and try again.';
export const ADMIN_LOAD_ERROR = 'Something went wrong. Try again.';

function rpcError(error: RpcError): Error {
  if (error.code === 'P0001' && error.message) return new Refusal(error.message);
  if (error.code === 'PGRST202' || error.code === '42883') return new Refusal(NOT_READY);
  if (!error.code && NETWORK.test(error.message ?? '')) return new Refusal(CONNECTION_ERROR);
  return new Error(error.message || GENERIC_ERROR);
}

/** The line to show when a read failed (a refusal verbatim, else a plain line). */
export function adminLoadMessage(e: unknown): string {
  if (isRefusal(e)) return e.message === CONNECTION_ERROR ? ADMIN_LOAD_OFFLINE : e.message;
  if (e instanceof TypeError) return ADMIN_LOAD_OFFLINE;
  const err = e as RpcError | null;
  if (err && !err.code && NETWORK.test(err.message ?? '')) return ADMIN_LOAD_OFFLINE;
  return ADMIN_LOAD_ERROR;
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw rpcError(error);
  return data as T;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** am_i_admin: true only for a Dyuknow admin login. */
export async function amIAdmin(): Promise<boolean> {
  const data = await call<{ is_admin?: boolean } | null>('am_i_admin');
  return Boolean(data && typeof data === 'object' && data.is_admin);
}

/** admin_list_members: up to 200; 'waiting' oldest first, the rest newest first. */
export async function adminListMembers(status: AdminMemberFilter = 'all'): Promise<AdminMemberListItem[]> {
  return (await call<AdminMemberListItem[] | null>('admin_list_members', { p_status: status })) ?? [];
}

/** admin_get_member: everything about one member. */
export async function adminGetMember(memberId: string): Promise<AdminMemberDetail> {
  const data = await call<AdminMemberDetail | null>('admin_get_member', { p_member_id: memberId });
  if (!data) throw new Refusal('That member can’t be found.');
  return { ...data, documents: data.documents ?? [] };
}

/** admin_list_documents: up to 200, oldest upload first. */
export async function adminListDocuments(status: AdminDocumentFilter = 'review'): Promise<AdminDocumentListItem[]> {
  return (await call<AdminDocumentListItem[] | null>('admin_list_documents', { p_status: status })) ?? [];
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

/**
 * admin_set_approval: approve (refused with "This profile is missing: …."
 * while anything is missing), or take approval away, which ends what they had
 * waiting. The note goes to the admin log only.
 */
export async function adminSetApproval(memberId: string, approved: boolean, note?: string | null) {
  const trimmed = note?.trim();
  return call<Record<string, unknown>>('admin_set_approval', {
    p_member_id: memberId,
    p_approved: approved,
    p_note: trimmed ? trimmed : null,
  });
}

/** admin_review_document: verify, or reject with the reason the member sees (required). */
export async function adminReviewDocument(documentId: string, verdict: 'verified' | 'rejected', reason?: string | null) {
  const trimmed = reason?.trim() ?? '';
  if (verdict === 'rejected' && !trimmed) throw new Refusal('Add a reason.');
  return call<Record<string, unknown>>('admin_review_document', {
    p_document_id: documentId,
    p_verdict: verdict,
    p_reason: verdict === 'rejected' ? trimmed : null,
  });
}

/** A link to the file that works for 300 seconds (web DocumentCard). */
export async function adminDocumentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(storagePath, 300);
  if (error || !data?.signedUrl) {
    if (error && NETWORK.test(error.message ?? '')) throw new Refusal(CONNECTION_ERROR);
    throw new Refusal(error?.message ? `Couldn’t open the file: ${error.message}` : 'Couldn’t open the file.');
  }
  return data.signedUrl;
}
