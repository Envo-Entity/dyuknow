create extension if not exists pgcrypto; -- for gen_random_uuid()

-- ============================================================
-- talent_profiles — Team onboarding (components/onboarding/TalentOnboarding.tsx)
-- ============================================================

create table talent_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- null until auth exists

  -- Section 1 · About you
  full_name text,
  mobile_number text,
  email text,
  home_postcode text,
  date_of_birth date,

  -- Section 2 · Photo
  photo_filename text,
  photo_path text,

  -- Section 3 · Role & skills
  category text check (category in ('Chef', 'Front of House', 'Bar', 'Events', 'Management')),
  position text,
  skills text[] check (
    skills <@ array[
      'Grill', 'Fish', 'Meat', 'Pasta', 'Pastry', 'Bakery', 'Breakfast',
      'High Volume', 'Fine Dining', 'Open Fire', 'Wood Oven',
      'Sushi / Fish Specialist', 'Butchery', 'Events', 'Private Dining',
      'Production Kitchen', 'Wine Service', 'Cocktails', 'Coffee',
      'Silver Service', 'Hotel', 'Reservations', 'Barista'
    ]::text[]
  ),

  -- Section 4 · Experience
  years_band text check (years_band in ('0–2', '3–5', '5–10', '10+')),
  employment_history jsonb not null default '[]'::jsonb
    check (jsonb_typeof(employment_history) = 'array'),

  -- Section 5 · Availability & pay
  available_today boolean,
  preferred_shifts text[] check (
    preferred_shifts <@ array['Breakfast', 'Lunch', 'Dinner', 'Late', 'Weekdays', 'Weekends']::text[]
  ),
  max_travel text check (max_travel in ('3 miles', '5 miles', '10 miles', 'Anywhere')),
  preferred_areas text[] check (
    preferred_areas <@ array['West London', 'East London', 'Central', 'North', 'South']::text[]
  ),
  preferred_hourly_rate text check (preferred_hourly_rate in ('£18', '£20', '£22+')),
  minimum_same_day_rate_gbp numeric(8, 2) check (minimum_same_day_rate_gbp >= 0),

  -- Section 6 · Verification
  right_to_work_filename text,
  right_to_work_path text,
  food_safety_cert_filename text,
  food_safety_cert_path text,
  cv_filename text,
  cv_path text,

  -- Section 7 · About you & known for
  bio text check (char_length(bio) <= 250),
  known_for text[] check (
    known_for <@ array[
      'Calm under pressure', 'Strong organiser', 'Great on service',
      'Excellent prep', 'Fast learner', 'Clean worker', 'Team player',
      'Great with junior chefs', 'Reliable', 'Problem solver', 'Creative',
      'Strong palate', 'Warm personality', 'Excellent wine knowledge',
      'Fast service', 'Great communicator', 'Upselling',
      'Cocktail knowledge', 'Coffee', 'Leadership', 'Professional'
    ]::text[]
  ),

  -- Section 8 · Community agreement
  agreed_turn_up_on_time boolean not null default false,
  agreed_treat_venues_with_respect boolean not null default false,
  agreed_give_notice_if_cancelling boolean not null default false,
  agreed_represent_professionally boolean not null default false,

  -- Section 9 · Confirmation
  onboarding_completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id)
);

comment on table talent_profiles is 'Team (talent) onboarding data — see ONBOARDING_SCHEMA.md. Data-collection phase: no auth wired up yet, user_id is nullable and unused.';

-- ============================================================
-- venue_profiles — Venue onboarding (components/onboarding/VenueOnboarding.tsx)
-- ============================================================

create table venue_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- null until auth exists

  -- Section 1 · Business details
  business_name text,
  trading_name text,
  registered_company text,
  website text,
  instagram_handle text,
  contact_name text,
  contact_position text,
  contact_phone text,
  contact_email text,

  -- Section 2 · Photo (not in the source doc, kept for product reasons)
  photo_filename text,
  photo_path text,

  -- Section 3 · Venue details
  venue_types text[] check (
    venue_types <@ array[
      'Restaurant', 'Hotel', 'Pub', 'Bar', 'Private Members Club',
      'Events', 'Catering', 'Bakery', 'Other'
    ]::text[]
  ),
  cuisines text[],  -- intentionally unconstrained, source list is still a placeholder
  covers_band text check (covers_band in ('0–30', '30–60', '60–100', '100+')),
  average_team_size integer check (average_team_size >= 0),

  -- Section 4 · Staffing
  roles_needed text[] check (
    roles_needed <@ array['Chefs', 'FOH', 'Bartenders', 'Managers', 'Events']::text[]
  ),
  typical_shifts text[] check (
    typical_shifts <@ array['Breakfast', 'Lunch', 'Dinner', 'Late', 'Weekdays', 'Weekends']::text[]
  ),
  typical_notice text[] check (
    typical_notice <@ array['Today', 'Tomorrow', 'Planned']::text[]
  ),

  -- Section 5 · Venue standards & pay
  dress_code text check (dress_code in ('Chef whites', 'Blacks', 'Casual')),
  uniform_provided boolean,
  staff_meal boolean,
  typical_hourly_rate_chef_gbp numeric(6, 2) check (typical_hourly_rate_chef_gbp >= 0),
  typical_hourly_rate_foh_gbp numeric(6, 2) check (typical_hourly_rate_foh_gbp >= 0),

  -- Section 6 · About your venue & known for
  bio text check (char_length(bio) <= 250),
  known_for text[] check (
    known_for <@ array[
      'Fast-paced service', 'Great team culture', 'Fine dining standards',
      'Creative food', 'Training', 'Supportive management',
      'Excellent food', 'Career progression'
    ]::text[]
  ),

  -- Section 7 · Community promise
  agreed_pay_fairly boolean not null default false,
  agreed_treat_team_like_our_own boolean not null default false,
  agreed_provide_clear_brief boolean not null default false,
  agreed_rate_honestly boolean not null default false,

  -- Section 8 · Confirmation
  onboarding_completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id)
);

comment on table venue_profiles is 'Venue onboarding data — see ONBOARDING_SCHEMA.md. Data-collection phase: no auth wired up yet, user_id is nullable and unused.';

-- ============================================================
-- Keep updated_at current
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger talent_profiles_set_updated_at
  before update on talent_profiles
  for each row execute function set_updated_at();

create trigger venue_profiles_set_updated_at
  before update on venue_profiles
  for each row execute function set_updated_at();

-- ============================================================
-- Indexes
-- ============================================================

create index talent_profiles_skills_idx on talent_profiles using gin (skills);
create index talent_profiles_preferred_areas_idx on talent_profiles using gin (preferred_areas);
create index venue_profiles_roles_needed_idx on venue_profiles using gin (roles_needed);

-- ============================================================
-- RLS — enabled with no policies yet. Nothing (other than the service
-- role) can read or write until real auth exists and policies are added.
-- This is a safe default, not a placeholder to "fill in later and forget."
-- ============================================================

alter table talent_profiles enable row level security;
alter table venue_profiles enable row level security;
