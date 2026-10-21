-- Dyuknow app backend, step 14: the five-minute sweep, the daily tidy, their
-- pg_cron jobs, and get_accept_flags (a read for the talent's Accept button).

-- ---------------------------------------------------------------------------
-- What is due
-- ---------------------------------------------------------------------------
-- An open shift where time has decided something nobody has written yet.
create function private.shift_due(p_shift uuid, p_t timestamptz)
returns boolean language sql stable security definer set search_path = '' as $$
  select s.status = 'open'
     and (private.shift_state_now(s.id, p_t) = 'expired'
          or exists (select 1 from public.answers a
                     where a.shift_id = s.id and a.status in ('invited','can-cover')
                       and cardinality(private.waiting_days(a.id, p_t)) = 0))
  from public.shifts s where s.id = p_shift;
$$;

-- A booking's first day that isn't cancelled, and when its reminder is due:
-- 2 hours before when booked that same London day, else 18:00 London the day before.
create function private.reminder_info(p_booking uuid,
  out first_starts_at timestamptz, out first_date date, out first_ends_at timestamptz, out remind_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select bd.starts_at, sd.day_date, bd.ends_at,
         case when private.london_date(b.booked_at) = sd.day_date then bd.starts_at - interval '2 hours'
              else private.london_instant(sd.day_date - 1, '18:00') end
  from public.bookings b
  join public.booking_days bd on bd.booking_id = b.id and bd.status <> 'cancelled'
  join public.shift_days sd on sd.id = bd.shift_day_id
  where b.id = p_booking
  order by bd.starts_at
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- One item each. The caller has locked the item's main row.
-- ---------------------------------------------------------------------------
create function private.sweep_shift_item(p_shift uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t timestamptz := clock_timestamp();
begin
  perform private.buf_reset();
  if private.shift_due(p_shift, t) then
    perform private.settle_shift(p_shift, t);
  end if;
  perform private.buf_flush();
end $$;

create function private.sweep_confirm_item(p_booking_day uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz := clock_timestamp();
  d public.booking_days;
  s public.shifts;
  v_minutes int;
begin
  select * into d from public.booking_days where id = p_booking_day;
  if d.status <> 'booked' or d.ends_at + interval '48 hours' > t then return; end if;
  select * into s from public.shifts where id = d.shift_id;
  v_minutes := (extract(epoch from d.ends_at - d.starts_at) / 60)::int;
  update public.booking_days
     set status = 'worked', auto_confirmed = true, recorded_at = t, recorded_by = null,
         worked_start_time = s.start_time, worked_end_time = s.end_time, worked_minutes = v_minutes,
         pay_pence = round(v_minutes * s.rate_pence / 60.0)::int
   where id = p_booking_day;
end $$;

create function private.sweep_remind_item(p_booking uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz := clock_timestamp();
  b public.bookings;
  s public.shifts;
  ri record;
begin
  select * into b from public.bookings where id = p_booking;
  if b.status <> 'active' or b.reminded_at is not null then return; end if;
  select * into ri from private.reminder_info(p_booking);
  if ri.first_starts_at is null then return; end if;
  if ri.first_starts_at <= t then
    -- Its first day has started, so it can never be reminded.
    update public.bookings set reminded_at = t where id = p_booking;
    return;
  end if;
  if ri.remind_at > b.booked_at and ri.remind_at <= t then
    select * into s from public.shifts where id = b.shift_id;
    update public.bookings set reminded_at = t where id = p_booking;
    perform private.notify(b.talent_id, 'reminder', 'Your shift at ' || private.member_name(s.venue_id),
      private.service_label(ri.first_date, s.start_time, s.end_time) || '. The address is in your booking.',
      'booking/' || p_booking, null, s.id, p_booking);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Picking the next due item, passing over rows another call holds.
-- Each returns null when nothing more is due. p_skip holds items already tried.
-- ---------------------------------------------------------------------------
create function private.sweep_next_shift(p_skip uuid[])
returns uuid language sql security definer set search_path = '' as $$
  select s.id from public.shifts s
  where s.status = 'open' and not (s.id = any(p_skip)) and private.shift_due(s.id, clock_timestamp())
  order by (select min(d.starts_at) from public.shift_days d where d.shift_id = s.id), s.id
  limit 1
  for update of s skip locked;
$$;

create function private.sweep_next_confirm(p_skip uuid[])
returns uuid language sql security definer set search_path = '' as $$
  select bd.id from public.booking_days bd
  where bd.status = 'booked' and bd.ends_at + interval '48 hours' <= clock_timestamp()
    and not (bd.id = any(p_skip))
  order by bd.ends_at, bd.id
  limit 1
  for update of bd skip locked;
$$;

create function private.sweep_next_reminder(p_skip uuid[])
returns uuid language sql security definer set search_path = '' as $$
  select b.id from public.bookings b
  cross join lateral private.reminder_info(b.id) ri
  where b.status = 'active' and b.reminded_at is null and not (b.id = any(p_skip))
    and ri.first_starts_at > clock_timestamp()
    and ri.remind_at > b.booked_at and ri.remind_at <= clock_timestamp()
  order by ri.remind_at, b.id
  limit 1
  for update of b skip locked;
$$;

create function private.sweep_next_passed(p_skip uuid[])
returns uuid language sql security definer set search_path = '' as $$
  select b.id from public.bookings b
  cross join lateral private.reminder_info(b.id) ri
  where b.status = 'active' and b.reminded_at is null and not (b.id = any(p_skip))
    and ri.first_starts_at <= clock_timestamp()
  order by ri.first_starts_at, b.id
  limit 1
  for update of b skip locked;
$$;

-- ---------------------------------------------------------------------------
-- private.sweep_once(): the whole sweep in one transaction, with the same
-- steps and limits. Used by tests (inside begin ... rollback) and by hand.
-- ---------------------------------------------------------------------------
create function private.sweep_once()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_skip uuid[];
  v_step int;
  v_n int;
  v_done jsonb := '{}';
begin
  for v_step in 1 .. 4 loop
    v_skip := '{}'; v_n := 0;
    loop
      exit when v_n >= 500;
      v_id := case v_step when 1 then private.sweep_next_shift(v_skip)
                          when 2 then private.sweep_next_confirm(v_skip)
                          when 3 then private.sweep_next_reminder(v_skip)
                          else private.sweep_next_passed(v_skip) end;
      exit when v_id is null;
      v_skip := v_skip || v_id;
      v_n := v_n + 1;
      begin
        if v_step = 1 then perform private.sweep_shift_item(v_id);
        elsif v_step = 2 then perform private.sweep_confirm_item(v_id);
        else perform private.sweep_remind_item(v_id); end if;
      exception when others then
        raise log 'dyuknow sweep step % item % failed: %', v_step, v_id, sqlerrm;
      end;
    end loop;
    v_done := v_done || jsonb_build_object('step' || v_step, v_n);
  end loop;
  return v_done;
end $$;

-- ---------------------------------------------------------------------------
-- private.run_sweep(): what pg_cron calls. A procedure that commits after
-- every item. It has no SET clause and isn't SECURITY DEFINER, because either
-- would stop it committing; it runs as the job's owner and names everything
-- in full.
-- ---------------------------------------------------------------------------
create procedure private.run_sweep()
language plpgsql as $$
declare
  v_started timestamptz := clock_timestamp();
  v_old_timeout text := current_setting('lock_timeout');
  v_id uuid;
  v_skip uuid[];
  v_step int;
  v_n int;
begin
  if not pg_catalog.pg_try_advisory_lock(pg_catalog.hashtext('dyuknow.sweep')) then
    return;
  end if;
  perform pg_catalog.set_config('lock_timeout', '2s', false);
  for v_step in 1 .. 4 loop
    v_skip := '{}'; v_n := 0;
    loop
      exit when v_n >= 500 or pg_catalog.clock_timestamp() - v_started > interval '4 minutes';
      v_id := case v_step when 1 then private.sweep_next_shift(v_skip)
                          when 2 then private.sweep_next_confirm(v_skip)
                          when 3 then private.sweep_next_reminder(v_skip)
                          else private.sweep_next_passed(v_skip) end;
      exit when v_id is null;
      v_skip := v_skip || v_id;
      v_n := v_n + 1;
      begin
        if v_step = 1 then perform private.sweep_shift_item(v_id);
        elsif v_step = 2 then perform private.sweep_confirm_item(v_id);
        else perform private.sweep_remind_item(v_id); end if;
      exception when others then
        raise log 'dyuknow sweep step % item % failed: %', v_step, v_id, sqlerrm;
      end;
      commit;
    end loop;
    commit;
  end loop;
  perform pg_catalog.set_config('lock_timeout', v_old_timeout, false);
  perform pg_catalog.pg_advisory_unlock(pg_catalog.hashtext('dyuknow.sweep'));
end $$;

-- ---------------------------------------------------------------------------
-- The daily tidy: pg_cron run history and call receipts older than 7 days.
-- ---------------------------------------------------------------------------
create function private.daily_tidy()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_runs int; v_receipts int;
begin
  delete from cron.job_run_details where end_time < clock_timestamp() - interval '7 days';
  get diagnostics v_runs = row_count;
  delete from public.call_receipts where created_at < clock_timestamp() - interval '7 days';
  get diagnostics v_receipts = row_count;
  return jsonb_build_object('runs', v_runs, 'receipts', v_receipts);
end $$;

revoke all on function
  private.shift_due(uuid, timestamptz), private.reminder_info(uuid),
  private.sweep_shift_item(uuid), private.sweep_confirm_item(uuid), private.sweep_remind_item(uuid),
  private.sweep_next_shift(uuid[]), private.sweep_next_confirm(uuid[]),
  private.sweep_next_reminder(uuid[]), private.sweep_next_passed(uuid[]),
  private.sweep_once(), private.daily_tidy()
  from public, anon, authenticated;
revoke all on procedure private.run_sweep() from public, anon, authenticated;

select cron.schedule('dyuknow-sweep', '*/5 * * * *', 'call private.run_sweep()');
select cron.schedule('dyuknow-daily-tidy', '30 3 * * *', 'select private.daily_tidy()');

-- ---------------------------------------------------------------------------
-- get_accept_flags: whether each booking request is "one person, one place",
-- so the talent's screen can show Accept. Only shifts the caller can see:
-- ones they have an answer on, or their own venue's.
-- ---------------------------------------------------------------------------
create function public.get_accept_flags(p_shift_ids uuid[])
returns table (shift_id uuid, book_on_accept boolean)
language plpgsql stable security definer set search_path = '' as $$
declare me public.members;
begin
  me := private.require_member();
  return query
    select s.id, coalesce(private.book_on_accept(s.id), false)
    from public.shifts s
    where s.id = any(p_shift_ids)
      and (s.venue_id = me.id
           or exists (select 1 from public.answers a where a.shift_id = s.id and a.talent_id = me.id))
    order by s.id;
end $$;
revoke all on function public.get_accept_flags(uuid[]) from public, anon, authenticated;
grant execute on function public.get_accept_flags(uuid[]) to authenticated;
