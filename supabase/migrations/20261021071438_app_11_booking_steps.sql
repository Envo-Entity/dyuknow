-- Dyuknow app backend, step 11: the booking engine's shared steps.
-- Each takes t, the call's clock. Cards and grey lines go through the message
-- buffer (queue_card / queue_event); notices are written at once.

-- Ends every invited or can-cover answer on a shift with one line and one kind
-- of notice. Booked answers are never touched.
create function private.close_waiting(p_shift uuid, p_status text, p_reason text, p_kind text, p_line text, p_actor uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.shifts;
  a record;
  v_body text;
begin
  select * into s from public.shifts where id = p_shift;
  v_body := private.member_name(s.venue_id) || ' · ' || private.shift_label(s.positions);
  for a in select id, talent_id from public.answers
           where shift_id = p_shift and status in ('invited','can-cover') order by created_at, id
  loop
    update public.answers set status = p_status, end_reason = p_reason where id = a.id;
    perform private.queue_event(p_shift, a.talent_id, p_line);
    perform private.notify(a.talent_id, p_kind, p_line, v_body, 'shift/' || p_shift, p_actor, p_shift, null);
  end loop;
end $$;

create function private.close_if_declined_by_all(p_shift uuid, p_t timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.declined_by_all(p_shift) then
    update public.shifts set status = 'closed', closed_by = 'all-declined', closed_at = p_t where id = p_shift;
  end if;
end $$;

-- Ends a waiting answer that has nothing left to act on, with the reason that
-- ended it: time, filled, or booked-elsewhere (with where and the clashing days).
create function private.settle_answer(p_answer uuid, p_t timestamptz, p_because text,
                                      p_where text default null, p_clashing uuid[] default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  a public.answers;
  s public.shifts;
  v_venue_line text;
begin
  select * into a from public.answers where id = p_answer;
  if a.status not in ('invited','can-cover') then return; end if;
  if cardinality(private.waiting_days(p_answer, p_t)) > 0 then return; end if;
  select * into s from public.shifts where id = a.shift_id;
  v_venue_line := private.member_name(s.venue_id) || ' · ' || private.shift_label(s.positions);
  if p_because = 'time' then
    update public.answers set status = 'lapsed', end_reason = 'shift-started' where id = a.id;
    perform private.queue_event(s.id, a.talent_id, 'This shift has started');
    perform private.notify(a.talent_id, 'shift-started', 'This shift has started', v_venue_line,
                           'shift/' || s.id, null, s.id, null);
  elsif p_because = 'filled' then
    update public.answers set status = 'not-selected', end_reason = 'filled' where id = a.id;
    perform private.queue_event(s.id, a.talent_id, 'Filled by someone else.');
    perform private.notify(a.talent_id, 'filled-by-other', 'Filled by someone else', v_venue_line,
                           'shift/' || s.id, null, s.id, null);
  elsif p_because = 'booked-elsewhere' then
    update public.answers set status = 'lapsed', end_reason = 'booked-elsewhere' where id = a.id;
    perform private.queue_event(s.id, a.talent_id,
      private.member_name(a.talent_id) || ' is now booked ' || p_where || ' at this time.');
    if p_where = 'elsewhere' then
      perform private.notify(s.venue_id, 'booked-elsewhere',
        private.member_name(a.talent_id) || ' is booked elsewhere',
        private.shift_label(s.positions) || ' · ' || private.days_label(p_clashing),
        'shift/' || s.id, null, s.id, null);
    end if;
    perform private.close_if_declined_by_all(s.id, p_t);
  end if;
end $$;

-- Applies everything time has decided about one (locked) shift.
create function private.settle_shift(p_shift uuid, p_t timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.shifts;
  a record;
begin
  select * into s from public.shifts where id = p_shift;
  if not found or s.status <> 'open' then return; end if;
  if private.shift_state_now(p_shift, p_t) = 'expired' then
    update public.shifts set status = 'expired' where id = p_shift;
    perform private.close_waiting(p_shift, 'lapsed', 'shift-started', 'shift-started', 'This shift has started');
    perform private.notify(s.venue_id, 'shift-unfilled', 'Shift started unfilled',
      private.shift_label(s.positions) || ' · ' || private.days_label(private.all_days(p_shift)),
      'shift/' || p_shift, null, p_shift, null);
    return;
  end if;
  for a in select id from public.answers
           where shift_id = p_shift and status in ('invited','can-cover') order by created_at, id
  loop
    perform private.settle_answer(a.id, p_t, 'time');
  end loop;
end $$;

-- Reads the clock once, after the last lock, and settles every locked shift.
create function private.settle_all(p_shifts uuid[])
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare t timestamptz := clock_timestamp(); x uuid;
begin
  for x in select distinct u from unnest(p_shifts) u where u is not null order by 1 loop
    perform private.settle_shift(x, t);
  end loop;
  return t;
end $$;

-- Sends a booking request on a shift to one person. Returns true when sent,
-- false when they were already waiting or booked on it.
create function private.send_request(p_shift uuid, p_talent uuid, p_t timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  s public.shifts;
  a public.answers;
  v_first text;
  v_clash text;
begin
  if not exists (select 1 from public.members m where m.id = p_talent and m.side = 'talent'
                 and m.approved and m.deleted_at is null) then
    raise exception 'Choose talent members to send this to.';
  end if;
  select * into s from public.shifts where id = p_shift;
  v_first := private.first_name(p_talent);
  v_clash := private.open_answer(s.venue_id, p_talent, p_shift, p_t);
  if v_clash = 'booked' then
    raise exception '% is already booked then.', v_first;
  elsif v_clash = 'invited' then
    raise exception 'You’ve already asked % for this time.', v_first;
  elsif v_clash = 'can-cover' then
    raise exception '% already said yes to your job post for this time.', v_first;
  end if;
  if cardinality(private.free_days(p_talent, p_shift, p_t)) = 0 then
    raise exception '% is booked elsewhere then.', v_first;
  end if;
  select * into a from public.answers where shift_id = p_shift and talent_id = p_talent;
  if found and a.status in ('invited','can-cover','booked') then
    return false;
  end if;
  if found then
    update public.answers set status = 'invited', source = 'invite', end_reason = null where id = a.id;
    delete from public.answer_days where answer_id = a.id;
  else
    insert into public.answers (shift_id, talent_id, source, status, created_at, updated_at)
    values (p_shift, p_talent, 'invite', 'invited', p_t, p_t);
  end if;
  perform private.queue_card(p_shift, p_talent, s.venue_id, 'Booking request');
  perform private.notify(p_talent, 'booking-request',
    private.member_name(s.venue_id) || ' sent you a booking request',
    private.shift_label(s.positions) || ' · ' || private.days_label(private.all_days(p_shift)) || ' · '
      || private.shift_hours(p_shift) || ' · ' || private.fmt_pay(s.rate_pence) || '/h',
    'shift/' || p_shift, s.venue_id, p_shift, null);
  return true;
end $$;

-- A new booking settles the person's other answers whose days it overlaps.
create function private.trim_clashes(p_talent uuid, p_booking uuid, p_t timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings;
  v_venue uuid;
  a record;
  v_clashing uuid[];
  v_left uuid[];
  v_where text;
begin
  select * into b from public.bookings where id = p_booking;
  select venue_id into v_venue from public.shifts where id = b.shift_id;
  for a in
    select x.id, x.status, x.shift_id, s.venue_id
    from public.answers x join public.shifts s on s.id = x.shift_id
    where x.talent_id = p_talent and x.shift_id <> b.shift_id
      and x.status in ('invited','can-cover','booked') and s.status = 'open'
    order by x.shift_id
  loop
    select coalesce(array_agg(d.id), '{}') into v_clashing
    from public.shift_days d
    where d.id = any(private.offered_days(a.id))
      and exists (select 1 from public.booking_days bd
                  where bd.booking_id = p_booking and bd.status <> 'cancelled'
                    and bd.starts_at < d.ends_at and d.starts_at < bd.ends_at);
    if cardinality(v_clashing) = 0 then continue; end if;
    if a.status = 'booked' then
      -- Quietly: offered there, never booked.
      delete from public.answer_days where answer_id = a.id and shift_day_id = any(v_clashing);
      continue;
    end if;
    v_where := case when a.venue_id = v_venue
                    then 'on another ' || private.member_name(v_venue) || ' shift'
                    else 'elsewhere' end;
    v_left := private.waiting_days(a.id, p_t);
    if cardinality(v_left) = 0 then
      perform private.settle_answer(a.id, p_t, 'booked-elsewhere', v_where, v_clashing);
    elsif a.status = 'can-cover' then
      delete from public.answer_days where answer_id = a.id and shift_day_id = any(v_clashing);
      perform private.queue_event(a.shift_id, p_talent,
        private.member_name(p_talent) || ' is now booked ' || v_where || ' on '
        || private.days_label(v_clashing) || '. Still free ' || private.days_label(v_left) || '.');
    end if;
    -- An invited answer with days left is unchanged.
  end loop;
end $$;

-- Books days for the person behind an answer, then settles everyone else that
-- booking affects. Every shift and member involved is locked by the caller.
create function private.book_days(p_shift uuid, p_answer uuid, p_days uuid[], p_accepted boolean,
                                  p_t timestamptz, p_actor uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  s public.shifts;
  a public.answers;
  v_booking uuid;
  v_existed boolean;
  v_talent_name text;
  v_venue_name text;
  v_dates text;
  v_terms text;
  o record;
begin
  select * into s from public.shifts where id = p_shift;
  select * into a from public.answers where id = p_answer;
  select id into v_booking from public.bookings
   where shift_id = p_shift and talent_id = a.talent_id and status = 'active' for update;
  v_existed := found;
  update public.answers set status = 'booked', end_reason = null where id = a.id;
  if not v_existed then
    insert into public.bookings (shift_id, talent_id, status, booked_at)
    values (p_shift, a.talent_id, 'active', p_t) returning id into v_booking;
  end if;
  begin
    insert into public.booking_days (booking_id, shift_day_id, shift_id, talent_id, starts_at, ends_at, created_at)
    select v_booking, d.id, d.shift_id, a.talent_id, d.starts_at, d.ends_at, p_t
    from public.shift_days d where d.id = any(p_days) and d.shift_id = p_shift
    order by d.starts_at;
  exception
    when exclusion_violation then
      if p_accepted then
        raise exception 'One of those days isn’t available any more. Check the days and try again.';
      end if;
      raise exception '% is booked elsewhere at that time.', private.first_name(a.talent_id);
    when sqlstate 'DK001' then
      if p_accepted then
        raise exception 'One of those days isn’t available any more. Check the days and try again.';
      end if;
      raise exception 'Book only days they said yes to that are still open.';
  end;

  v_talent_name := private.member_name(a.talent_id);
  v_venue_name := private.member_name(s.venue_id);
  v_dates := private.days_label(p_days);
  v_terms := v_dates || ' · ' || private.shift_hours(p_shift) || ' · ' || private.fmt_pay(s.rate_pence) || '/h.';
  if p_accepted then
    perform private.queue_event(p_shift, a.talent_id, v_talent_name || ' accepted. Booked: ' || v_terms);
    perform private.notify(s.venue_id, 'accepted', v_talent_name || ' accepted',
      private.shift_label(s.positions) || ' · ' || v_dates || ' · ' || private.shift_hours(p_shift) || '. They''re booked.',
      'booking/' || v_booking, p_actor, p_shift, v_booking);
  elsif v_existed then
    perform private.queue_event(p_shift, a.talent_id, 'Added to the booking: ' || v_terms);
    perform private.notify(a.talent_id, 'days-added', v_venue_name || ' added ' || v_dates || ' to your booking',
      private.shift_label(s.positions) || ' · ' || private.days_label(private.booked_days_here(a.talent_id, p_shift))
        || ' · ' || private.shift_hours(p_shift),
      'booking/' || v_booking, p_actor, p_shift, v_booking);
  else
    perform private.queue_event(p_shift, a.talent_id, 'Booked: ' || v_terms);
    perform private.notify(a.talent_id, 'booked', 'You''re booked at ' || v_venue_name,
      private.shift_label(s.positions) || ' · ' || private.days_label(private.booked_days_here(a.talent_id, p_shift))
        || ' · ' || private.shift_hours(p_shift),
      'booking/' || v_booking, p_actor, p_shift, v_booking);
  end if;

  if cardinality(private.open_days(p_shift, p_t)) = 0 then
    update public.shifts set status = 'filled' where id = p_shift;
    perform private.close_waiting(p_shift, 'not-selected', 'filled', 'shift-filled', 'This shift has been filled', p_actor);
  else
    for o in select id from public.answers
             where shift_id = p_shift and id <> a.id and status in ('invited','can-cover') order by created_at, id
    loop
      perform private.settle_answer(o.id, p_t, 'filled');
    end loop;
  end if;
  perform private.trim_clashes(a.talent_id, v_booking, p_t);
  return v_booking;
end $$;

-- The talent's approval was taken away.
create function private.end_unavailable(p_answer uuid, p_t timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  a public.answers;
  s public.shifts;
  v_offered uuid[];
begin
  select * into a from public.answers where id = p_answer;
  select * into s from public.shifts where id = a.shift_id;
  v_offered := private.offered_days(a.id);
  update public.answers set status = 'lapsed', end_reason = 'unavailable' where id = a.id;
  perform private.queue_event(s.id, a.talent_id, private.member_name(a.talent_id) || ' is no longer available.');
  perform private.notify(s.venue_id, 'unavailable', private.member_name(a.talent_id) || ' is no longer available',
    private.shift_label(s.positions) || ' · ' || private.days_label(v_offered),
    'shift/' || s.id, null, s.id, null);
  perform private.close_if_declined_by_all(s.id, p_t);
end $$;

-- The venue's approval was taken away.
create function private.close_for_dyuknow(p_shift uuid, p_t timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare v_venue uuid;
begin
  select venue_id into v_venue from public.shifts where id = p_shift;
  update public.shifts set status = 'closed', closed_by = 'dyuknow', close_reason = 'No longer on Dyuknow', closed_at = p_t
   where id = p_shift;
  perform private.close_waiting(p_shift, 'not-selected', 'venue-closed', 'shift-closed',
    'Cancelled by ' || private.member_name(v_venue) || ': No longer on Dyuknow');
end $$;

revoke all on function
  private.close_waiting(uuid, text, text, text, text, uuid),
  private.close_if_declined_by_all(uuid, timestamptz),
  private.settle_answer(uuid, timestamptz, text, text, uuid[]),
  private.settle_shift(uuid, timestamptz),
  private.settle_all(uuid[]),
  private.send_request(uuid, uuid, timestamptz),
  private.trim_clashes(uuid, uuid, timestamptz),
  private.book_days(uuid, uuid, uuid[], boolean, timestamptz, uuid),
  private.end_unavailable(uuid, timestamptz),
  private.close_for_dyuknow(uuid, timestamptz)
  from public, anon, authenticated;
