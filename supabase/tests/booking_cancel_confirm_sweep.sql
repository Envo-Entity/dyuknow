begin;

-- Fixtures: logins a...0N, members b...0N.
--   01 venue Spruce, 02 venue Harper (approved)
--   03 talent Poppy Bertram (CDP), 04 talent Theo Lane (CDP), 05 talent Ines Moreau (Waiter) (approved)
--   06 talent Wade Long (CDP, waiting for approval); 07 an admin login with no member
insert into auth.users (id, instance_id, aud, role, email)
select ('a0000000-0000-0000-0000-00000000000' || n)::uuid, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', 'booking' || n || '@example.com'
from generate_series(1, 7) n;
insert into public.admins (user_id, name) values ('a0000000-0000-0000-0000-000000000007', 'Test admin');
insert into public.members (id, user_id, side, approved)
select ('b0000000-0000-0000-0000-00000000000' || n)::uuid, ('a0000000-0000-0000-0000-00000000000' || n)::uuid,
       case when n <= 2 then 'venue' else 'talent' end, n <> 6
from generate_series(1, 6) n;
insert into public.venues (member_id, trading_name, street_address, postcode, contact_name, contact_position, contact_phone,
  agreed_pay_fairly, agreed_treat_team_like_our_own, agreed_provide_clear_brief, agreed_rate_honestly) values
  ('b0000000-0000-0000-0000-000000000001','Spruce','1 Kew Road','TW9 1UA','Sam Cook','Head Chef','07700900001',true,true,true,true),
  ('b0000000-0000-0000-0000-000000000002','Harper','2 High St','W1 2AA','Hal Jones','Manager','07700900002',true,true,true,true);
insert into public.talents (member_id, full_name, positions, mobile_number, home_postcode,
  agreed_turn_up_on_time, agreed_treat_venues_with_respect, agreed_give_notice_if_cancelling, agreed_represent_professionally) values
  ('b0000000-0000-0000-0000-000000000003','Poppy Bertram','{CDP}','07700900003','TW9 2BB',true,true,true,true),
  ('b0000000-0000-0000-0000-000000000004','Theo Lane','{CDP}','07700900004','TW9 3CC',true,true,true,true),
  ('b0000000-0000-0000-0000-000000000005','Ines Moreau','{Waiter}','07700900005','W2 4DD',true,true,true,true),
  ('b0000000-0000-0000-0000-000000000006','Wade Long','{CDP}','07700900006','W3 5EE',true,true,true,true);

-- Helpers (temporary, gone at rollback).
create function pg_temp.m(n int) returns uuid language sql immutable as $$
  select ('b0000000-0000-0000-0000-00000000000' || n)::uuid $$;
