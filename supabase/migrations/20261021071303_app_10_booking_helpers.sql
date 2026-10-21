-- Dyuknow app backend, step 10: helpers for the booking engine.
-- Text formats, which days count, the message buffer and locking.
-- Every step reads the call's clock t; none reads now().

-- ---------------------------------------------------------------------------
-- Text formats (The booking engine -> Text formats)
-- ---------------------------------------------------------------------------
-- 'Sept' follows the app's en-GB date format.
create function private.fmt_month(d date)
returns text language sql immutable set search_path = '' as $$
  select case when extract(month from d) = 9 then 'Sept' else to_char(d, 'Mon') end;
$$;

-- Thu 8 Oct
create function private.fmt_date(d date)
returns text language sql immutable set search_path = '' as $$
  select to_char(d, 'Dy') || ' ' || extract(day from d)::int || ' ' || private.fmt_month(d);
$$;

-- Thu 8 (no month) or Thu 8 Oct
create function private.fmt_day(d date, p_short boolean)
returns text language sql immutable set search_path = '' as $$
  select case when p_short then to_char(d, 'Dy') || ' ' || extract(day from d)::int
              else private.fmt_date(d) end;
$$;

-- Dates label: Thu 8 Oct; Mon 5–Wed 7 Oct; Sat 3–Sun 4, Tue 6 Oct
create function private.fmt_dates(p date[])
returns text language plpgsql immutable set search_path = '' as $$
declare
  ds date[];
  same boolean;
  parts text[] := '{}';
  g_start date;
  g_end date;
  i int;
begin
  select array_agg(distinct x order by x) into ds from unnest(p) x where x is not null;
  if ds is null then return ''; end if;
  if cardinality(ds) = 1 then return private.fmt_date(ds[1]); end if;
  select count(distinct date_trunc('month', x)) = 1 into same from unnest(ds) x;
  g_start := ds[1]; g_end := ds[1];
  for i in 2 .. cardinality(ds) + 1 loop
    if i <= cardinality(ds) and ds[i] = g_end + 1 then
      g_end := ds[i];
    else
      parts := parts || case when g_start = g_end then private.fmt_day(g_start, same)
                             else private.fmt_day(g_start, same) || '–' || private.fmt_day(g_end, same) end;
      if i <= cardinality(ds) then g_start := ds[i]; g_end := ds[i]; end if;
    end if;
  end loop;
  return array_to_string(parts, ', ') || case when same then ' ' || private.fmt_month(ds[1]) else '' end;
end $$;

create function private.fmt_time(t time)
returns text language sql immutable set search_path = '' as $$
  select to_char(t, 'HH24:MI');
$$;

-- £18, £18.50
create function private.fmt_pay(p_pence integer)
returns text language sql immutable set search_path = '' as $$
  select '£' || (p_pence / 100)::text
         || case when p_pence % 100 <> 0 then '.' || lpad((p_pence % 100)::text, 2, '0') else '' end;
$$;

-- 6, 7.5
create function private.fmt_hours(p_minutes integer)
returns text language sql immutable set search_path = '' as $$
  select trim_scale(round(p_minutes / 60.0, 2))::text;
$$;

-- Thu 8 Oct · 17:00–23:00, or Thu 8 Oct · 22:00 → Fri 9 Oct 02:00
create function private.service_label(d date, p_start time, p_end time)
returns text language sql immutable set search_path = '' as $$
  select private.fmt_date(d) || ' · ' || private.fmt_time(p_start)
         || case when p_end < p_start then ' → ' || private.fmt_date(d + 1) || ' ' || private.fmt_time(p_end)
                 else '–' || private.fmt_time(p_end) end;
$$;

-- CDP or Sous Chef
create function private.shift_label(p_positions text[])
returns text language sql immutable set search_path = '' as $$
  select array_to_string(p_positions, ' or ');
$$;

