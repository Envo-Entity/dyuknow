-- Dyuknow app backend, step 12: the functions the app calls to change shifts,
-- answers and bookings. Each public function finds the caller, records the
-- call receipt, then runs its private *_work step inside a savepoint. After a
-- "start again" (DK002) or a deadlock it undoes that attempt and tries again,
-- at most twice more. Cards and lines are saved at the end, sorted by
-- conversation id.

-- ---------------------------------------------------------------------------
-- post_shift
-- ---------------------------------------------------------------------------
create function private.post_shift_work(p_me uuid, p_team text, p_positions text[], p_dates date[],
  p_start_time time, p_end_time time, p_capacity int, p_rate_pence int, p_note text, p_to uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz;
  v_to uuid[];
  v_pos text[];
  v_shift uuid;
  v_first timestamptz;
  v_last date;
  v_mode text;
  v_in_position int;
  v_alerted int := 0;
  r record;
  x uuid;
  s public.shifts;
begin
  select coalesce(array_agg(u order by o), '{}') into v_to
  from (select u, min(o) as o from unnest(p_to) with ordinality y(u, o) where u is not null group by u) z;
  perform private.lock_set('{}', array[p_me] || v_to);
  t := clock_timestamp();
  perform private.check_me(p_me, 'venue', true, 'Only venues can send shifts.');

  select coalesce(array_agg(u order by o), '{}') into v_pos
  from (select u, min(o) as o from unnest(p_positions) with ordinality y(u, o) where u is not null group by u) z;
  if cardinality(v_pos) = 0
     or exists (select 1 from unnest(v_pos) p
                where not exists (select 1 from public.positions pp where pp.name = p and pp.team = p_team)) then
    raise exception 'Choose the position you need.';
  end if;
  if p_rate_pence is null or p_rate_pence <= 0 then
    raise exception 'Add the pay per hour.';
  end if;
  if p_capacity is null or p_capacity < 1 or p_capacity > 5 then
    raise exception 'Choose between 1 and 5 people.';
  end if;
  if char_length(coalesce(p_note, '')) > 2000 then
    raise exception 'Keep the note under 2,000 characters.';
  end if;

  select min(md.starts_at), max(md.day_date) into v_first, v_last
  from private.make_days(p_dates, p_start_time, p_end_time) md;
  if v_first <= t then
    raise exception 'That start time has passed.';
  end if;
  if v_last > private.london_date(t) + 55 then
    raise exception 'Choose dates in the next 8 weeks.';
  end if;

  v_mode := case when cardinality(v_to) > 0 then 'request' else 'post' end;
  insert into public.shifts (venue_id, mode, status, team, positions, capacity, rate_pence, start_time, end_time,
                             note, created_at, updated_at)
  values (p_me, v_mode, 'open', p_team, v_pos, p_capacity, p_rate_pence, p_start_time, p_end_time,
          coalesce(p_note, ''), t, t)
  returning id into v_shift;
  insert into public.shift_days (shift_id, day_date, starts_at, ends_at)
  select v_shift, md.day_date, md.starts_at, md.ends_at
  from private.make_days(p_dates, p_start_time, p_end_time) md order by md.day_date;

  if v_mode = 'request' then
    foreach x in array v_to loop
      perform private.send_request(v_shift, x, t);
    end loop;
  else
    select * into s from public.shifts where id = v_shift;
    for r in select private.alert_recipients(v_shift, t) as id loop
      perform private.notify(r.id, 'job-posted', private.member_name(p_me) || ' posted a job',
        private.shift_label(s.positions) || ' · '
          || case when (select count(*) from public.shift_days where shift_id = v_shift) > 1
                  then private.days_label(private.all_days(v_shift)) || ' · ' || private.shift_hours(v_shift)
                  else (select private.service_label(day_date, s.start_time, s.end_time)
                        from public.shift_days where shift_id = v_shift) end
          || ' · ' || private.fmt_pay(s.rate_pence) || '/h',
        'shift/' || v_shift, p_me, v_shift, null);
      v_alerted := v_alerted + 1;
    end loop;
  end if;

  select count(*) into v_in_position
  from public.talents tl join public.members m on m.id = tl.member_id
  where m.side = 'talent' and m.approved and m.deleted_at is null and tl.positions && v_pos;

  return jsonb_build_object('shift_id', v_shift, 'mode', v_mode,
                            'in_position_count', v_in_position, 'alerted_count', v_alerted);
end $$;

create function public.post_shift(p_team text, p_positions text[], p_dates date[], p_start_time time,
  p_end_time time, p_capacity int, p_rate_pence int, p_note text default '', p_to uuid[] default '{}',
  p_client_ref uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.members; v jsonb; n int := 0;
begin
  me := private.require_member();
  v := private.receipt_begin(me.id, p_client_ref, 'post_shift');
  if v is not null then return v; end if;
  loop
    begin
      perform private.buf_reset();
      v := private.post_shift_work(me.id, p_team, p_positions, p_dates, p_start_time, p_end_time,
                                   p_capacity, p_rate_pence, p_note, p_to);
      perform private.buf_flush();
      exit;
    exception when deadlock_detected or sqlstate 'DK002' then
      n := n + 1;
      if n >= 3 then raise exception 'Couldn’t save. Try again.'; end if;
    end;
  end loop;
  return private.receipt_end(me.id, p_client_ref, v);
end $$;

-- ---------------------------------------------------------------------------
-- send_to_more
-- ---------------------------------------------------------------------------
create function private.send_to_more_work(p_me uuid, p_shift uuid, p_talents uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz;
  v_to uuid[];
  s public.shifts;
  x uuid;
  v_sent int := 0;
begin
  select coalesce(array_agg(u order by o), '{}') into v_to
  from (select u, min(o) as o from unnest(p_talents) with ordinality y(u, o) where u is not null group by u) z;
  perform private.lock_set(array[p_shift], array[p_me] || v_to);
  t := private.settle_all(array[p_shift]);
  perform private.check_me(p_me, 'venue', true, 'This shift no longer exists.');
  select * into s from public.shifts where id = p_shift;
  if not found or s.venue_id <> p_me then
    raise exception 'This shift no longer exists.';
  end if;
  if s.status <> 'open' or cardinality(private.open_days(p_shift, t)) = 0 then
    raise exception 'This shift is no longer open.';
  end if;
  if cardinality(v_to) = 0 then
    raise exception 'Choose at least one person.';
  end if;
  foreach x in array v_to loop
    if private.send_request(p_shift, x, t) then v_sent := v_sent + 1; end if;
  end loop;
  return jsonb_build_object('sent', v_sent);
end $$;

create function public.send_to_more(p_shift_id uuid, p_talent_ids uuid[], p_client_ref uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.members; v jsonb; n int := 0;
begin
  me := private.require_member();
  v := private.receipt_begin(me.id, p_client_ref, 'send_to_more');
  if v is not null then return v; end if;
  loop
    begin
      perform private.buf_reset();
      v := private.send_to_more_work(me.id, p_shift_id, p_talent_ids);
      perform private.buf_flush();
      exit;
    exception when deadlock_detected or sqlstate 'DK002' then
      n := n + 1;
      if n >= 3 then raise exception 'Couldn’t save. Try again.'; end if;
    end;
  end loop;
  return private.receipt_end(me.id, p_client_ref, v);
end $$;

-- ---------------------------------------------------------------------------
-- say_yes
-- ---------------------------------------------------------------------------
-- Maps London dates to this shift's day ids; null when a date isn't a day of it.
create function private.shift_day_ids(p_shift uuid, p_dates date[])
returns uuid[] language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from unnest(p_dates) x
                           where x is not null and not exists (select 1 from public.shift_days d
                                                               where d.shift_id = p_shift and d.day_date = x))
              then null
              else (select coalesce(array_agg(d.id order by d.day_date), '{}') from public.shift_days d
                    where d.shift_id = p_shift and d.day_date = any(p_dates)) end;
$$;

create function private.say_yes_work(p_me uuid, p_shift uuid, p_dates date[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz;
  v_shifts uuid[];
  me public.members;
  s public.shifts;
  a public.answers;
  v_free uuid[];
  v_mine uuid[];
  v_offered uuid[];
  v_add uuid[];
  v_given uuid[];
  v_days uuid[];
  v_all int;
  v_visible boolean;
  v_accept boolean;
  v_booking uuid;
  v_answer uuid;
  v_label text;
begin
  v_shifts := array[p_shift] || private.clash_shifts(p_me, p_shift);
  perform private.lock_set(v_shifts, array[p_me]);
  perform private.restart_if_grown(v_shifts, private.clash_shifts(p_me, p_shift));
  t := private.settle_all(v_shifts);
  me := private.check_me(p_me, 'talent', true, 'Choose a talent member.');

  select * into s from public.shifts where id = p_shift;
  select * into a from public.answers where shift_id = p_shift and talent_id = p_me;
  v_visible := s.id is not null and (a.id is not null
    or (s.mode = 'post' and s.status in ('open','expired')
        and exists (select 1 from public.members v where v.id = s.venue_id and v.approved and v.deleted_at is null)));
  if not v_visible then
    raise exception 'This shift no longer exists.';
  end if;
  if s.status = 'expired' then
    raise exception 'This shift has already started.';
  end if;
  if s.status <> 'open' or cardinality(private.open_days(p_shift, t)) = 0 then
    raise exception 'This shift is no longer available.';
  end if;

  v_free := private.free_days(p_me, p_shift, t);
  v_mine := private.booked_days_here(p_me, p_shift);
  v_offered := case when a.id is null then '{}'::uuid[] else private.offered_days(a.id) end;
  select coalesce(array_agg(x), '{}') into v_add from unnest(v_free) x
   where not (x = any(v_mine)) and not (x = any(v_offered));

  if a.status = 'can-cover' or (a.status = 'booked' and cardinality(v_add) = 0) then
    raise exception 'You’ve already said yes to this.';
  end if;
  if coalesce(a.status, '') not in ('invited','booked','cancelled')
     and (s.mode = 'request'
          or not exists (select 1 from public.talents tl where tl.member_id = p_me and tl.positions && s.positions)) then
    raise exception 'This job is for other positions.';
  end if;

  if p_dates is null or cardinality(array_remove(p_dates, null)) = 0 then
    if cardinality(v_free) = 0 then
      raise exception 'You’re booked elsewhere at that time.';
    end if;
    v_given := null;
  else
    v_given := private.shift_day_ids(p_shift, p_dates);
    if v_given is null then
      raise exception 'Choose dates from this shift.';
    end if;
    if exists (select 1 from unnest(v_given) x where not (x = any(v_free)) or x = any(v_mine)) then
      raise exception 'One of those days isn’t available any more. Check the days and try again.';
    end if;
  end if;

  v_all := cardinality(private.all_days(p_shift));
  if a.status = 'booked' then
    -- Offering more days on a booking.
    v_days := coalesce(v_given, v_add);
    insert into public.answer_days (answer_id, shift_id, shift_day_id)
    select a.id, p_shift, x from unnest(v_days) x
    on conflict do nothing;
    v_label := private.days_label(v_days);
    perform private.queue_card(p_shift, p_me, p_me, 'Can also do ' || v_label);
    perform private.notify(s.venue_id, 'said-yes', private.member_name(p_me) || ' can do it',
      private.shift_label(s.positions) || ' · ' || v_label || ' · ' || private.shift_hours(p_shift)
        || case when cardinality(v_days) < v_all then ' (' || cardinality(v_days) || ' of ' || v_all || ' days)' else '' end,
      'shift/' || p_shift, p_me, p_shift, null);
    return jsonb_build_object('result', 'said-yes', 'booking_id', null);
  end if;

  v_days := coalesce(v_given, v_free);
  v_accept := a.status = 'invited' and private.book_on_accept(p_shift);
  if a.id is not null then
    update public.answers set status = 'can-cover', end_reason = null where id = a.id;
    v_answer := a.id;
  else
    insert into public.answers (shift_id, talent_id, source, status, created_at, updated_at)
    values (p_shift, p_me, 'response', 'can-cover', t, t) returning id into v_answer;
  end if;
  delete from public.answer_days where answer_id = v_answer;
  insert into public.answer_days (answer_id, shift_id, shift_day_id)
  select v_answer, p_shift, x from unnest(v_days) x;

  if v_accept then
    v_booking := private.book_days(p_shift, v_answer, v_days, true, t, p_me);
    return jsonb_build_object('result', 'booked', 'booking_id', v_booking);
  end if;

  v_label := private.days_label(v_days);
  perform private.queue_card(p_shift, p_me, p_me,
    case when cardinality(v_days) < v_all then 'Can do ' || v_label else 'Can do it' end);
  perform private.notify(s.venue_id, 'said-yes', private.member_name(p_me) || ' can do it',
    private.shift_label(s.positions) || ' · ' || v_label || ' · ' || private.shift_hours(p_shift)
      || case when cardinality(v_days) < v_all then ' (' || cardinality(v_days) || ' of ' || v_all || ' days)' else '' end,
    'shift/' || p_shift, p_me, p_shift, null);
  return jsonb_build_object('result', 'said-yes', 'booking_id', null);
end $$;

create function public.say_yes(p_shift_id uuid, p_dates date[] default null, p_client_ref uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.members; v jsonb; n int := 0;
begin
  me := private.require_member();
  v := private.receipt_begin(me.id, p_client_ref, 'say_yes');
  if v is not null then return v; end if;
  loop
    begin
      perform private.buf_reset();
      v := private.say_yes_work(me.id, p_shift_id, p_dates);
      perform private.buf_flush();
      exit;
    exception when deadlock_detected or sqlstate 'DK002' then
      n := n + 1;
      if n >= 3 then raise exception 'Couldn’t save. Try again.'; end if;
    end;
  end loop;
  return private.receipt_end(me.id, p_client_ref, v);
end $$;

-- ---------------------------------------------------------------------------
-- decline_request and withdraw_yes
-- ---------------------------------------------------------------------------
create function private.answer_end_work(p_me uuid, p_shift uuid, p_withdraw boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz;
  s public.shifts;
  a public.answers;
  v_days uuid[];
  v_name text;
  v_verb text;
begin
  perform private.lock_set(array[p_shift], array[p_me]);
  t := private.settle_all(array[p_shift]);
  perform private.check_me(p_me, 'talent', false, 'This shift no longer exists.');
  select * into a from public.answers where shift_id = p_shift and talent_id = p_me;
  if not found then
    raise exception 'This shift no longer exists.';
  end if;
  select * into s from public.shifts where id = p_shift;
  if s.status = 'expired' or (a.status = 'lapsed' and a.end_reason = 'shift-started') then
    raise exception 'This shift has already started.';
  end if;
  if (p_withdraw and a.status <> 'can-cover') or (not p_withdraw and a.status <> 'invited') then
    raise exception 'This has already been answered.';
  end if;
  v_days := case when p_withdraw then private.offered_days(a.id) else private.all_days(p_shift) end;
  v_name := private.member_name(p_me);
  v_verb := case when p_withdraw then 'withdrew' else 'declined' end;
  update public.answers set status = case when p_withdraw then 'withdrawn' else 'declined' end where id = a.id;
  perform private.queue_event(p_shift, p_me, v_name || ' ' || v_verb || '.');
  perform private.notify(s.venue_id, v_verb, v_name || ' ' || v_verb,
    private.shift_label(s.positions) || ' · ' || private.days_label(v_days) || ' · ' || private.shift_hours(p_shift),
    'shift/' || p_shift, p_me, p_shift, null);
  perform private.close_if_declined_by_all(p_shift, t);
  return jsonb_build_object('shift_status', (select status from public.shifts where id = p_shift));
end $$;

create function public.decline_request(p_shift_id uuid, p_client_ref uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.members; v jsonb; n int := 0;
begin
  me := private.require_member();
  v := private.receipt_begin(me.id, p_client_ref, 'decline_request');
  if v is not null then return v; end if;
  loop
    begin
      perform private.buf_reset();
      v := private.answer_end_work(me.id, p_shift_id, false);
      perform private.buf_flush();
      exit;
    exception when deadlock_detected or sqlstate 'DK002' then
      n := n + 1;
      if n >= 3 then raise exception 'Couldn’t save. Try again.'; end if;
    end;
  end loop;
  return private.receipt_end(me.id, p_client_ref, v);
end $$;

create function public.withdraw_yes(p_shift_id uuid, p_client_ref uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.members; v jsonb; n int := 0;
begin
  me := private.require_member();
  v := private.receipt_begin(me.id, p_client_ref, 'withdraw_yes');
  if v is not null then return v; end if;
  loop
    begin
      perform private.buf_reset();
      v := private.answer_end_work(me.id, p_shift_id, true);
      perform private.buf_flush();
      exit;
    exception when deadlock_detected or sqlstate 'DK002' then
      n := n + 1;
      if n >= 3 then raise exception 'Couldn’t save. Try again.'; end if;
    end;
  end loop;
  return private.receipt_end(me.id, p_client_ref, v);
end $$;

-- ---------------------------------------------------------------------------
-- close_shift
-- ---------------------------------------------------------------------------
create function private.close_shift_work(p_me uuid, p_shift uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz;
  s public.shifts;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  perform private.lock_set(array[p_shift], array[p_me]);
  t := private.settle_all(array[p_shift]);
  perform private.check_me(p_me, 'venue', false, 'This shift no longer exists.');
  select * into s from public.shifts where id = p_shift;
  if not found or s.venue_id <> p_me then
    raise exception 'This shift no longer exists.';
  end if;
  if s.status <> 'open' then
    raise exception 'This has already ended.';
  end if;
  if v_reason = '' then
    raise exception 'Choose a reason.';
  end if;
  update public.shifts set status = 'closed', closed_by = 'venue', closed_at = t, close_reason = v_reason
   where id = p_shift;
  perform private.close_waiting(p_shift, 'not-selected', 'venue-closed', 'shift-closed',
    'Cancelled by ' || private.member_name(p_me) || ': ' || v_reason, p_me);
  return '{}'::jsonb;
end $$;

create function public.close_shift(p_shift_id uuid, p_reason text, p_client_ref uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.members; v jsonb; n int := 0;
begin
  me := private.require_member();
  v := private.receipt_begin(me.id, p_client_ref, 'close_shift');
  if v is not null then return v; end if;
  loop
    begin
      perform private.buf_reset();
      v := private.close_shift_work(me.id, p_shift_id, p_reason);
      perform private.buf_flush();
      exit;
    exception when deadlock_detected or sqlstate 'DK002' then
      n := n + 1;
      if n >= 3 then raise exception 'Couldn’t save. Try again.'; end if;
    end;
  end loop;
  return private.receipt_end(me.id, p_client_ref, v);
end $$;

-- ---------------------------------------------------------------------------
-- book_talent
-- ---------------------------------------------------------------------------
create function private.book_talent_work(p_me uuid, p_shift uuid, p_talent uuid, p_dates date[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz;
  v_shifts uuid[];
  s public.shifts;
  a public.answers;
  v_first text;
  v_open uuid[];
  v_mine uuid[];
  v_free uuid[];
  v_cand uuid[];
  v_given uuid[];
  v_days uuid[];
  v_booking uuid;
begin
  v_shifts := array[p_shift] || private.clash_shifts(p_talent, p_shift);
  perform private.lock_set(v_shifts, array[p_me, p_talent]);
  perform private.restart_if_grown(v_shifts, private.clash_shifts(p_talent, p_shift));
  t := private.settle_all(v_shifts);
  perform private.check_me(p_me, 'venue', true, 'This shift no longer exists.');

  select * into s from public.shifts where id = p_shift;
  if not found or s.venue_id <> p_me then
    raise exception 'This shift no longer exists.';
  end if;
  select * into a from public.answers where shift_id = p_shift and talent_id = p_talent;
  if not found then
    raise exception 'This shift no longer exists.';
  end if;
  if s.status = 'expired' then
    raise exception 'This shift has already started.';
  end if;
  v_open := private.open_days(p_shift, t);
  if s.status <> 'open' or cardinality(v_open) = 0 then
    raise exception 'This shift is no longer available.';
  end if;
  v_first := private.first_name(p_talent);
  if a.status not in ('can-cover','booked')
     or not exists (select 1 from public.members m where m.id = p_talent and m.side = 'talent'
                    and m.approved and m.deleted_at is null) then
    raise exception '% can’t be booked any more.', v_first;
  end if;

  v_mine := private.booked_days_here(p_talent, p_shift);
  v_free := private.free_days(p_talent, p_shift, t);
  select coalesce(array_agg(x), '{}') into v_cand from unnest(private.offered_days(a.id)) x
   where x = any(v_open) and not (x = any(v_mine));

  if p_dates is null or cardinality(array_remove(p_dates, null)) = 0 then
    if cardinality(v_cand) = 0 then
      raise exception 'The days they said yes to are already filled.';
    end if;
    select coalesce(array_agg(x), '{}') into v_days from unnest(v_cand) x where x = any(v_free);
    if cardinality(v_days) = 0 then
      raise exception '% is booked elsewhere at that time.', v_first;
    end if;
  else
    v_given := private.shift_day_ids(p_shift, p_dates);
    if v_given is null or exists (select 1 from unnest(v_given) x where not (x = any(v_cand))) then
      raise exception 'Book only days they said yes to that are still open.';
    end if;
    if exists (select 1 from unnest(v_given) x where not (x = any(v_free))) then
      raise exception '% is booked elsewhere at that time.', v_first;
    end if;
    v_days := v_given;
  end if;

  v_booking := private.book_days(p_shift, a.id, v_days, false, t, p_me);
  return jsonb_build_object('booking_id', v_booking,
                            'shift_status', (select status from public.shifts where id = p_shift));
end $$;

create function public.book_talent(p_shift_id uuid, p_talent_id uuid, p_dates date[] default null,
  p_client_ref uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.members; v jsonb; n int := 0;
begin
  me := private.require_member();
  v := private.receipt_begin(me.id, p_client_ref, 'book_talent');
  if v is not null then return v; end if;
  loop
    begin
      perform private.buf_reset();
      v := private.book_talent_work(me.id, p_shift_id, p_talent_id, p_dates);
      perform private.buf_flush();
      exit;
    exception when deadlock_detected or sqlstate 'DK002' then
      n := n + 1;
      if n >= 3 then raise exception 'Couldn’t save. Try again.'; end if;
    end;
  end loop;
  return private.receipt_end(me.id, p_client_ref, v);
end $$;

-- ---------------------------------------------------------------------------
-- cancel_days
-- ---------------------------------------------------------------------------
create function private.cancel_days_work(p_me uuid, p_booking uuid, p_dates date[], p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz;
  b public.bookings;
  s public.shifts;
  v_shift uuid;
  v_talent uuid;
  v_venue uuid;
  v_future record;
  v_ids uuid[];
  v_days uuid[];
  v_first_before uuid;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_clean text;
  v_name text;
begin
  select bk.shift_id, bk.talent_id, sh.venue_id into v_shift, v_talent, v_venue
  from public.bookings bk join public.shifts sh on sh.id = bk.shift_id where bk.id = p_booking;
  if not found then
    raise exception 'This booking can no longer be cancelled.';
  end if;
  perform private.lock_set(array[v_shift], array[v_venue, v_talent]);
  perform 1 from public.bookings where id = p_booking for update;
  perform 1 from public.booking_days where booking_id = p_booking order by id for update;
  t := private.settle_all(array[v_shift]);
  perform private.check_me(p_me, null, false, null);
  select * into b from public.bookings where id = p_booking;
  if p_me not in (v_venue, v_talent) or b.status <> 'active' then
    raise exception 'This booking can no longer be cancelled.';
  end if;

  if p_dates is null or cardinality(array_remove(p_dates, null)) = 0 then
    select coalesce(array_agg(bd.id), '{}'), coalesce(array_agg(bd.shift_day_id), '{}') into v_ids, v_days
    from public.booking_days bd where bd.booking_id = p_booking and bd.status = 'booked' and bd.starts_at > t;
  else
    if exists (select 1 from unnest(p_dates) x where x is not null and not exists (
                 select 1 from public.booking_days bd join public.shift_days sd on sd.id = bd.shift_day_id
                 where bd.booking_id = p_booking and bd.status = 'booked' and bd.starts_at > t and sd.day_date = x)) then
      raise exception 'Only days that haven’t started can be cancelled.';
    end if;
    select coalesce(array_agg(bd.id), '{}'), coalesce(array_agg(bd.shift_day_id), '{}') into v_ids, v_days
    from public.booking_days bd join public.shift_days sd on sd.id = bd.shift_day_id
    where bd.booking_id = p_booking and bd.status = 'booked' and bd.starts_at > t and sd.day_date = any(p_dates);
  end if;
  if cardinality(v_ids) = 0 then
    raise exception 'Only days that haven’t started can be cancelled.';
  end if;
  if v_reason = '' then
    raise exception 'Choose a reason.';
  end if;
  if char_length(v_reason) > 500 then
    raise exception 'Keep the reason under 500 characters.';
  end if;

  select bd.shift_day_id into v_first_before from public.booking_days bd
   where bd.booking_id = p_booking and bd.status <> 'cancelled' order by bd.starts_at limit 1;

  update public.booking_days set status = 'cancelled', recorded_at = t, recorded_by = p_me, cancel_reason = v_reason
   where id = any(v_ids);
  delete from public.answer_days ad using public.answers a
   where ad.answer_id = a.id and a.shift_id = v_shift and a.talent_id = v_talent and ad.shift_day_id = any(v_days);
  if b.reminded_at is not null and v_first_before = any(v_days) then
    update public.bookings set reminded_at = null where id = p_booking;
  end if;
  if not exists (select 1 from public.booking_days where booking_id = p_booking and status <> 'cancelled') then
    update public.bookings set status = 'cancelled', cancelled_at = t where id = p_booking;
    update public.answers set status = 'cancelled', end_reason = null where shift_id = v_shift and talent_id = v_talent;
  end if;

  select * into s from public.shifts where id = v_shift;
  v_clean := regexp_replace(v_reason, '\.+$', '');
  v_name := private.member_name(p_me);
  perform private.queue_event(v_shift, v_talent,
    v_name || ' cancelled ' || private.days_label(v_days) || ': ' || v_clean || '.');
  perform private.notify(case when p_me = v_venue then v_talent else v_venue end, 'days-cancelled',
    v_name || ' cancelled',
    private.shift_label(s.positions) || ' · ' || private.days_label(v_days) || ' · ' || v_clean,
    'booking/' || p_booking, p_me, v_shift, p_booking);
  if s.status = 'filled' and cardinality(private.open_days(v_shift, t)) > 0 then
    update public.shifts set status = 'open' where id = v_shift;
  end if;
  return jsonb_build_object('booking_status', (select status from public.bookings where id = p_booking),
                            'shift_status', (select status from public.shifts where id = v_shift));
end $$;

create function public.cancel_days(p_booking_id uuid, p_dates date[] default null, p_reason text default null,
  p_client_ref uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.members; v jsonb; n int := 0;
begin
  me := private.require_member();
  v := private.receipt_begin(me.id, p_client_ref, 'cancel_days');
  if v is not null then return v; end if;
  loop
    begin
      perform private.buf_reset();
      v := private.cancel_days_work(me.id, p_booking_id, p_dates, p_reason);
      perform private.buf_flush();
      exit;
    exception when deadlock_detected or sqlstate 'DK002' then
      n := n + 1;
      if n >= 3 then raise exception 'Couldn’t save. Try again.'; end if;
    end;
  end loop;
  return private.receipt_end(me.id, p_client_ref, v);
end $$;

-- ---------------------------------------------------------------------------
-- confirm_day
-- ---------------------------------------------------------------------------
create function private.confirm_day_work(p_me uuid, p_booking uuid, p_date date, p_outcome text,
  p_start time, p_end time)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz;
  s public.shifts;
  v_talent uuid;
  v_bd uuid;
  d public.booking_days;
  v_start time;
  v_end time;
  v_si timestamptz;
  v_ei timestamptz;
  v_minutes int;
  v_pay int;
  v_venue_name text;
begin
  perform private.check_me(p_me, null, false, null);
  select sh.* into s
  from public.bookings bk join public.shifts sh on sh.id = bk.shift_id where bk.id = p_booking;
  select talent_id into v_talent from public.bookings where id = p_booking;
  if s.id is null or s.venue_id <> p_me then
    raise exception 'Only the venue confirms the hours worked.';
  end if;
  select bd.id into v_bd from public.booking_days bd join public.shift_days sd on sd.id = bd.shift_day_id
   where bd.booking_id = p_booking and sd.day_date = p_date
   order by (bd.status = 'cancelled'), bd.created_at desc limit 1;
  if v_bd is null then
    raise exception 'This day has already been recorded.';
  end if;
  select * into d from public.booking_days where id = v_bd for update;
  t := clock_timestamp();
  if d.status <> 'booked' or d.ends_at + interval '48 hours' <= t then
    raise exception 'This day has already been recorded.';
  end if;
  if d.ends_at > t then
    raise exception 'You can confirm a day once it has finished.';
  end if;
  v_venue_name := private.member_name(p_me);
  if p_outcome = 'no-show' then
    update public.booking_days set status = 'no-show', recorded_at = t, recorded_by = p_me where id = v_bd;
    perform private.notify(v_talent, 'no-show', v_venue_name || ' marked you as a no-show', private.fmt_date(p_date),
      'booking/' || p_booking, p_me, s.id, p_booking);
    return jsonb_build_object('worked_minutes', null, 'pay_pence', null);
  elsif p_outcome is distinct from 'worked' then
    raise exception 'Check your answers and try again.';
  end if;
  v_start := coalesce(p_start, s.start_time);
  v_end := coalesce(p_end, s.end_time);
  if v_start = v_end then
    raise exception 'Choose different start and end times.';
  end if;
  v_si := private.london_instant(p_date, v_start);
  v_ei := private.london_instant(case when v_end < v_start then p_date + 1 else p_date end, v_end);
  v_minutes := (extract(epoch from v_ei - v_si) / 60)::int;
  v_pay := round(v_minutes * s.rate_pence / 60.0)::int;
  update public.booking_days set status = 'worked', recorded_at = t, recorded_by = p_me,
         worked_start_time = v_start, worked_end_time = v_end, worked_minutes = v_minutes, pay_pence = v_pay
   where id = v_bd;
  perform private.notify(v_talent, 'hours-confirmed',
    v_venue_name || ' confirmed ' || private.fmt_hours(v_minutes) || ' hours',
    private.fmt_date(p_date) || ' · ' || private.fmt_time(v_start) || '–' || private.fmt_time(v_end) || ' · '
      || private.fmt_pay(v_pay),
    'booking/' || p_booking, p_me, s.id, p_booking);
  return jsonb_build_object('worked_minutes', v_minutes, 'pay_pence', v_pay);
end $$;

create function public.confirm_day(p_booking_id uuid, p_day_date date, p_outcome text,
  p_start_time time default null, p_end_time time default null, p_client_ref uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.members; v jsonb; n int := 0;
begin
  me := private.require_member();
  v := private.receipt_begin(me.id, p_client_ref, 'confirm_day');
  if v is not null then return v; end if;
  loop
    begin
      perform private.buf_reset();
      v := private.confirm_day_work(me.id, p_booking_id, p_day_date, p_outcome, p_start_time, p_end_time);
      perform private.buf_flush();
      exit;
    exception when deadlock_detected or sqlstate 'DK002' then
      n := n + 1;
      if n >= 3 then raise exception 'Couldn’t save. Try again.'; end if;
    end;
  end loop;
  return private.receipt_end(me.id, p_client_ref, v);
end $$;

-- ---------------------------------------------------------------------------
-- Rights
-- ---------------------------------------------------------------------------
revoke all on function
  private.post_shift_work(uuid, text, text[], date[], time, time, int, int, text, uuid[]),
  private.send_to_more_work(uuid, uuid, uuid[]),
  private.shift_day_ids(uuid, date[]),
  private.say_yes_work(uuid, uuid, date[]),
  private.answer_end_work(uuid, uuid, boolean),
  private.close_shift_work(uuid, uuid, text),
  private.book_talent_work(uuid, uuid, uuid, date[]),
  private.cancel_days_work(uuid, uuid, date[], text),
  private.confirm_day_work(uuid, uuid, date, text, time, time)
  from public, anon, authenticated;

revoke all on function
  public.post_shift(text, text[], date[], time, time, int, int, text, uuid[], uuid),
  public.send_to_more(uuid, uuid[], uuid),
  public.say_yes(uuid, date[], uuid),
  public.decline_request(uuid, uuid),
  public.withdraw_yes(uuid, uuid),
  public.close_shift(uuid, text, uuid),
  public.book_talent(uuid, uuid, date[], uuid),
  public.cancel_days(uuid, date[], text, uuid),
  public.confirm_day(uuid, date, text, time, time, uuid)
  from public, anon, authenticated;
grant execute on function
  public.post_shift(text, text[], date[], time, time, int, int, text, uuid[], uuid),
  public.send_to_more(uuid, uuid[], uuid),
  public.say_yes(uuid, date[], uuid),
  public.decline_request(uuid, uuid),
  public.withdraw_yes(uuid, uuid),
  public.close_shift(uuid, text, uuid),
  public.book_talent(uuid, uuid, date[], uuid),
  public.cancel_days(uuid, date[], text, uuid),
  public.confirm_day(uuid, date, text, time, time, uuid)
  to authenticated;