create function pg_temp.login(n int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', 'a0000000-0000-0000-0000-00000000000' || n, 'role', 'authenticated')::text, true);
end $$;
-- London today plus n days.
create function pg_temp.d(n int) returns date language sql stable as $$
  select private.london_date(clock_timestamp()) + n $$;
-- Runs q; returns the error message, or null on success.
create function pg_temp.err(q text) returns text language plpgsql as $$
begin
  execute q;
  return null;
exception when others then
  return sqlerrm;
end $$;
create function pg_temp.expect(q text, msg text) returns void language plpgsql as $$
declare got text := pg_temp.err(q);
begin
  if got is distinct from msg then
    raise exception 'FAIL: % -- expected "%", got "%"', q, msg, coalesce(got, 'success');
  end if;
end $$;
-- Posts a Kitchen CDP shift 17:00–23:00 as venue n (to: talent member numbers).
create function pg_temp.post(v int, dates date[], cap int default 1, rcpt int[] default '{}', pos text[] default '{CDP}')
returns uuid language plpgsql as $$
declare r jsonb;
begin
  perform pg_temp.login(v);
  r := public.post_shift('Kitchen', pos, dates, '17:00', '23:00', cap, 1800, 'Staff meal',
                         array(select pg_temp.m(x) from unnest(rcpt) x), gen_random_uuid());
  return (r->>'shift_id')::uuid;
end $$;
create function pg_temp.yes(t int, s uuid, dates date[] default null) returns jsonb language plpgsql as $$
begin
  perform pg_temp.login(t);
  return public.say_yes(s, dates, gen_random_uuid());
end $$;
create function pg_temp.book(v int, s uuid, t int, dates date[] default null) returns jsonb language plpgsql as $$
begin
  perform pg_temp.login(v);
  return public.book_talent(s, pg_temp.m(t), dates, gen_random_uuid());
end $$;
create function pg_temp.status(s uuid, t int) returns text language sql as $$
  select status from public.answers where shift_id = s and talent_id = pg_temp.m(t) $$;
create function pg_temp.booked(s uuid) returns int language sql as $$
  select count(*)::int from public.booking_days where shift_id = s and status <> 'cancelled' $$;
-- Messages between venue v and talent t, oldest first.
create function pg_temp.lines(v int, t int) returns text[] language sql as $$
  select coalesce(array_agg(mg.kind || ':' || mg.body order by mg.seq), '{}')
  from public.messages mg join public.conversations c on c.id = mg.conversation_id
  where c.venue_id = pg_temp.m(v) and c.talent_id = pg_temp.m(t) $$;
create function pg_temp.notices(n int) returns text[] language sql as $$
  select coalesce(array_agg(kind || '|' || title || '|' || body order by id), '{}')
  from public.notifications where member_id = pg_temp.m(n) $$;
-- A shift with days in the past, inserted as owner (post_shift refuses past dates).
-- offsets: hours from now to each day's start; each day lasts 6 hours.
create function pg_temp.past_shift(v int, offsets int[], cap int default 1, mode text default 'post') returns uuid
language plpgsql as $$
declare s uuid; o int;
begin
  insert into public.shifts (venue_id, mode, team, positions, capacity, rate_pence, start_time, end_time, created_at)
  values (pg_temp.m(v), mode, 'Kitchen', '{CDP}', cap, 1800, '17:00', '23:00', clock_timestamp() - interval '30 days')
  returning id into s;
  foreach o in array offsets loop
    insert into public.shift_days (shift_id, day_date, starts_at, ends_at)
    values (s, private.london_date(clock_timestamp() + make_interval(hours => o)),
            clock_timestamp() + make_interval(hours => o), clock_timestamp() + make_interval(hours => o + 6));
  end loop;
  return s;
end $$;
-- Gives talent t an answer on s, and optionally books every day, as owner.
create function pg_temp.past_answer(s uuid, t int, st text, book boolean default false) returns uuid
language plpgsql as $$
declare a uuid; b uuid;
begin
  insert into public.answers (shift_id, talent_id, source, status, created_at)
  values (s, pg_temp.m(t), case when st = 'invited' then 'invite' else 'response' end, st,
          clock_timestamp() - interval '30 days') returning id into a;
  if st <> 'invited' then
    insert into public.answer_days (answer_id, shift_id, shift_day_id) select a, s, id from public.shift_days where shift_id = s;
  end if;
  if book then
    insert into public.bookings (shift_id, talent_id, booked_at) values (s, pg_temp.m(t), clock_timestamp() - interval '30 days')
    returning id into b;
    insert into public.booking_days (booking_id, shift_day_id, shift_id, talent_id, starts_at, ends_at)
    select b, d.id, s, pg_temp.m(t), d.starts_at, d.ends_at from public.shift_days d where d.shift_id = s;
    return b;
  end if;
  return a;
end $$;
-- Job-post notices this shift sent to the test's own talent (03 to 06).
create function pg_temp.alerted(s uuid) returns int language sql as $$
  select count(*)::int from public.notifications
  where shift_id = s and kind = 'job-posted' and member_id in (pg_temp.m(3), pg_temp.m(4), pg_temp.m(5), pg_temp.m(6)) $$;
create temp table ids (name text primary key, id uuid);

-- 1. Cancel keeps history, tells the other side, and frees both calendars ---
do $$
declare s uuid; b uuid; r jsonb; d1 date := pg_temp.d(10);
begin
  s := pg_temp.post(1, array[d1]);
  perform pg_temp.yes(3, s);
  b := (pg_temp.book(1, s, 3))->>'booking_id';
  assert cardinality(private.free_days(pg_temp.m(3), pg_temp.post(2, array[d1]), clock_timestamp())) = 0, 'booked: not free elsewhere';
  perform pg_temp.login(3);
  r := public.cancel_days(b, null, 'Illness', gen_random_uuid());
  assert r = '{"booking_status": "cancelled", "shift_status": "open"}'::jsonb, r::text;
  assert (select status from public.booking_days where booking_id = b) = 'cancelled';
  assert pg_temp.status(s, 3) = 'cancelled';
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(1) and kind = 'days-cancelled'
                 and title = 'Poppy Bertram cancelled' and body = 'CDP · ' || private.fmt_date(d1) || ' · Illness'
                 and target = 'booking/' || b);
  assert not exists (select 1 from public.notifications where member_id = pg_temp.m(3) and kind = 'days-cancelled');
  assert (pg_temp.lines(1, 3))[cardinality(pg_temp.lines(1, 3))] = 'event:Poppy Bertram cancelled ' || private.fmt_date(d1) || ': Illness.';
  assert cardinality(private.free_days(pg_temp.m(3), (select id from public.shifts where venue_id = pg_temp.m(2) order by created_at desc limit 1), clock_timestamp())) = 1,
    'free again elsewhere';
  perform pg_temp.expect(format('select public.cancel_days(%L, null, %L, gen_random_uuid())', b, 'Illness'), 'This booking can no longer be cancelled.');
  -- She can say yes again, and the venue can book her again: a new booking.
  assert pg_temp.yes(3, s)->>'result' = 'said-yes';
  assert pg_temp.book(1, s, 3)->>'shift_status' = 'filled';
  assert (select count(*) from public.bookings where shift_id = s and talent_id = pg_temp.m(3)) = 2;
