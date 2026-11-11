// The web admin's display helpers (components/admin/format.ts), same words.
import type { AdminDocumentStatus, AdminMemberListItem, AdminSide } from '@/data/admin';
import type { BadgeTone, IconName } from '@/ui';

let dateFmt: Intl.DateTimeFormat | null = null;
let dateTimeFmt: Intl.DateTimeFormat | null = null;

/** "3 Nov 2026" (London). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  dateFmt ??= new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
  return dateFmt.format(d);
}

/** "3 Nov, 14:05" (London). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  dateTimeFmt ??= new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });
  return dateTimeFmt.format(d);
}

/** "3 days ago", "2 hours ago": how long something has been waiting. */
export function waitingFor(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

export function sideLabel(side: AdminSide): string {
  return side === 'talent' ? 'Talent' : 'Venue';
}

export function fileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Status words: the web's, each with a symbol and a tone (DESIGN.md: ink =
// waiting on you, sage = settled, danger = destructive).
// ---------------------------------------------------------------------------

export type StatusLook = { label: string; tone: BadgeTone; icon?: IconName };

const DOC_STATUS: Record<AdminDocumentStatus, StatusLook> = {
  review: { label: 'To check', tone: 'attention' },
  verified: { label: 'Verified', tone: 'good' },
  rejected: { label: 'Not accepted', tone: 'neutral', icon: 'cancelled' },
};
export function documentStatus(status: AdminDocumentStatus): StatusLook {
  return DOC_STATUS[status];
}

type MemberState = Pick<AdminMemberListItem, 'approved' | 'approved_at' | 'deleted_at' | 'deletion_requested_at' | 'missing'>;

/**
 * A member's status (web memberStatus): Deleted, Asked to delete, Approved or
 * Waiting. Waiting with nothing missing is waiting on the admin: "Ready to
 * approve" in ink. `approvedOn` adds the date, as the web drawer does.
 */
export function memberStatus(m: MemberState, opts: { approvedOn?: boolean } = {}): StatusLook {
  if (m.deleted_at) return { label: 'Deleted', tone: 'neutral', icon: 'cancelled' };
  if (m.deletion_requested_at) return { label: 'Asked to delete', tone: 'danger', icon: 'trash' };
  if (m.approved)
    return { label: opts.approvedOn && m.approved_at ? `Approved ${formatDate(m.approved_at)}` : 'Approved', tone: 'good' };
  if (!(m.missing ?? []).length) return { label: 'Ready to approve', tone: 'attention' };
  return { label: 'Waiting', tone: 'neutral', icon: 'waiting' };
}

// ---------------------------------------------------------------------------
// Profile answers in readable form. Every column of talents / venues is listed
// in onboarding order; anything not listed (a column added later) is shown at
// the end with a label made from its name, so nothing is ever hidden.
// ---------------------------------------------------------------------------

type FieldSpec = { key: string; label: string; kind?: 'money' | 'date' | 'agreement' | 'alerts' };
type FieldGroup = { title: string; fields: FieldSpec[] };

const TALENT_GROUPS: FieldGroup[] = [
  {
    title: 'Who they are',
    fields: [
      { key: 'full_name', label: 'Full name' },
      { key: 'mobile_number', label: 'Mobile number' },
      { key: 'home_postcode', label: 'Home postcode' },
      { key: 'home_area', label: 'Area shown to venues' },
      { key: 'date_of_birth', label: 'Date of birth', kind: 'date' },
    ],
  },
  {
    title: 'Work',
    fields: [
      { key: 'category', label: 'Category' },
      { key: 'positions', label: 'Positions' },
      { key: 'skills', label: 'Skills' },
      { key: 'custom_skills', label: 'Own skills' },
      { key: 'years_band', label: 'Years of experience' },
      { key: 'employment_history', label: 'Where they’ve worked' },
      { key: 'known_for', label: 'Known for' },
      { key: 'custom_known_for', label: 'Also known for' },
      { key: 'bio', label: 'Bio' },
    ],
  },
  {
    title: 'Preferences',
    fields: [
      { key: 'preferred_shifts', label: 'Preferred shifts' },
      { key: 'max_travel', label: 'Will travel' },
      { key: 'preferred_areas', label: 'Preferred areas' },
      { key: 'preferred_hourly_rate', label: 'Preferred hourly rate' },
      { key: 'minimum_same_day_rate_gbp', label: 'Minimum same-day rate', kind: 'money' },
      { key: 'shift_alerts', label: 'Shift alerts', kind: 'alerts' },
    ],
  },
  {
    title: 'Agreements',
    fields: [
      { key: 'agreed_turn_up_on_time', label: 'Turn up on time', kind: 'agreement' },
      { key: 'agreed_treat_venues_with_respect', label: 'Treat venues with respect', kind: 'agreement' },
      { key: 'agreed_give_notice_if_cancelling', label: 'Give notice if cancelling', kind: 'agreement' },
      { key: 'agreed_represent_professionally', label: 'Represent Dyuknow professionally', kind: 'agreement' },
    ],
  },
];

const VENUE_GROUPS: FieldGroup[] = [
  {
    title: 'The business',
    fields: [
      { key: 'business_name', label: 'Business name' },
      { key: 'trading_name', label: 'Trading name' },
      { key: 'registered_company', label: 'Registered company' },
      { key: 'website', label: 'Website' },
      { key: 'instagram_handle', label: 'Instagram' },
      { key: 'street_address', label: 'Street address' },
      { key: 'postcode', label: 'Postcode' },
      { key: 'area', label: 'Area shown to talent' },
    ],
  },
  {
    title: 'On-site contact',
    fields: [
      { key: 'contact_name', label: 'Contact name' },
      { key: 'contact_position', label: 'Contact role' },
      { key: 'contact_phone', label: 'Contact phone' },
      { key: 'contact_email', label: 'Contact email' },
    ],
  },
  {
    title: 'The venue',
    fields: [
      { key: 'venue_types', label: 'Venue type' },
      { key: 'cuisines', label: 'Cuisines' },
      { key: 'covers_band', label: 'Covers' },
      { key: 'average_team_size', label: 'Average team size' },
      { key: 'average_team_vacancies_per_week', label: 'Team vacancies per week' },
      { key: 'roles_needed', label: 'Roles needed' },
      { key: 'teams_needed', label: 'Teams needed' },
      { key: 'typical_shifts', label: 'Typical shifts' },
      { key: 'typical_notice', label: 'Typical notice' },
      { key: 'dress_code', label: 'Dress code' },
      { key: 'uniform_provided', label: 'Uniform provided' },
      { key: 'staff_meal', label: 'Staff meal' },
      { key: 'typical_hourly_rate_chef_gbp', label: 'Typical chef rate (hourly)', kind: 'money' },
      { key: 'typical_hourly_rate_foh_gbp', label: 'Typical FOH rate (hourly)', kind: 'money' },
      { key: 'bio', label: 'Bio' },
      { key: 'known_for', label: 'Known for' },
    ],
  },
  {
    title: 'Agreements',
    fields: [
      { key: 'agreed_pay_fairly', label: 'Pay fairly', kind: 'agreement' },
      { key: 'agreed_treat_team_like_our_own', label: 'Treat the team like our own', kind: 'agreement' },
      { key: 'agreed_provide_clear_brief', label: 'Provide a clear brief', kind: 'agreement' },
      { key: 'agreed_rate_honestly', label: 'Rate honestly', kind: 'agreement' },
    ],
  },
];

const ALERTS: Record<string, string> = { all: 'Every new shift', soon: 'Only shifts starting soon', off: 'Off' };

/** Columns that are bookkeeping, not answers. */
const HIDDEN = new Set(['member_id', 'display_name', 'photo_path', 'created_at', 'updated_at', 'onboarding_completed_at']);

function humanise(key: string): string {
  const s = key.replace(/_gbp$/, '').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatValue(value: unknown, kind?: FieldSpec['kind']): string | null {
  if (value === null || value === undefined) return null;
  if (kind === 'agreement') return value ? 'Agreed' : 'Not agreed';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (kind === 'money' && (typeof value === 'number' || typeof value === 'string')) {
    const n = Number(value);
    return Number.isFinite(n) ? `£${n % 1 === 0 ? n : n.toFixed(2)}` : String(value);
  }
  if (kind === 'date' && typeof value === 'string') return formatDate(value);
  if (kind === 'alerts' && typeof value === 'string') return ALERTS[value] ?? value;
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (item && typeof item === 'object') {
          return Object.values(item as Record<string, unknown>)
            .filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
            .join(' · ');
        }
        return String(item);
      })
      .filter((s) => s.trim() !== '');
    return parts.length ? parts.join(value.some((i) => i && typeof i === 'object') ? '\n' : ', ') : null;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  const s = String(value).trim();
  return s === '' ? null : s;
}

export type AnswerRow = { label: string; value: string | null; agreement?: boolean };
export type AnswerGroup = { title: string; rows: AnswerRow[] };

export function readableAnswers(side: AdminSide, profile: Record<string, unknown> | null): AnswerGroup[] {
  if (!profile) return [];
  const groups = side === 'talent' ? TALENT_GROUPS : VENUE_GROUPS;
  const seen = new Set<string>(HIDDEN);
  const out: AnswerGroup[] = groups.map((g) => ({
    title: g.title,
    rows: g.fields.map((f) => {
      seen.add(f.key);
      return {
        label: f.label,
        value: formatValue(profile[f.key], f.kind),
        agreement: f.kind === 'agreement' ? Boolean(profile[f.key]) : undefined,
      };
    }),
  }));
  const extra = Object.keys(profile)
    .filter((k) => !seen.has(k))
    .map((k) => ({ label: humanise(k), value: formatValue(profile[k], k.endsWith('_gbp') ? 'money' : undefined) }));
  if (extra.length) out.push({ title: 'Other', rows: extra });
  return out;
}

export function photoPathOf(profile: Record<string, unknown> | null): string | null {
  const p = profile?.photo_path;
  return typeof p === 'string' && p.trim() ? p : null;
}
