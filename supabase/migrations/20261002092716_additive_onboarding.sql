-- Additive intake fields on the existing profile tables. No rows or columns
-- are removed, and no old answer is rewritten.
alter table public.talent_profiles
  add column custom_skills text[] not null default '{}',
  add column shift_alerts text not null default 'all',
  add column dated_availability jsonb not null default '[]'::jsonb,
  add column approved boolean;

alter table public.venue_profiles
  add column street_address text,
  add column postcode text,
  add column teams_needed text[],
  add column approved boolean;

-- Existing members have no recorded approval decision: NULL means unknown.
-- Only future entries default to pending; never assume existing approval.
alter table public.talent_profiles alter column approved set default false;
alter table public.venue_profiles alter column approved set default false;

-- Widen the rule, keeping every previously accepted skill name.
alter table public.talent_profiles drop constraint talent_profiles_skills_check;
alter table public.talent_profiles add constraint talent_profiles_skills_check check (
  skills <@ array['Grill','Fish','Meat','Pasta','Pastry','Bakery','Breakfast',
    'High Volume','Fine Dining','Open Fire','Wood Oven','Sushi / Fish Specialist',
    'Butchery','Events','Private Dining','Production Kitchen','Wine Service',
    'Cocktails','Coffee','Silver Service','Hotel','Reservations','Barista',
    'Sushi','Guest Relations']::text[]
);

create function public.valid_custom_skills(items text[])
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(bool_and(item is not null and char_length(btrim(item)) between 1 and 80), true)
  from unnest(items) as item;
$$;

-- Same date/kind/start/end format as the preview. All-day is 00:00–00:00;
-- end earlier than start denotes an overnight interval. Dates may become
-- historical naturally, so the DB validates shape, not today's date.
create function public.valid_dated_availability(items jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  entry jsonb;
  seen_dates text[] := '{}';
  day text;
begin
  if jsonb_typeof(items) is distinct from 'array' then return false; end if;
  for entry in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(entry) is distinct from 'object'
      or jsonb_typeof(entry->'date') is distinct from 'string'
      or jsonb_typeof(entry->'kind') is distinct from 'string'
      or jsonb_typeof(entry->'start') is distinct from 'string'
      or jsonb_typeof(entry->'end') is distinct from 'string' then return false; end if;
    day := entry->>'date';
    if day !~ '^\d{4}-\d{2}-\d{2}$'
      or to_char(day::date, 'YYYY-MM-DD') <> day
      or day = any(seen_dates)
      or entry->>'kind' not in ('free', 'not-free')
      or entry->>'start' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or entry->>'end' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or ((entry->>'start') = (entry->>'end') and entry->>'start' <> '00:00')
      then return false; end if;
    seen_dates := array_append(seen_dates, day);
  end loop;
  return true;
exception when invalid_datetime_format or datetime_field_overflow then
  return false;
end;
$$;

alter table public.talent_profiles
  add constraint talent_profiles_custom_skills_check check (public.valid_custom_skills(custom_skills)),
  add constraint talent_profiles_shift_alerts_check check (shift_alerts in ('all','soon','off')),
  add constraint talent_profiles_dated_availability_check check (public.valid_dated_availability(dated_availability));

alter table public.venue_profiles
  add constraint venue_profiles_teams_needed_check check (teams_needed <@ array['Kitchen','Pastry','Bar','Sommelier','Floor']::text[]);

-- Keep the existing insert-only policies. This additional restrictive rule
-- prevents anonymous/authenticated applicants from setting their approval.
-- Approval can be set only through trusted owner/database administration.
create policy "applicants cannot approve talent" on public.talent_profiles
  as restrictive for insert to anon, authenticated with check (approved is false);
create policy "applicants cannot approve venues" on public.venue_profiles
  as restrictive for insert to anon, authenticated with check (approved is false);

comment on column public.talent_profiles.approved is 'Owner-controlled. NULL: pre-existing entry with no recorded decision; false: pending; true: approved.';
comment on column public.venue_profiles.approved is 'Owner-controlled. NULL: pre-existing entry with no recorded decision; false: pending; true: approved.';
comment on column public.talent_profiles.dated_availability is 'Array of date/kind/start/end entries in Europe/London time. Separate from all legacy availability preferences.';
comment on column public.venue_profiles.teams_needed is 'Five-team preferences, independent of legacy roles_needed. NULL on old rows: infer from legacy roles without rewriting them.';