end $$;

-- 2. Cancelling one day of a multi-day booking keeps the rest and reopens it --
do $$
declare s uuid; b uuid; r jsonb; d1 date := pg_temp.d(11); d2 date := pg_temp.d(12); d3 date := pg_temp.d(13);
begin
  s := pg_temp.post(1, array[d1, d2, d3]);
  perform pg_temp.yes(3, s);
  b := (pg_temp.book(1, s, 3))->>'booking_id';
  assert (select status from public.shifts where id = s) = 'filled';
  perform pg_temp.login(1);
  perform pg_temp.expect(format('select public.cancel_days(%L, array[%L::date], %L, gen_random_uuid())', b, d2, ''), 'Choose a reason.');
  perform pg_temp.expect(format('select public.cancel_days(%L, array[%L::date], %L, gen_random_uuid())', b, d2, repeat('x', 501)), 'Keep the reason under 500 characters.');
  perform pg_temp.expect(format('select public.cancel_days(%L, array[%L::date], %L, gen_random_uuid())', b, pg_temp.d(20), 'Plans changed'),
    'Only days that haven’t started can be cancelled.');
  r := public.cancel_days(b, array[d2], 'Plans changed.', gen_random_uuid());
  assert r = '{"booking_status": "active", "shift_status": "open"}'::jsonb, r::text;
  assert private.day_dates(private.booked_days_here(pg_temp.m(3), s)) = array[d1, d3];
  assert private.day_dates(private.open_days(s, clock_timestamp())) = array[d2];
  assert pg_temp.status(s, 3) = 'booked';
  assert not (select d2 = any(private.day_dates(private.offered_days((select id from public.answers where shift_id = s and talent_id = pg_temp.m(3))))));
  assert (pg_temp.lines(1, 3))[cardinality(pg_temp.lines(1, 3))] = 'event:Spruce cancelled ' || private.fmt_date(d2) || ': Plans changed.',
    'no second full stop: ' || (pg_temp.lines(1, 3))[cardinality(pg_temp.lines(1, 3))];
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(3) and kind = 'days-cancelled'
                 and title = 'Spruce cancelled' and body = 'CDP · ' || private.fmt_date(d2) || ' · Plans changed');
  -- Someone else can't cancel it.
  perform pg_temp.login(4);
  perform pg_temp.expect(format('select public.cancel_days(%L, null, %L, gen_random_uuid())', b, 'Illness'), 'This booking can no longer be cancelled.');
  perform pg_temp.login(2);
  perform pg_temp.expect(format('select public.cancel_days(%L, null, %L, gen_random_uuid())', b, 'Illness'), 'This booking can no longer be cancelled.');
  -- She can offer the cancelled day again, and be booked for it again.
  assert pg_temp.yes(3, s, array[d2])->>'result' = 'said-yes';
  assert pg_temp.book(1, s, 3)->>'shift_status' = 'filled';
  assert private.day_dates(private.booked_days_here(pg_temp.m(3), s)) = array[d1, d2, d3];
