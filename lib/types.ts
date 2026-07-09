export type Side = "venue" | "talent";

export type DayCode = "Fri" | "Sat" | "Sun" | "Mon" | "Tue" | "Wed" | "Thu";

export type ProposalState = "none" | "sent" | "accepted" | "declined";

export interface LookPhoto {
  mono: string;
  photo?: string;
}

export interface Talent {
  id: string;
  name: string;
  short: string;
  role: string;
  mono: string;
  photo?: string;
  verified: boolean;
  pedigree: string;
  spec: string;
  metric: string;
  chips: [string, string][];
  look: LookPhoto[];
  about: string;
  reviews: { q: string; a: string }[];
  convo?: string;
  scarcity: string | null;
}

export interface RoleDef {
  id: string;
  name: string;
  mono: string;
  photo?: string;
  metric: string;
  sub: string;
  top: string | null;
  talent: string[];
}

export interface FeedItem {
  id: string;
  venue: string;
  area: string;
  mono: string;
  photo?: string;
  role: string;
  dates: string;
  rate: string;
  tag: string;
  isNew: boolean;
  when: string;
  scarcity: string | null;
  room: string;
  noteQ: string;
  noteA: string;
  convo: string | null;
  cta: "conversation" | "intro";
}

export interface ConvoMeta {
  venue: string;
  venueSub: string;
  venueMono: string;
  venuePhoto?: string;
  talent: string;
  hasProposal: boolean;
}

export type MessageKind = "text" | "proposal" | "system";

export interface ChatMessage {
  from: Side;
  kind: MessageKind;
  text?: string;
}

export interface PastEntry {
  title: string;
  sub: string;
  dates: string;
  mono: string;
  photo?: string;
}

export interface VenueIdentity {
  name: string;
  bio: string;
  photo: string | null;
  needs: string[];
}

export interface TalentIdentity {
  name: string;
  role: string;
  bio: string;
  photo: string | null;
}

export interface AppData {
  proposal: ProposalState;
  avail: Record<DayCode, boolean>;
  convos: Record<string, ChatMessage[]>;
  read: Record<Side, Record<string, boolean>>;
  seenBooking: Record<Side, boolean>;
  saved: Record<string, boolean>;
  intros: Record<string, boolean>;
  onboarded: Record<Side, boolean>;
  venueIdentity: VenueIdentity | null;
  talentIdentity: TalentIdentity | null;
  availWindow: { from: string; to: string };
}
