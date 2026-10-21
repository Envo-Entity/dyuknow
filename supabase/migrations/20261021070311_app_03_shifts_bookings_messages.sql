-- Dyuknow app backend, step 3: shifts, answers, bookings, booked days,
-- conversations and messages, with the rules that make double booking and
-- overbooking impossible.

-- ---------------------------------------------------------------------------
-- shifts and their days
-- ---------------------------------------------------------------------------
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.members(id),
  mode text not null check (mode in ('post','request')),
  status text not null default 'open' check (status in ('open','filled','closed','expired')),
  team text not null check (team in ('Kitchen','Pastry','Bar','Sommelier','Floor')),
  positions text[] not null check (cardinality(positions) > 0),
  capacity smallint not null check (capacity between 1 and 5),
  rate_pence integer not null check (rate_pence > 0),
  start_time time not null,
  end_time time not null,
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by text check (closed_by in ('venue','dyuknow','all-declined')),
  close_reason text,
  updated_at timestamptz not null default now(),
  check (start_time <> end_time),
  check ((status = 'closed') = (closed_at is not null and closed_by is not null)),
  check (closed_by is null or closed_by = 'all-declined' or nullif(btrim(close_reason), '') is not null)
);
create index shifts_venue_idx on public.shifts (venue_id, created_at desc);
create index shifts_status_mode_idx on public.shifts (status, mode);
create index shifts_positions_gin on public.shifts using gin (positions);
create trigger shifts_set_updated_at before update on public.shifts
  for each row execute function public.set_updated_at();

create function private.check_shift_positions()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from unnest(new.positions) p
             where not exists (select 1 from public.positions x where x.name = p and x.team = new.team)) then
    raise exception 'Choose the position you need.';
  end if;
  return new;
end $$;
create trigger shifts_positions before insert or update of positions, team on public.shifts
  for each row execute function private.check_shift_positions();

create table public.shift_days (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  day_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  booked_count smallint not null default 0 check (booked_count >= 0),
  unique (shift_id, day_date),
  unique (id, shift_id),
  unique (id, shift_id, starts_at, ends_at),
  check (ends_at > starts_at)
);
create index shift_days_starts_idx on public.shift_days (starts_at);

-- ---------------------------------------------------------------------------
-- answers: one person's request or yes on one shift
-- ---------------------------------------------------------------------------
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  talent_id uuid not null references public.members(id),
  source text not null check (source in ('invite','response')),
  status text not null check (status in ('invited','can-cover','booked','declined','withdrawn','not-selected','lapsed','cancelled')),
  end_reason text check (end_reason in ('filled','venue-closed','booked-elsewhere','shift-started','unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, talent_id),
  unique (id, shift_id),
  check ((status in ('not-selected','lapsed')) = (end_reason is not null)),
  check (status <> 'not-selected' or end_reason in ('filled','venue-closed')),
  check (status <> 'lapsed' or end_reason in ('booked-elsewhere','shift-started','unavailable'))
);
create index answers_talent_idx on public.answers (talent_id, status);
create index answers_shift_idx on public.answers (shift_id, status);
create trigger answers_set_updated_at before update on public.answers
  for each row execute function public.set_updated_at();

create table public.answer_days (
  answer_id uuid not null,
  shift_id uuid not null,
  shift_day_id uuid not null,
  primary key (answer_id, shift_day_id),
  foreign key (answer_id, shift_id) references public.answers(id, shift_id) on delete cascade,
  foreign key (shift_day_id, shift_id) references public.shift_days(id, shift_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- bookings and booked days
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null,
  talent_id uuid not null,
  status text not null default 'active' check (status in ('active','cancelled')),
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  reminded_at timestamptz,
  foreign key (shift_id, talent_id) references public.answers(shift_id, talent_id),
  unique (id, shift_id, talent_id),
  check ((status = 'cancelled') = (cancelled_at is not null))
);
create unique index bookings_one_live on public.bookings (shift_id, talent_id) where status = 'active';
create index bookings_talent_idx on public.bookings (talent_id);
create index bookings_shift_idx on public.bookings (shift_id);
create index bookings_remind_idx on public.bookings (booked_at) where status = 'active' and reminded_at is null;

create table public.booking_days (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  shift_day_id uuid not null,
  shift_id uuid not null,
  talent_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked','worked','no-show','cancelled')),
  recorded_at timestamptz,
  recorded_by uuid references public.members(id),
  auto_confirmed boolean not null default false,
  worked_start_time time,
  worked_end_time time,
  worked_minutes integer check (worked_minutes > 0),
  pay_pence integer check (pay_pence >= 0),
  cancel_reason text,
  created_at timestamptz not null default now(),
  foreign key (booking_id, shift_id, talent_id) references public.bookings(id, shift_id, talent_id),
  foreign key (shift_day_id, shift_id, starts_at, ends_at) references public.shift_days(id, shift_id, starts_at, ends_at),
  -- No double booking: one talent can't hold two overlapping live days.
  constraint booking_days_no_overlap exclude using gist (
    talent_id with =, tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled'),
  check (status <> 'booked' or (recorded_at is null and worked_minutes is null and pay_pence is null and cancel_reason is null)),
  check (status <> 'worked' or (recorded_at is not null and worked_start_time is not null and worked_end_time is not null
                                and worked_minutes is not null and pay_pence is not null and (auto_confirmed or recorded_by is not null))),
  check (status <> 'no-show' or (recorded_at is not null and recorded_by is not null)),
  check (status <> 'cancelled' or (recorded_at is not null and recorded_by is not null and nullif(btrim(cancel_reason), '') is not null))
);
create unique index booking_days_one_live on public.booking_days (booking_id, shift_day_id) where status <> 'cancelled';
create index booking_days_status_ends_idx on public.booking_days (status, ends_at);

-- Capacity: lock the day, refuse a live row once the day is full, keep the count.
create function private.booking_days_capacity()
returns trigger language plpgsql set search_path = '' as $$
declare v_count smallint; v_cap smallint;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'cancelled' then
      select d.booked_count, s.capacity into v_count, v_cap
        from public.shift_days d join public.shifts s on s.id = d.shift_id
        where d.id = new.shift_day_id for update of d;
      if v_count >= v_cap then
        raise exception using errcode = 'DK001', message = 'This day is already full.';
      end if;
      update public.shift_days set booked_count = booked_count + 1 where id = new.shift_day_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.status in ('worked','no-show','cancelled') then
      raise exception 'This day has already been recorded.';
    end if;
    if new.status = 'cancelled' then
      perform 1 from public.shift_days where id = new.shift_day_id for update;
      update public.shift_days set booked_count = booked_count - 1 where id = new.shift_day_id;
    end if;
  end if;
  return new;
end $$;
create trigger booking_days_capacity before insert or update on public.booking_days
  for each row execute function private.booking_days_capacity();

-- ---------------------------------------------------------------------------
-- conversations, messages, read markers
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.members(id),
  talent_id uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  last_seq integer not null default 0,
  last_message_at timestamptz,
  unique (venue_id, talent_id)
);
create index conversations_venue_idx on public.conversations (venue_id, last_message_at desc);
create index conversations_talent_idx on public.conversations (talent_id, last_message_at desc);

create function private.check_conversation_sides()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.members where id = new.venue_id and side = 'venue')
     or not exists (select 1 from public.members where id = new.talent_id and side = 'talent') then
    raise exception 'Venues and talent can message each other.';
  end if;
  return new;
end $$;
create trigger conversations_sides before insert on public.conversations
  for each row execute function private.check_conversation_sides();

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  seq integer not null,
  kind text not null check (kind in ('text','card','event')),
  sender_id uuid references public.members(id),
  body text not null,
  shift_id uuid references public.shifts(id),
  created_at timestamptz not null default now(),
  unique (conversation_id, seq),
  check (kind = 'event' or sender_id is not null),
  check (kind <> 'card' or shift_id is not null),
  check (kind <> 'text' or char_length(btrim(body)) between 1 and 2000)
);