end $$;

-- 3. A day that has started can't be cancelled ------------------------------
do $$
declare s uuid; b uuid;
begin
  s := pg_temp.past_shift(1, array[-1, 48]);
  b := pg_temp.past_answer(s, 3, 'booked', true);
  perform pg_temp.login(3);
  perform pg_temp.expect(format('select public.cancel_days(%L, array[%L::date], %L, gen_random_uuid())', b,
    (select day_date from public.shift_days where shift_id = s order by starts_at limit 1), 'Illness'),
    'Only days that haven’t started can be cancelled.');
  -- With no dates, only the day still to come is cancelled.
  assert (public.cancel_days(b, null, 'Illness', gen_random_uuid()))->>'booking_status' = 'active';
  assert (select array_agg(status order by starts_at) from public.booking_days where booking_id = b) = array['booked', 'cancelled'];
end $$;

-- 4. A cancellation reopens a filled multi-day, two-person shift ------------
do $$
declare s uuid; b uuid;
begin
  s := pg_temp.post(1, array[pg_temp.d(14), pg_temp.d(15)], 2);
  perform pg_temp.yes(3, s);
  perform pg_temp.yes(4, s);
  perform pg_temp.book(1, s, 3);
  b := (pg_temp.book(1, s, 4))->>'booking_id';
  assert (select status from public.shifts where id = s) = 'filled';
  perform pg_temp.login(4);
  assert (public.cancel_days(b, null, 'Illness', gen_random_uuid()))->>'shift_status' = 'open';
  assert cardinality(private.open_days(s, clock_timestamp())) = 2;
end $$;

-- 5. People told it was filled can say yes again once it reopens ------------
do $$
declare s uuid; b uuid;
begin
  s := pg_temp.post(1, array[pg_temp.d(16)]);
  perform pg_temp.yes(3, s);
  perform pg_temp.yes(4, s);
  b := (pg_temp.book(1, s, 4))->>'booking_id';
  assert pg_temp.status(s, 3) = 'not-selected';
  perform pg_temp.login(1);
  perform public.cancel_days(b, null, 'Plans changed', gen_random_uuid());
  assert pg_temp.yes(3, s)->>'result' = 'said-yes';
  assert pg_temp.status(s, 3) = 'can-cover';
  -- A closed shift never reopens.
  perform pg_temp.login(1);
  perform public.close_shift(s, 'Cover found elsewhere', gen_random_uuid());
  perform pg_temp.expect(format('select pg_temp.book(1, %L, 3)', s), 'This shift is no longer available.');
end $$;