-- Talent: full_name. Venue: display_name.
create function private.member_name(p_member uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(case m.side when 'talent' then t.full_name else v.display_name end, '')
  from public.members m
  left join public.talents t on t.member_id = m.id
  left join public.venues v on v.member_id = m.id
  where m.id = p_member;
$$;

-- Talent: first word of full_name. Venue: the whole display_name.
create function private.first_name(p_member uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(case m.side when 'talent' then split_part(btrim(t.full_name), ' ', 1) else v.display_name end, '')
  from public.members m
  left join public.talents t on t.member_id = m.id
  left join public.venues v on v.member_id = m.id
  where m.id = p_member;
$$;

-- The London dates of a set of shift days.
create function private.day_dates(p_days uuid[])
returns date[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(day_date order by day_date), '{}') from public.shift_days where id = any(p_days);
$$;

create function private.days_label(p_days uuid[])
returns text language sql stable security definer set search_path = '' as $$
  select private.fmt_dates(private.day_dates(p_days));
$$;

-- 17:00–23:00
create function private.shift_hours(p_shift uuid)
returns text language sql stable security definer set search_path = '' as $$
  select private.fmt_time(start_time) || '–' || private.fmt_time(end_time) from public.shifts where id = p_shift;
$$;

-- Every day of a shift, in date order.
create function private.all_days(p_shift uuid)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(id order by day_date), '{}') from public.shift_days where shift_id = p_shift;
$$;

-- ---------------------------------------------------------------------------
-- Which days count (The booking engine -> Which days count)
-- ---------------------------------------------------------------------------
-- Days with a place left that start after t.
create function private.open_days(p_shift uuid, p_t timestamptz)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(d.id order by d.day_date), '{}')
  from public.shift_days d join public.shifts s on s.id = d.shift_id
  where d.shift_id = p_shift and d.booked_count < s.capacity and d.starts_at > p_t;
$$;

-- Open days that don't overlap the talent's live booked days on other shifts.
create function private.free_days(p_talent uuid, p_shift uuid, p_t timestamptz)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(d.id order by d.day_date), '{}')
  from public.shift_days d join public.shifts s on s.id = d.shift_id
  where d.shift_id = p_shift and d.booked_count < s.capacity and d.starts_at > p_t
    and not exists (
      select 1 from public.booking_days bd
      where bd.talent_id = p_talent and bd.status <> 'cancelled' and bd.shift_id <> p_shift
        and bd.starts_at < d.ends_at and d.starts_at < bd.ends_at);
$$;

-- An invited answer offers every day; any other answer offers its answer_days.
create function private.offered_days(p_answer uuid)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select case when a.status = 'invited' then private.all_days(a.shift_id)
              else (select coalesce(array_agg(ad.shift_day_id), '{}') from public.answer_days ad where ad.answer_id = a.id) end
  from public.answers a where a.id = p_answer;
$$;

-- The talent's live booked days on this shift (their active booking).
create function private.booked_days_here(p_talent uuid, p_shift uuid)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(bd.shift_day_id), '{}')
  from public.booking_days bd join public.bookings b on b.id = bd.booking_id
  where b.shift_id = p_shift and b.talent_id = p_talent and b.status = 'active' and bd.status <> 'cancelled';
$$;

-- Offered days that are also free: what the answer could still lead to.
create function private.waiting_days(p_answer uuid, p_t timestamptz)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(x), '{}')
  from public.answers a,
       unnest(private.offered_days(a.id)) x
  where a.id = p_answer and x = any(private.free_days(a.talent_id, a.shift_id, p_t));
$$;

-- waiting_days minus days already in the person's active booking here.
create function private.bookable_days(p_answer uuid, p_t timestamptz)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(x), '{}')
  from public.answers a,
       unnest(private.waiting_days(a.id, p_t)) x
  where a.id = p_answer and not (x = any(private.booked_days_here(a.talent_id, a.shift_id)));
$$;

-- The shift's status as of t. An open shift with no open day left and a day
-- short of people counts as expired.
create function private.shift_state_now(p_shift uuid, p_t timestamptz)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when s.status <> 'open' then s.status
    when cardinality(private.open_days(s.id, p_t)) > 0 then 'open'
    when exists (select 1 from public.shift_days d where d.shift_id = s.id and d.booked_count < s.capacity) then 'expired'
    else 'filled' end
  from public.shifts s where s.id = p_shift;
$$;

