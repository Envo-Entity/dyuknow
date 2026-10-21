-- Dyuknow app backend, step 2: reference lists, members, profiles, availability,
-- documents, admins, notifications and call receipts.

-- ---------------------------------------------------------------------------
-- Reference lists
-- ---------------------------------------------------------------------------
create table public.positions (
  name text primary key,
  team text not null check (team in ('Kitchen','Pastry','Bar','Sommelier','Floor')),
  sort_order smallint not null
);
insert into public.positions (name, team, sort_order) values
  ('Demi CDP','Kitchen',1),('CDP','Kitchen',2),('Senior CDP','Kitchen',3),
  ('Junior Sous','Kitchen',4),('Sous Chef','Kitchen',5),('Head Chef','Kitchen',6),
  ('Executive Chef','Kitchen',7),('Pastry Chef','Pastry',8),('Bartender','Bar',9),
  ('Mixologist','Bar',10),('Sommelier','Sommelier',11),('Maître d’','Floor',12),
  ('Restaurant Manager','Floor',13),('Supervisor','Floor',14),('Section Waiter','Floor',15),
  ('Waiter','Floor',16),('Host','Floor',17);

create table public.document_types (
  code text primary key,
  label text not null,
  side text not null check (side in ('talent','venue')),
  applies_to text not null check (applies_to in ('everyone','kitchen','front-of-house')),
  required boolean not null default false,
  public_tick boolean not null default true,
  sort_order smallint not null
);
insert into public.document_types (code, label, side, applies_to, required, public_tick, sort_order) values
  ('right-to-work','Right to work','talent','everyone',false,true,1),
  ('photo-id','Photo ID','talent','everyone',false,true,2),
  ('food-hygiene','Food hygiene certificate','talent','kitchen',false,true,3),
  ('allergen-awareness','Allergen awareness','talent','front-of-house',false,true,4),
  ('cv','CV','talent','everyone',false,false,5),
  ('business-registration','Business registration','venue','everyone',false,true,6),
  ('premises-licence','Premises licence','venue','everyone',false,true,7);

-- ---------------------------------------------------------------------------
-- Small pure helpers used by table checks and generated columns
-- ---------------------------------------------------------------------------
create function private.valid_free_text_items(items text[])
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(bool_and(item is not null and char_length(btrim(item)) between 1 and 80), true)
  from unnest(items) as item;
$$;