-- 6. Confirming hours, and no-shows -----------------------------------------
do $$
declare s uuid; b uuid; r jsonb; d1 date; d2 date;
begin
  -- Day 1 ended 26 hours ago; day 2 ended 1 hour ago; day 3 is to come.
  s := pg_temp.past_shift(1, array[-32, -7, 30]);
  b := pg_temp.past_answer(s, 5, 'booked', true);
  select day_date into d1 from public.shift_days where shift_id = s order by starts_at limit 1;
  select day_date into d2 from public.shift_days where shift_id = s order by starts_at offset 1 limit 1;
  perform pg_temp.login(5);
  perform pg_temp.expect(format('select public.confirm_day(%L, %L, %L, null, null, gen_random_uuid())', b, d1, 'worked'), 'Only the venue confirms the hours worked.');
  perform pg_temp.login(2);
  perform pg_temp.expect(format('select public.confirm_day(%L, %L, %L, null, null, gen_random_uuid())', b, d1, 'worked'), 'Only the venue confirms the hours worked.');
  perform pg_temp.login(1);
  perform pg_temp.expect(format('select public.confirm_day(%L, %L, %L, null, null, gen_random_uuid())', b,
    (select day_date from public.shift_days where shift_id = s order by starts_at desc limit 1), 'worked'), 'You can confirm a day once it has finished.');
  perform pg_temp.expect(format('select public.confirm_day(%L, %L, %L, null, null, gen_random_uuid())', b, d1 - 10, 'worked'), 'This day has already been recorded.');
  perform pg_temp.expect(format('select public.confirm_day(%L, %L, %L, %L, %L, gen_random_uuid())', b, d1, 'worked', '17:00', '17:00'), 'Choose different start and end times.');
  -- It ran late: 17:00 to 00:30 at £18 is 7.5 hours and £135.
  r := public.confirm_day(b, d1, 'worked', '17:00', '00:30', gen_random_uuid());
  assert r = '{"worked_minutes": 450, "pay_pence": 13500}'::jsonb, r::text;
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(5) and kind = 'hours-confirmed'
                 and title = 'Spruce confirmed 7.5 hours' and body = private.fmt_date(d1) || ' · 17:00–00:30 · £135');
  perform pg_temp.expect(format('select public.confirm_day(%L, %L, %L, null, null, gen_random_uuid())', b, d1, 'no-show'), 'This day has already been recorded.');
  r := public.confirm_day(b, d2, 'no-show', null, null, gen_random_uuid());
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(5) and kind = 'no-show'
                 and title = 'Spruce marked you as a no-show' and body = private.fmt_date(d2));
  assert (select array_agg(status order by starts_at) from public.booking_days where booking_id = b) = array['worked', 'no-show', 'booked'];
  -- Recorded days never change, even directly.
  begin
    update public.booking_days set status = 'cancelled' where booking_id = b and status = 'worked';
    raise exception 'FAIL: recorded day changed';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  -- No conversation line for confirming.
  assert not exists (select 1 from public.messages where shift_id = s);
end $$;

-- 7. The sweep: a request whose day has started expires ----------------------
do $$
declare s uuid; r jsonb;
begin
  s := pg_temp.past_shift(1, array[-1], 1, 'request');
  perform pg_temp.past_answer(s, 3, 'invited');
  -- Before the sweep, reads already treat it as expired, and calls refuse.
  assert private.shift_state_now(s, clock_timestamp()) = 'expired';
  perform pg_temp.expect(format('select pg_temp.yes(3, %L)', s), 'This shift has already started.');
  perform pg_temp.login(3);
  perform pg_temp.expect(format('select public.decline_request(%L, gen_random_uuid())', s), 'This shift has already started.');
  perform pg_temp.login(1);
  perform pg_temp.expect(format('select public.close_shift(%L, %L, gen_random_uuid())', s, 'Plans changed'), 'This has already ended.');
  perform pg_temp.expect(format('select public.send_to_more(%L, array[pg_temp.m(4)], gen_random_uuid())', s), 'This shift is no longer open.');
  assert (select status from public.shifts where id = s) = 'open', 'a refusal saves nothing';
  r := private.sweep_once();
  assert (select status from public.shifts where id = s) = 'expired';
  assert pg_temp.status(s, 3) = 'lapsed';
  assert (select end_reason from public.answers where shift_id = s and talent_id = pg_temp.m(3)) = 'shift-started';
  assert (select array_agg(kind || ':' || body) from public.messages where shift_id = s) = array['event:This shift has started'];
  assert (select array_agg(kind || '|' || title || '|' || body) from public.notifications where shift_id = s and member_id = pg_temp.m(3))
       = array['shift-started|This shift has started|Spruce · CDP'];
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(1) and kind = 'shift-unfilled'
                 and title = 'Shift started unfilled'
                 and body = 'CDP · ' || private.fmt_date((select day_date from public.shift_days where shift_id = s)));
  -- A second run finds nothing more to do for it.
  perform private.sweep_once();
  assert (select count(*) from public.notifications where shift_id = s) = 2;
end $$;

