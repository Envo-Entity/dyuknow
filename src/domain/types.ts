// The app's data shapes, ported from the website's lib/preview/model.ts (the
// snapshot every screen reads) and lib/types.ts (onboarding answers).
import type { ShiftAlert } from "./catalogue.ts";

export type Side = "venue" | "talent";
export type ResponseStatus =
  | "invited"
  | "can-cover"
  | "booked"
  | "cancelled"
  | "declined"
  | "withdrawn"
  | "not-selected"
  | "lapsed";
// Only what someone reads to decide, to turn up, or to find the place.
export type VenueDetails = {
  address: string; // street line; the postcode is on the member
  contactName: string;
  contactRole: string;
  types: string[];
  cuisines: string[];
  instagram: string;
};
export type Member = {
  id: string;
  side: "venue" | "talent";
  name: string;
  phone: string;
  postcode: string;
  // The postcode exactly as the member typed it, shown as is.
  shownPostcode?: string;
  // Public photo URL, or "" for none.
  photo: string;
  bio: string;
  roles: string[];
  skills: string[];
  approved: boolean;
  alert: "all" | "soon" | "off";
  // Talent only: the lowest hourly pay they'll take, shown to venues.
  minRate?: number;
  venue?: VenueDetails;
  account?: Account;
};
export type DocStatus = "verified" | "review" | "missing";
// Settings a signed-in member manages for themselves. Never shown publicly,
// except which documents Dyuknow has verified.
export type Account = {
  texts: { messages: boolean; reminders: boolean };
  docs: Record<string, { status: DocStatus; file?: string; updated?: string }>;
  // When the member asked Dyuknow to delete their account.
  deletion?: string;
};
// One day of a shift: London date, wall-clock hours, and the exact instants.
export type Service = {
  date: string;
  start: string;
  end: string;
  from: string;
  to: string;
};
// What a venue needs: position, days, hours, pay. A job post ("post") goes to
// everyone; a booking request ("request") goes to the people the venue chose.
export type Shift = {
  id: string;
  venue: string;
  roles: string[];
  days: Service[];
  capacity: number;
  rate: number;
  note: string;
  mode: "post" | "request";
  status: "open" | "filled" | "closed" | "expired";
  created: string;
  // Whether Accept books, decided by the database because talent can't see
  // who else a request went to.
  acceptBooks?: boolean;
  // Who closed it, and the reason talent see. null while not closed.
  closedBy?: "venue" | "dyuknow" | "all-declined" | null;
  closeReason?: string;
};
// One person's answer to a shift. "invited" means a booking request is
// waiting for them; "can-cover" means they said yes and the venue decides.
export type Response = {
  id: string;
  shift: string;
  talent: string;
  source: "invite" | "response";
  status: ResponseStatus;
  // Dates the talent said yes to. Missing means every date of the shift.
  days?: string[];
  // Why a not-selected or lapsed answer ended.
  endReason?: "filled" | "venue-closed" | "booked-elsewhere" | "shift-started" | "unavailable";
};
// The one conversation between a venue and a talent member.
export type Thread = {
  id: string;
  venue: string;
  talent: string;
  started: string;
};
// What happened on one booked day. A day with no entry is still booked.
export type DayLog = {
  status: "worked" | "no-show" | "cancelled";
  by: string;
  at: string;
  // Worked: the hours the venue confirmed (scheduled hours unless changed).
  start?: string;
  end?: string;
  hours?: number;
  // Confirmed automatically because the venue didn't within 48 hours.
  auto?: boolean;
  reason?: string;
};
export type Booking = {
  id: string;
  shift: string;
  talent: string;
  // Every date this person was booked for on the shift, cancelled or not.
  days: string[];
  // True once every day is cancelled.
  cancelled: boolean;
  reason?: string;
  by?: string;
  cancelledAt?: string;
  bookedAt?: string;
  log: Record<string, DayLog>;
};
export type Message = {
  id: string;
  thread: string;
  from: string;
  text: string;
  time: string;
  system: boolean;
  // A shift this message is about, shown as a card.
  shift?: string;
};
export type Notice = {
  id: string;
  to: string;
  title: string;
  text: string;
  target: string;
  read: boolean;
  time: string;
};
export type Availability = {
  member: string;
  date: string;
  kind: "free" | "not-free";
  start: string;
  end: string;
};
export type Data = {
  version: 3;
  now: string;
  members: Member[];
  shifts: Shift[];
  responses: Response[];
  bookings: Booking[];
  messages: Message[];
  notices: Notice[];
  availability: Availability[];
  threads: Thread[];
  // "<member id>/<conversation id>" → id of the last message read.
  read: Record<string, string>;
  // "<member id>/<conversation id>" → unsent text.
  messageDrafts: Record<string, string>;
  offline: boolean;
  failNext: boolean;
};
export type ShiftDraft = {
  roles: string[];
  family: string;
  date: string;
  count: number;
  start: string;
  end: string;
  capacity: number;
  rate: number;
  note: string;
  // Who a booking request goes to. Empty means a job post to everyone.
  to: string[];
  // Any dates (up to 14) with the same hours. When missing, `date` + `count`
  // describe a consecutive run.
  dates?: string[];
};
// Where each booked day stands: the record payments will run on.
export type DayStatus = "booked" | "to-confirm" | "worked" | "no-show" | "cancelled";
// Where a talent member stands for some hours. Only "free" means they said
// yes to those hours.
export type Standing = "free" | "booked" | "not-free" | "other-hours" | "not-set";

// ---- Onboarding answers (website lib/types.ts) ----

export interface DatedAvailability {
  date: string;
  kind: "free" | "not-free";
  start: string;
  end: string;
}
// A file picked on this device. The website keeps a data URL; the app keeps
// the local file uri and its type, and uploads it on submit.
export interface UploadedFile {
  name: string;
  uri: string;
  mimeType: string;
  size?: number;
}
export interface EmployerEntry {
  restaurant: string;
  position: string;
  dates: string;
}
export interface VenueIdentity {
  name: string;
  bio: string;
  // Local image uri (already cropped 4:5), or null.
  photo: string | null;
  needs: string[];
  tradingName: string;
  registeredCompany: string;
  website: string;
  instagram: string;
  contactName: string;
  contactPosition: string;
  contactPhone: string;
  contactEmail: string;
  venueType: string[];
  cuisine: string[];
  covers: string;
  teamSize: string;
  teamVacanciesPerWeek: string;
  typicalShifts: string[];
  typicalNotice: string[];
  dressCode: string;
  uniformProvided: boolean | null;
  staffMeal: boolean | null;
  rateChef: string;
  rateFoh: string;
  knownFor: string[];
  agreedCommunity: string[];
  address: string;
  postcode: string;
  teamsNeeded: string[];
}
export interface TalentIdentity {
  name: string;
  role: string;
  bio: string;
  // Local image uri (already cropped 4:5), or null.
  photo: string | null;
  mobile: string;
  email: string;
  postcode: string;
  dob: string;
  category: string;
  positions: string[];
  skills: string[];
  yearsBand: string;
  employers: EmployerEntry[];
  availableToday: boolean;
  preferredShifts: string[];
  maxTravel: string;
  preferredAreas: string[];
  preferredRate: string;
  minSameDayRate: string;
  rightToWork: UploadedFile | null;
  foodSafetyCert: UploadedFile | null;
  cv: UploadedFile | null;
  knownFor: string[];
  agreedCommunity: string[];
  customSkills: string[];
  shiftAlerts: ShiftAlert;
  datedAvailability: DatedAvailability[];
}