-- "TW9 1UA" -> "TW9"; no space -> all but the last three characters.
create function private.postcode_area(p text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p is null or btrim(p) = '' then null
    when position(' ' in btrim(p)) > 0 then upper(split_part(btrim(p), ' ', 1))
    when char_length(btrim(p)) > 3 then upper(left(btrim(p), char_length(btrim(p)) - 3))
    else upper(btrim(p))
  end;
$$;

-- ---------------------------------------------------------------------------
-- members: one row per person who uses the app
-- ---------------------------------------------------------------------------
create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  side text not null check (side in ('talent','venue')),
  approved boolean not null default false,
  approved_at timestamptz,
  deletion_requested_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger members_set_updated_at before update on public.members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- talents: every onboarding answer, one row per talent member
-- ---------------------------------------------------------------------------
create table public.talents (
  member_id uuid primary key references public.members(id) on delete cascade,
  full_name text,
  mobile_number text,
  home_postcode text,
  home_area text generated always as (private.postcode_area(home_postcode)) stored,
  date_of_birth date,
  photo_path text,
  category text check (category in ('Chef','Front of House')),
  positions text[] not null default '{}' check (positions <@ array['Demi CDP','CDP','Senior CDP','Junior Sous','Sous Chef','Head Chef','Executive Chef','Pastry Chef','Bartender','Mixologist','Sommelier','Maître d’','Restaurant Manager','Supervisor','Section Waiter','Waiter','Host']::text[]),
  skills text[] not null default '{}' check (skills <@ array['Grill','Fish','Meat','Pasta','Pastry','Bakery','Breakfast','High Volume','Fine Dining','Open Fire','Wood Oven','Sushi / Fish Specialist','Butchery','Events','Private Dining','Production Kitchen','Wine Service','Cocktails','Coffee','Silver Service','Hotel','Reservations','Barista','Sushi','Guest Relations']::text[]),
  custom_skills text[] not null default '{}' check (private.valid_free_text_items(custom_skills)),
  years_band text check (years_band in ('0–2','3–5','5–10','10+')),
  employment_history jsonb not null default '[]'::jsonb check (jsonb_typeof(employment_history) = 'array'),
  known_for text[] not null default '{}' check (known_for <@ array['Calm under pressure','Strong organiser','Great on service','Excellent prep','Fast learner','Clean worker','Team player','Great with junior chefs','Reliable','Problem solver','Creative','Strong palate','Warm personality','Excellent wine knowledge','Fast service','Great communicator','Upselling','Cocktail knowledge','Coffee','Leadership','Professional']::text[]),
  custom_known_for text[] not null default '{}' check (private.valid_free_text_items(custom_known_for)),
  bio text check (char_length(bio) <= 250),
  preferred_shifts text[] not null default '{}' check (preferred_shifts <@ array['Breakfast','Lunch','Dinner','Late','Weekdays','Weekends']::text[]),
  max_travel text check (max_travel in ('3 miles','5 miles','10 miles','Anywhere')),
  preferred_areas text[] not null default '{}' check (preferred_areas <@ array['West London','East London','Central','North','South']::text[]),
  preferred_hourly_rate text check (preferred_hourly_rate in ('£18','£20','£22+')),
  minimum_same_day_rate_gbp numeric check (minimum_same_day_rate_gbp >= 0),
  shift_alerts text not null default 'all' check (shift_alerts in ('all','soon','off')),
  agreed_turn_up_on_time boolean not null default false,
  agreed_treat_venues_with_respect boolean not null default false,
  agreed_give_notice_if_cancelling boolean not null default false,
  agreed_represent_professionally boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index talents_positions_gin on public.talents using gin (positions);
create trigger talents_set_updated_at before update on public.talents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- venues: every onboarding answer, one row per venue member
-- ---------------------------------------------------------------------------
create table public.venues (
  member_id uuid primary key references public.members(id) on delete cascade,
  business_name text,
  trading_name text,
  display_name text generated always as (coalesce(nullif(btrim(trading_name), ''), nullif(btrim(business_name), ''))) stored,
  registered_company text,
  website text,
  instagram_handle text,
  contact_name text,
  contact_position text,
  contact_phone text,
  contact_email text,
  street_address text,
  postcode text,
  area text generated always as (private.postcode_area(postcode)) stored,
  photo_path text,
  venue_types text[] not null default '{}' check (venue_types <@ array['Restaurant','Hotel','Pub','Bar','Private Members Club','Events','Catering','Bakery','Other']::text[]),
  cuisines text[] not null default '{}',
  covers_band text check (covers_band in ('0–30','30–60','60–100','100+')),
  average_team_size integer check (average_team_size >= 0),
  average_team_vacancies_per_week integer check (average_team_vacancies_per_week >= 0),
  roles_needed text[] not null default '{}' check (roles_needed <@ array['Chefs','FOH','Bartenders','Managers','Events']::text[]),
  teams_needed text[] not null default '{}' check (teams_needed <@ array['Kitchen','Pastry','Bar','Sommelier','Floor']::text[]),
  typical_shifts text[] not null default '{}' check (typical_shifts <@ array['Breakfast','Lunch','Dinner','Late','Weekdays','Weekends']::text[]),
  typical_notice text[] not null default '{}' check (typical_notice <@ array['Today','Tomorrow','Planned']::text[]),
  dress_code text check (dress_code in ('Chef whites','Blacks','Casual')),
  uniform_provided boolean,
  staff_meal boolean,
  typical_hourly_rate_chef_gbp numeric check (typical_hourly_rate_chef_gbp >= 0),
  typical_hourly_rate_foh_gbp numeric check (typical_hourly_rate_foh_gbp >= 0),
  bio text check (char_length(bio) <= 250),
  known_for text[] not null default '{}' check (known_for <@ array['Fast-paced service','Great team culture','Fine dining standards','Creative food','Training','Supportive management','Excellent food','Career progression']::text[]),
  agreed_pay_fairly boolean not null default false,
  agreed_treat_team_like_our_own boolean not null default false,
  agreed_provide_clear_brief boolean not null default false,
  agreed_rate_honestly boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger venues_set_updated_at before update on public.venues
  for each row execute function public.set_updated_at();

-- A talents row must belong to a talent member, a venues row to a venue.
create function private.check_profile_side()
returns trigger language plpgsql set search_path = '' as $$
declare s text;
begin
  select side into s from public.members where id = new.member_id;
  if (tg_table_name = 'talents' and s is distinct from 'talent')
     or (tg_table_name = 'venues' and s is distinct from 'venue') then
    raise exception 'Profile side does not match the member';
  end if;
  return new;
end $$;
create trigger talents_side before insert or update of member_id on public.talents
  for each row execute function private.check_profile_side();
create trigger venues_side before insert or update of member_id on public.venues
  for each row execute function private.check_profile_side();

-- ---------------------------------------------------------------------------
-- availability
-- ---------------------------------------------------------------------------
create table public.availability (
  member_id uuid not null references public.members(id) on delete cascade,
  day_date date not null,
  kind text not null check (kind in ('free','not-free')),
  start_time time not null,
  end_time time not null,
  starts_at timestamptz,
  ends_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (member_id, day_date),
  check (start_time <> end_time or (start_time = '00:00' and end_time = '00:00')),
  check ((kind = 'free' and starts_at is not null and ends_at is not null and starts_at < ends_at)
      or (kind = 'not-free' and starts_at is null and ends_at is null))
);
create index availability_day_idx on public.availability (day_date);

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  doc_type text not null references public.document_types(code),
  storage_path text not null unique,
  original_filename text not null,
  content_type text not null check (content_type in ('image/jpeg','image/png','application/pdf')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  status text not null default 'review' check (status in ('review','verified','rejected')),
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  reject_reason text,
  unique (member_id, doc_type),
  check (status = 'review' or (reviewed_at is not null and reviewed_by is not null)),
  check (status <> 'rejected' or nullif(btrim(reject_reason), '') is not null)
);

-- ---------------------------------------------------------------------------
-- admins and their log
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.admin_actions (
  id bigint generated always as identity primary key,
  admin_user_id uuid,
  action text not null check (action in ('approve','unapprove','verify-document','reject-document')),
  member_id uuid references public.members(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notifications (in-app only in this build)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  kind text not null check (kind in (
    'booking-request','job-posted','booked','days-added','filled-by-other','shift-filled',
    'shift-closed','shift-started','days-cancelled','hours-confirmed','no-show','reminder',
    'said-yes','accepted','declined','withdrew','booked-elsewhere','unavailable','shift-unfilled',
    'approved','document-verified','document-rejected')),
  title text not null,
  body text not null default '',
  target text not null,
  actor_id uuid references public.members(id) on delete set null,
  shift_id uuid,
  booking_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_member_idx on public.notifications (member_id, id desc);
create index notifications_unread_idx on public.notifications (member_id) where read_at is null;
create index notifications_target_idx on public.notifications (member_id, target) where read_at is null;

-- ---------------------------------------------------------------------------
-- call receipts: a repeated tap returns the first result
-- ---------------------------------------------------------------------------
create table public.call_receipts (
  member_id uuid not null references public.members(id) on delete cascade,
  client_ref uuid not null,
  function_name text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (member_id, client_ref)
);

-- ---------------------------------------------------------------------------
-- Row-rule helpers (stable, owner rights, empty search path)
-- ---------------------------------------------------------------------------
create function private.current_member_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.members where user_id = auth.uid() and deleted_at is null;
$$;

create function private.approved_member_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select id from public.members where approved and deleted_at is null;
$$;

create function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function private.current_member_id(), private.approved_member_ids(), private.is_admin() from public, anon;
grant execute on function private.current_member_id(), private.approved_member_ids(), private.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Writing notices: the one helper every function uses
-- ---------------------------------------------------------------------------
create function private.notify(
  p_member uuid, p_kind text, p_title text, p_body text, p_target text,
  p_actor uuid default null, p_shift uuid default null, p_booking uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.members where id = p_member and deleted_at is null) then
    insert into public.notifications (member_id, kind, title, body, target, actor_id, shift_id, booking_id, created_at)
    values (p_member, p_kind, p_title, coalesce(p_body, ''), p_target, p_actor, p_shift, p_booking, clock_timestamp());
  end if;
end $$;
revoke all on function private.notify(uuid, text, text, text, text, uuid, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Approval trigger: sets approved_at, logs, and sends the approved notice.
-- admin_set_approval passes its admin id and note as transaction-local settings.
-- ---------------------------------------------------------------------------
create function private.on_approval_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := nullif(current_setting('dyuknow.admin_user_id', true), '')::uuid;
  v_note text := nullif(current_setting('dyuknow.admin_note', true), '');
begin
  if new.approved is distinct from old.approved then
    if new.approved then
      new.approved_at := clock_timestamp();
    else
      new.approved_at := null;
    end if;
    insert into public.admin_actions (admin_user_id, action, member_id, note)
    values (v_admin, case when new.approved then 'approve' else 'unapprove' end, new.id, v_note);
    if new.approved then
      perform private.notify(new.id, 'approved', 'You''re approved',
        case when new.side = 'talent'
          then 'Venues can now find you. Add the days you''re free.'
          else 'You can now post jobs and send booking requests.' end,
        case when new.side = 'talent' then 'availability' else 'profile' end);
    end if;
  end if;
  return new;
end $$;
create trigger members_approval before update of approved on public.members
  for each row execute function private.on_approval_change();