-- 8. A multi-day shift stays open for later days after the first day starts --
do $$
declare s uuid;
begin
  s := pg_temp.past_shift(1, array[-1, 48]);
  perform pg_temp.past_answer(s, 4, 'can-cover');
  insert into public.answers (shift_id, talent_id, source, status) values (s, pg_temp.m(3), 'response', 'can-cover');
  insert into public.answer_days (answer_id, shift_id, shift_day_id)
  select a.id, s, d.id from public.answers a, public.shift_days d
  where a.shift_id = s and a.talent_id = pg_temp.m(3) and d.shift_id = s and d.starts_at < clock_timestamp();
  assert private.shift_due(s, clock_timestamp());
  perform private.sweep_once();
  assert (select status from public.shifts where id = s) = 'open';
  assert pg_temp.status(s, 3) = 'lapsed', 'Poppy offered only the started day';
  assert pg_temp.status(s, 4) = 'can-cover', 'Theo can still do the later day';
  assert not private.shift_due(s, clock_timestamp());
  assert not exists (select 1 from public.notifications where member_id = pg_temp.m(1) and shift_id = s);
end $$;

-- 9. Hours confirm themselves 48 hours after a day ends ----------------------
do $$
declare s uuid; b uuid; s2 uuid; b2 uuid;
begin
  s := pg_temp.past_shift(1, array[-60]);
  b := pg_temp.past_answer(s, 3, 'booked', true);
  s2 := pg_temp.past_shift(1, array[-30]);
  b2 := pg_temp.past_answer(s2, 4, 'booked', true);
  perform private.sweep_once();
  assert (select status || '/' || auto_confirmed || '/' || worked_minutes || '/' || pay_pence || '/' || coalesce(recorded_by::text, 'none')
          || '/' || worked_start_time || '-' || worked_end_time
          from public.booking_days where booking_id = b) = 'worked/true/360/10800/none/17:00:00-23:00:00';
  assert (select status from public.booking_days where booking_id = b2) = 'booked', 'ended 24h ago: still waiting for hours';
  assert not exists (select 1 from public.notifications where booking_id = b), 'no notice for automatic confirmation';
  perform pg_temp.login(1);
  perform pg_temp.expect(format('select public.confirm_day(%L, %L, %L, null, null, gen_random_uuid())', b,
    (select day_date from public.shift_days where shift_id = s), 'worked'), 'This day has already been recorded.');
end $$;

-- 10. Reminders: one before the first day; none once it has started ---------
do $$
declare s uuid; b uuid; s2 uuid; b2 uuid; d date;
begin
  -- Booked long ago, first day starts in 3 hours: the 18:00-the-day-before reminder is due.
  s := pg_temp.past_shift(1, array[3]);
  b := pg_temp.past_answer(s, 5, 'booked', true);
  select day_date into d from public.shift_days where shift_id = s;
  -- Its first day has already started and it was never reminded: marked, no notice.
  s2 := pg_temp.past_shift(1, array[-2]);
  b2 := pg_temp.past_answer(s2, 4, 'booked', true);
  perform private.sweep_once();
  assert (select reminded_at is not null from public.bookings where id = b);
  assert (select array_agg(kind || '|' || title || '|' || body) from public.notifications where booking_id = b)
       = array['reminder|Your shift at Spruce|' || private.service_label(d, '17:00', '23:00') || '. The address is in your booking.'];
  assert (select reminded_at is not null from public.bookings where id = b2);
  assert not exists (select 1 from public.notifications where booking_id = b2);
  perform private.sweep_once();
  assert (select count(*) from public.notifications where booking_id = b and kind = 'reminder') = 1, 'one reminder only';
end $$;

-- 11. The procedure the cron job calls exists, and the jobs are scheduled ---
do $$
begin
  assert exists (select 1 from cron.job where jobname = 'dyuknow-sweep' and schedule = '*/5 * * * *' and command = 'call private.run_sweep()');
  assert exists (select 1 from cron.job where jobname = 'dyuknow-daily-tidy' and schedule = '30 3 * * *');
  insert into public.call_receipts (member_id, client_ref, function_name, created_at)
  values (pg_temp.m(1), gen_random_uuid(), 'post_shift', now() - interval '8 days');
  assert (private.daily_tidy()->>'receipts')::int >= 1;
end $$;

select 'booking_cancel_confirm_sweep: all passed' as result;
rollback;
