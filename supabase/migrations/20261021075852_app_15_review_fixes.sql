-- Dyuknow app backend, step 15: fixes from the security and rule reviews.
-- 1. post_shift, send_to_more, say_yes and book_talent check the caller (and
--    that the shift is theirs, or one they can see) before locking anything a
--    caller named. post_shift and send_to_more take at most 100 people and lock
--    only approved talent among them; send_request still refuses anyone else
--    with its own message. Every check is repeated after the locks.
-- 2. say_yes on a booking offers only days not already offered; with none left
--    it refuses "You’ve already said yes to this." instead of a second card.

create or replace function private.post_shift_work(p_me uuid, p_team text, p_positions text[], p_dates date[],
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
  v_lock uuid[];
begin
  -- Check the caller before taking any lock.
  perform private.check_me(p_me, 'venue', true, 'Only venues can send shifts.');
  select coalesce(array_agg(u order by o), '{}') into v_to
  from (select u, min(o) as o from unnest(p_to) with ordinality y(u, o) where u is not null group by u) z;
  -- No more than 100 people; lock only those who could be sent it. Anyone
  -- else listed is refused by send_request with its own message.
  if cardinality(v_to) > 100 then
    raise exception 'Choose up to 100 people.';
  end if;
  select coalesce(array_agg(m.id), '{}') into v_lock from public.members m
   where m.id = any(v_to) and m.side = 'talent' and m.approved and m.deleted_at is null;
  perform private.lock_set('{}', array[p_me] || v_lock);
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

create or replace function private.send_to_more_work(p_me uuid, p_shift uuid, p_talents uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz;
  v_to uuid[];
  s public.shifts;
  x uuid;
  v_sent int := 0;
  v_lock uuid[];
begin
  -- Check the caller and the shift before taking any lock.
  perform private.check_me(p_me, 'venue', true, 'This shift no longer exists.');
  if not exists (select 1 from public.shifts where id = p_shift and venue_id = p_me) then
    raise exception 'This shift no longer exists.';
  end if;
  select coalesce(array_agg(u order by o), '{}') into v_to
  from (select u, min(o) as o from unnest(p_talents) with ordinality y(u, o) where u is not null group by u) z;
  -- No more than 100 people; lock only those who could be sent it. Anyone
  -- else listed is refused by send_request with its own message.
  if cardinality(v_to) > 100 then
    raise exception 'Choose up to 100 people.';
  end if;
  select coalesce(array_agg(m.id), '{}') into v_lock from public.members m
   where m.id = any(v_to) and m.side = 'talent' and m.approved and m.deleted_at is null;
  perform private.lock_set(array[p_shift], array[p_me] || v_lock);
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

create or replace function private.say_yes_work(p_me uuid, p_shift uuid, p_dates date[])
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
  -- Check the caller, and that they can see the shift, before taking any lock.
  perform private.check_me(p_me, 'talent', true, 'Choose a talent member.');
  if not exists (select 1 from public.shifts s2
                 where s2.id = p_shift
                   and (exists (select 1 from public.answers a2 where a2.shift_id = s2.id and a2.talent_id = p_me)
                        or (s2.mode = 'post' and s2.status in ('open','expired')
                            and exists (select 1 from public.members v2 where v2.id = s2.venue_id
                                        and v2.approved and v2.deleted_at is null)))) then
    raise exception 'This shift no longer exists.';
  end if;
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
    -- Offering more days on a booking: only days not already offered.
    select coalesce(array_agg(x), '{}') into v_days from unnest(coalesce(v_given, v_add)) x
     where not (x = any(v_offered));
    if cardinality(v_days) = 0 then
      raise exception 'You’ve already said yes to this.';
    end if;
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

create or replace function private.book_talent_work(p_me uuid, p_shift uuid, p_talent uuid, p_dates date[])
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
  -- Check the caller, the shift and the person's answer before taking any lock.
  perform private.check_me(p_me, 'venue', true, 'This shift no longer exists.');
  if not exists (select 1 from public.shifts where id = p_shift and venue_id = p_me)
     or not exists (select 1 from public.answers where shift_id = p_shift and talent_id = p_talent) then
    raise exception 'This shift no longer exists.';
  end if;
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
