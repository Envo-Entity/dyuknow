-- Cancelling days that are already cancelled (a repeated tap) says so,
-- instead of "Only days that haven't started can be cancelled."
create or replace function private.cancel_days_work(p_me uuid, p_booking uuid, p_dates date[], p_reason text)
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
  if p_me in (v_venue, v_talent) and b.status = 'cancelled' then
    raise exception 'This booking is already cancelled.';
  end if;
  if p_me not in (v_venue, v_talent) or b.status <> 'active' then
    raise exception 'This booking can no longer be cancelled.';
  end if;

  if p_dates is null or cardinality(array_remove(p_dates, null)) = 0 then
    select coalesce(array_agg(bd.id), '{}'), coalesce(array_agg(bd.shift_day_id), '{}') into v_ids, v_days
    from public.booking_days bd where bd.booking_id = p_booking and bd.status = 'booked' and bd.starts_at > t;
  else
    -- A repeated tap asks for days this booking already gave up.
    if not exists (select 1 from unnest(p_dates) x where x is not null and not exists (
                     select 1 from public.booking_days bd join public.shift_days sd on sd.id = bd.shift_day_id
                     where bd.booking_id = p_booking and bd.status = 'cancelled' and sd.day_date = x)) then
      raise exception '%', case when cardinality(array_remove(p_dates, null)) = 1
        then 'That day is already cancelled.' else 'Those days are already cancelled.' end;
    end if;
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
