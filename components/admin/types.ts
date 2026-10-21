/** Shapes returned by the admin-only database functions (app_32, app_13). */

export type Side = "talent" | "venue";

export type MemberListItem = {
  member_id: string;
  side: Side;
  name: string | null;
  email: string | null;
  approved: boolean;
  missing: string[] | null;
  created_at: string;
  approved_at: string | null;
  deletion_requested_at: string | null;
  deleted_at: string | null;
};

export type DocumentStatus = "review" | "verified" | "rejected";

export type MemberDocument = {
  document_id: string;
  doc_type: string;
  label: string;
  storage_path: string;
  original_filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  status: DocumentStatus;
  uploaded_at: string;
  reviewed_at: string | null;
  reject_reason: string | null;
};

export type DocumentListItem = {
  document_id: string;
  member_id: string;
  side: Side;
  member_name: string | null;
  doc_type: string;
  label: string;
  original_filename: string | null;
  storage_path: string;
  content_type: string | null;
  size_bytes: number | null;
  status: DocumentStatus;
  uploaded_at: string;
  reject_reason: string | null;
};

export type MemberDetail = {
  member: {
    id: string;
    user_id: string;
    side: Side;
    approved: boolean;
    approved_at: string | null;
    deletion_requested_at: string | null;
    deleted_at: string | null;
    created_at: string;
  };
  email: string | null;
  profile: Record<string, unknown> | null;
  missing: string[] | null;
  documents: MemberDocument[];
};
