// Row shapes the live app reads from Supabase under row-level security.
// Columns as in docs/backend/03-tables.md; only the ones the app uses.
export type MemberRow = {
  id: string;
  user_id: string;
  side: "talent" | "venue";
  approved: boolean;
  deletion_requested_at: string | null;
  deleted_at: string | null;
};
export type TalentRow = {
  member_id: string;
  full_name: string | null;
  mobile_number: string | null;
  home_postcode: string | null;
  home_area: string | null;
  photo_path: string | null;
  positions: string[];
  skills: string[];
  custom_skills: string[];
  bio: string | null;
  minimum_same_day_rate_gbp: number | string | null;
  shift_alerts: "all" | "soon" | "off";
  area_name: string | null;
};
export type VenueRow = {
  member_id: string;
  display_name: string | null;
  trading_name: string | null;
  business_name: string | null;
  instagram_handle: string | null;
  contact_name: string | null;
  contact_position: string | null;
  contact_phone: string | null;
  street_address: string | null;
  postcode: string | null;
  area: string | null;
  photo_path: string | null;
  venue_types: string[];
  cuisines: string[];
  bio: string | null;
  area_name: string | null;
};
export type TalentCardRow = {
  member_id: string;
  full_name: string | null;
  photo_path: string | null;
  positions: string[] | null;
  skills: string[] | null;
  custom_skills: string[] | null;
  home_area: string | null;
  bio: string | null;
  minimum_pay_pence: number | null;
  verified_documents: string[] | null;
  active: boolean;
  area_name: string | null;
};
export type VenueCardRow = {
  member_id: string;
  display_name: string | null;
  photo_path: string | null;
  area: string | null;
  area_name: string | null;
  bio: string | null;
  venue_types: string[] | null;
  cuisines: string[] | null;
  instagram_handle: string | null;
  verified_documents: string[] | null;
  active: boolean;
};
export type AvailabilityRow = {
  member_id: string;
  day_date: string;
  kind: "free" | "not-free";
  start_time: string;
  end_time: string;
};
export type DocumentRow = {
  id: string;
  doc_type: string;
  status: "review" | "verified" | "rejected";
  original_filename: string;
  uploaded_at: string;
  reviewed_at: string | null;
  reject_reason: string | null;
};
export type DocumentTypeRow = { code: string; label: string; side: string };
export type ShiftRow = {
  id: string;
  venue_id: string;
  mode: "post" | "request";
  status: "open" | "filled" | "closed" | "expired";
  team: string;
  positions: string[];
  capacity: number;
  rate_pence: number;
  start_time: string;
  end_time: string;
  note: string;
  created_at: string;
  closed_by: "venue" | "dyuknow" | "all-declined" | null;
  close_reason: string | null;
};
export type ShiftDayRow = {
  id: string;
  shift_id: string;
  day_date: string;
  starts_at: string;
  ends_at: string;
  booked_count: number;
};
export type AnswerRow = {
  id: string;
  shift_id: string;
  talent_id: string;
  source: "invite" | "response";
  status:
    | "invited"
    | "can-cover"
    | "booked"
    | "declined"
    | "withdrawn"
    | "not-selected"
    | "lapsed"
    | "cancelled";
  end_reason: "filled" | "venue-closed" | "booked-elsewhere" | "shift-started" | "unavailable" | null;
  created_at: string;
};
export type AnswerDayRow = { answer_id: string; shift_id: string; shift_day_id: string };
export type BookingRow = {
  id: string;
  shift_id: string;
  talent_id: string;
  status: "active" | "cancelled";
  booked_at: string;
  cancelled_at: string | null;
};
export type BookingDayRow = {
  id: string;
  booking_id: string;
  shift_day_id: string;
  shift_id: string;
  talent_id: string;
  starts_at: string;
  ends_at: string;
  status: "booked" | "worked" | "no-show" | "cancelled";
  recorded_at: string | null;
  recorded_by: string | null;
  auto_confirmed: boolean;
  worked_start_time: string | null;
  worked_end_time: string | null;
  worked_minutes: number | null;
  pay_pence: number | null;
  cancel_reason: string | null;
  created_at: string;
};
export type ConversationRow = {
  id: string;
  venue_id: string;
  talent_id: string;
  created_at: string;
  last_seq: number;
};
export type MessageRow = {
  id: number;
  conversation_id: string;
  seq: number;
  kind: "text" | "card" | "event";
  sender_id: string | null;
  body: string;
  shift_id: string | null;
  created_at: string;
};
export type ConversationReadRow = {
  conversation_id: string;
  member_id: string;
  last_read_seq: number;
};
export type NotificationRow = {
  id: number;
  member_id: string;
  kind: string;
  title: string;
  body: string;
  target: string;
  created_at: string;
  read_at: string | null;
};
export type BusyRow = { talent_id: string; starts_at: string; ends_at: string };
export type ContactRow = {
  street_address?: string | null;
  postcode?: string | null;
  contact_name?: string | null;
  contact_position?: string | null;
  contact_phone?: string | null;
  mobile_number?: string | null;
  window_closes_at?: string | null;
};
export type BadgeCounts = {
  unread_notifications: number;
  unread_conversation_ids: string[];
  needs_you: number;
  account_attention: boolean;
};