-- The talent's live answer on another shift of this venue that overlaps the
-- days of p_shift: invited or can-cover on an open shift, or booked.
create function private.open_answer(p_venue uuid, p_talent uuid, p_shift uuid, p_t timestamptz)
returns text language sql stable security definer set search_path = '' as $$
  select a.status
  from public.answers a join public.shifts s on s.id = a.shift_id
  where a.talent_id = p_talent and a.shift_id <> p_shift and s.venue_id = p_venue
    and (
      (a.status in ('invited','can-cover') and private.shift_state_now(s.id, p_t) = 'open'
        and exists (select 1 from public.shift_days od join public.shift_days nd on nd.shift_id = p_shift
                    where od.id = any(private.offered_days(a.id))
                      and od.starts_at < nd.ends_at and nd.starts_at < od.ends_at))
      or
      (a.status = 'booked'
        and exists (select 1 from public.booking_days bd join public.bookings b on b.id = bd.booking_id
                    join public.shift_days nd on nd.shift_id = p_shift
                    where b.shift_id = a.shift_id and b.talent_id = p_talent and b.status = 'active'
                      and bd.status <> 'cancelled'
                      and bd.starts_at < nd.ends_at and nd.starts_at < bd.ends_at)))
  order by case a.status when 'booked' then 0 when 'invited' then 1 else 2 end, a.shift_id
  limit 1;
$$;

-- A booking request with capacity 1 where exactly one answer has source invite.
create function private.book_on_accept(p_shift uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select s.mode = 'request' and s.capacity = 1
     and (select count(*) from public.answers a where a.shift_id = s.id and a.source = 'invite') = 1
  from public.shifts s where s.id = p_shift;
$$;

-- An open booking request with no active booking, where every invite answer
-- (at least one) is declined, withdrawn, or lapsed as booked-elsewhere or unavailable.
create function private.declined_by_all(p_shift uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select s.mode = 'request' and s.status = 'open'
     and not exists (select 1 from public.bookings b where b.shift_id = s.id and b.status = 'active')
     and exists (select 1 from public.answers a where a.shift_id = s.id and a.source = 'invite')
     and not exists (select 1 from public.answers a where a.shift_id = s.id and a.source = 'invite'
                     and not (a.status in ('declined','withdrawn')
                              or (a.status = 'lapsed' and a.end_reason in ('booked-elsewhere','unavailable'))))
  from public.shifts s where s.id = p_shift;
$$;

-- Who a job post alerts.
create function private.alert_recipients(p_shift uuid, p_t timestamptz)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.id
  from public.shifts s
  join public.talents t on t.positions && s.positions
  join public.members m on m.id = t.member_id
  where s.id = p_shift
    and m.side = 'talent' and m.approved and m.deleted_at is null and m.deletion_requested_at is null
    and (t.shift_alerts = 'all'
         or (t.shift_alerts = 'soon'
             and (select min(d.day_date) from public.shift_days d where d.shift_id = s.id)
                 <= private.london_date(p_t) + 1))
    and cardinality(private.free_days(m.id, s.id, p_t)) > 0
  order by m.id;
$$;

-- Other shifts where the talent has an invited, can-cover or booked answer
-- whose days overlap any day of p_shift: the shifts a booking may change.
create function private.clash_shifts(p_talent uuid, p_shift uuid)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct a.shift_id), '{}')
  from public.answers a
  where a.talent_id = p_talent and a.shift_id <> p_shift
    and a.status in ('invited','can-cover','booked')
    and exists (select 1 from public.shift_days od join public.shift_days nd on nd.shift_id = p_shift
                where od.shift_id = a.shift_id and od.starts_at < nd.ends_at and nd.starts_at < od.ends_at);
$$;

-- ---------------------------------------------------------------------------
-- make_days: drop repeats, sort, check 1 to 14 dates and different times,
-- and work out each day's exact start and end.
-- ---------------------------------------------------------------------------
create function private.make_days(p_dates date[], p_start time, p_end time)
returns table (day_date date, starts_at timestamptz, ends_at timestamptz)
language plpgsql stable set search_path = '' as $$
declare ds date[]; d date;
begin
  select array_agg(distinct x order by x) into ds from unnest(p_dates) x where x is not null;
  if ds is null or cardinality(ds) < 1 or cardinality(ds) > 14 then
    raise exception 'Choose between 1 and 14 dates.';
  end if;
  if p_start is null or p_end is null or p_start = p_end then
    raise exception 'Choose different start and end times.';
  end if;
  foreach d in array ds loop
    day_date := d;
    starts_at := private.london_instant(d, p_start);
    ends_at := private.london_instant(case when p_end < p_start then d + 1 else d end, p_end);
    return next;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Message buffer: cards and grey lines are collected during a call and saved