create function private.check_message_sender()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.sender_id is not null and not exists (
    select 1 from public.conversations c
    where c.id = new.conversation_id and new.sender_id in (c.venue_id, c.talent_id)) then
    raise exception 'This conversation is private.';
  end if;
  return new;
end $$;
create trigger messages_sender before insert on public.messages
  for each row execute function private.check_message_sender();

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  last_read_seq integer not null default 0,
  read_at timestamptz not null default now(),
  primary key (conversation_id, member_id)
);

-- Find or start the one conversation for a venue and talent pair.
create function private.conversation_for(p_venue uuid, p_talent uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.conversations (venue_id, talent_id) values (p_venue, p_talent)
  on conflict (venue_id, talent_id) do nothing;
  select id into v_id from public.conversations where venue_id = p_venue and talent_id = p_talent;
  return v_id;
end $$;

-- Add a message, taking the conversation's next seq under its lock.
create function private.add_message(p_conversation uuid, p_kind text, p_sender uuid, p_body text, p_shift uuid default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_seq integer; v_id bigint; v_t timestamptz := clock_timestamp();
begin
  update public.conversations
     set last_seq = last_seq + 1, last_message_at = v_t
   where id = p_conversation
  returning last_seq into v_seq;
  insert into public.messages (conversation_id, seq, kind, sender_id, body, shift_id, created_at)
  values (p_conversation, v_seq, p_kind, p_sender, p_body, p_shift, v_t)
  returning id into v_id;
  return v_id;
end $$;

-- Cards and grey lines between a shift's venue and one talent.
create function private.add_card(p_shift uuid, p_talent uuid, p_sender uuid, p_body text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_venue uuid;
begin
  select venue_id into v_venue from public.shifts where id = p_shift;
  return private.add_message(private.conversation_for(v_venue, p_talent), 'card', p_sender, p_body, p_shift);
end $$;

create function private.add_event(p_shift uuid, p_talent uuid, p_body text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_venue uuid;
begin
  select venue_id into v_venue from public.shifts where id = p_shift;
  return private.add_message(private.conversation_for(v_venue, p_talent), 'event', null, p_body, p_shift);
end $$;

revoke all on function private.conversation_for(uuid, uuid), private.add_message(uuid, text, uuid, text, uuid),
  private.add_card(uuid, uuid, uuid, text), private.add_event(uuid, uuid, text),
  private.check_message_sender(), private.check_conversation_sides(), private.booking_days_capacity(),
  private.check_shift_positions(), private.check_profile_side(), private.on_approval_change(),
  private.valid_free_text_items(text[]), private.postcode_area(text)
  from public, anon, authenticated;