-- at its end, sorted by conversation id (see Locking). The buffer lives in a
-- transaction-local setting, so an undone attempt also undoes its buffer.
-- ---------------------------------------------------------------------------
create function private.buf_reset()
returns void language sql set search_path = '' as $$
  select set_config('dyuknow.msgs', '[]', true);
$$;

create function private.buf_add(p_shift uuid, p_talent uuid, p_kind text, p_sender uuid, p_body text)
returns void language plpgsql set search_path = '' as $$
declare cur jsonb := coalesce(nullif(current_setting('dyuknow.msgs', true), ''), '[]')::jsonb;
begin
  perform set_config('dyuknow.msgs',
    (cur || jsonb_build_array(jsonb_build_object('s', p_shift, 't', p_talent, 'k', p_kind, 'f', p_sender, 'b', p_body)))::text,
    true);
end $$;

create function private.queue_card(p_shift uuid, p_talent uuid, p_sender uuid, p_body text)
returns void language sql set search_path = '' as $$
  select private.buf_add(p_shift, p_talent, 'card', p_sender, p_body);
$$;

create function private.queue_event(p_shift uuid, p_talent uuid, p_body text)
returns void language sql set search_path = '' as $$
  select private.buf_add(p_shift, p_talent, 'event', null, p_body);
$$;

create function private.buf_flush()
returns void language plpgsql security definer set search_path = '' as $$
declare
  cur jsonb := coalesce(nullif(current_setting('dyuknow.msgs', true), ''), '[]')::jsonb;
  r record;
begin
  if jsonb_array_length(cur) = 0 then return; end if;
  -- Find or start each conversation, in (venue, talent) order.
  for r in
    select distinct s.venue_id, (e->>'t')::uuid as talent_id
    from jsonb_array_elements(cur) e join public.shifts s on s.id = (e->>'s')::uuid
    order by 1, 2
  loop
    perform private.conversation_for(r.venue_id, r.talent_id);
  end loop;
  -- Add the messages, conversation by conversation in id order, each in the
  -- order it happened.
  for r in
    select c.id as conv, e->>'k' as kind, nullif(e->>'f', '')::uuid as sender, e->>'b' as body,
           (e->>'s')::uuid as shift_id, o
    from jsonb_array_elements(cur) with ordinality x(e, o)
    join public.shifts s on s.id = (e->>'s')::uuid
    join public.conversations c on c.venue_id = s.venue_id and c.talent_id = (e->>'t')::uuid
    order by c.id, o
  loop
    perform private.add_message(r.conv, r.kind, r.sender, r.body, r.shift_id);
  end loop;
  perform private.buf_reset();
end $$;

-- ---------------------------------------------------------------------------
-- Locking: shifts in id order, then members in id order. The caller locks a
-- booking and its days next, if any, then reads the clock with settle_all.
-- "Start again" is SQLSTATE DK002, caught by the wrapper in every function.
-- ---------------------------------------------------------------------------
create function private.lock_set(p_shifts uuid[], p_members uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.shifts where id = any(p_shifts) order by id for update;
  perform 1 from public.members where id = any(p_members) order by id for update;
end $$;

create function private.restart_if_grown(p_locked uuid[], p_found uuid[])
returns void language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from unnest(p_found) x where not (x = any(p_locked))) then
    raise exception using errcode = 'DK002', message = 'Start again.';
  end if;
end $$;

-- The caller's row after the locks: deleted, wrong side, not approved.
create function private.check_me(p_me uuid, p_side text, p_need_approval boolean, p_side_msg text)
returns public.members language plpgsql stable security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where id = p_me;
  if not found or m.deleted_at is not null then
    raise exception 'Sign in to continue.';
  end if;
  if p_side is not null and m.side <> p_side then
    raise exception '%', p_side_msg;
  end if;
  if p_need_approval and not m.approved then
    raise exception 'Your profile is waiting for approval.';
  end if;
  return m;
end $$;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname in (
      'fmt_month','fmt_date','fmt_day','fmt_dates','fmt_time','fmt_pay','fmt_hours','service_label',
      'shift_label','member_name','first_name','day_dates','days_label','shift_hours','all_days',
      'open_days','free_days','offered_days','booked_days_here','waiting_days','bookable_days',
      'shift_state_now','open_answer','book_on_accept','declined_by_all','alert_recipients',
      'clash_shifts','make_days','buf_reset','buf_add','queue_card','queue_event','buf_flush',
      'lock_set','restart_if_grown','check_me')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
