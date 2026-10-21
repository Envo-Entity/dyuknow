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

-- 1. Job post → yes → one conversation → book: one booking, shift filled ---
do $$
declare s uuid; r jsonb; v_label text;
begin
  s := pg_temp.post(1, array[pg_temp.d(10)]);
  assert (select mode from public.shifts where id = s) = 'post', 'job post mode';
  v_label := private.service_label(pg_temp.d(10), '17:00', '23:00');
  assert pg_temp.notices(3) = array['job-posted|Spruce posted a job|CDP · ' || v_label || ' · £18/h'], 'Poppy alerted: ' || pg_temp.notices(3)::text;
  assert cardinality(pg_temp.notices(5)) = 0, 'Ines (Waiter) not alerted';
  assert cardinality(pg_temp.notices(6)) = 0, 'unapproved Wade not alerted';
  r := pg_temp.yes(3, s);
  assert r->>'result' = 'said-yes', 'said yes';
  assert pg_temp.status(s, 3) = 'can-cover';
  assert pg_temp.booked(s) = 0;
  assert pg_temp.lines(1, 3) = array['card:Can do it'], 'yes card: ' || pg_temp.lines(1, 3)::text;
  assert pg_temp.notices(1) = array['said-yes|Poppy Bertram can do it|CDP · ' || private.fmt_date(pg_temp.d(10)) || ' · 17:00–23:00'],
    'venue told: ' || pg_temp.notices(1)::text;
  r := pg_temp.book(1, s, 3);
  assert r->>'shift_status' = 'filled', 'filled';
  assert pg_temp.booked(s) = 1;
  assert pg_temp.status(s, 3) = 'booked';
  perform pg_temp.expect(format('select pg_temp.book(1, %L, 3)', s), 'This shift is no longer available.');
  assert pg_temp.booked(s) = 1;
  assert (select title from public.notifications where member_id = pg_temp.m(3) and kind = 'booked') = 'You''re booked at Spruce';
  assert not exists (select 1 from public.notifications where member_id = pg_temp.m(1) and kind in ('booked','accepted'));
  assert pg_temp.lines(1, 3) = array['card:Can do it', 'event:Booked: ' || private.fmt_date(pg_temp.d(10)) || ' · 17:00–23:00 · £18/h.'],
    'booked line: ' || pg_temp.lines(1, 3)::text;
  insert into ids values ('s1', s);
end $$;

-- 2. A booking request to several: both say yes, the venue chooses ---------
do $$
declare s uuid;
begin
  s := pg_temp.post(1, array[pg_temp.d(11)], 1, array[3, 4]);
  assert (select mode from public.shifts where id = s) = 'request';
  assert (select count(*) from public.answers where shift_id = s and status = 'invited') = 2;
  assert pg_temp.lines(1, 4) = array['card:Booking request'];
  assert (select title || '|' || body from public.notifications where member_id = pg_temp.m(4) and kind = 'booking-request')
       = 'Spruce sent you a booking request|CDP · ' || private.fmt_date(pg_temp.d(11)) || ' · 17:00–23:00 · £18/h';
  assert pg_temp.yes(3, s)->>'result' = 'said-yes', 'not an Accept when sent to two';
  assert pg_temp.yes(4, s)->>'result' = 'said-yes';
  assert pg_temp.booked(s) = 0;
  perform pg_temp.book(1, s, 4);
  assert pg_temp.status(s, 3) = 'not-selected';
  assert (select end_reason from public.answers where shift_id = s and talent_id = pg_temp.m(3)) = 'filled';
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(3) and kind = 'shift-filled'
                 and title = 'This shift has been filled' and body = 'Spruce · CDP');
  perform pg_temp.expect(format('select pg_temp.book(1, %L, 3)', s), 'This shift is no longer available.');
end $$;

-- 3. A request to one person for one place books when they accept ----------
do $$
declare s uuid; r jsonb;
begin
  s := pg_temp.post(1, array[pg_temp.d(12)], 1, array[3]);
  assert private.book_on_accept(s);
  r := pg_temp.yes(3, s);
  assert r->>'result' = 'booked' and r->>'booking_id' is not null, 'Accept books: ' || r::text;
  assert pg_temp.booked(s) = 1;
  assert (select status from public.shifts where id = s) = 'filled';
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(1) and kind = 'accepted'
                 and title = 'Poppy Bertram accepted'
                 and body = 'CDP · ' || private.fmt_date(pg_temp.d(12)) || ' · 17:00–23:00. They''re booked.'
                 and target = 'booking/' || (r->>'booking_id'));
  assert not exists (select 1 from public.notifications where member_id = pg_temp.m(3) and shift_id = s and kind <> 'booking-request'),
    'the talent who accepted is not told';
  assert (pg_temp.lines(1, 3))[cardinality(pg_temp.lines(1, 3))] like 'event:Poppy Bertram accepted. Booked: %';

  -- Two places: a yes, not a booking.
  s := pg_temp.post(1, array[pg_temp.d(13)], 2, array[3]);
  assert pg_temp.yes(3, s)->>'result' = 'said-yes';
  assert pg_temp.booked(s) = 0;
  -- Sent to a second person later: a yes again.
  s := pg_temp.post(1, array[pg_temp.d(14)], 1, array[3]);
  perform pg_temp.login(1);
  assert (public.send_to_more(s, array[pg_temp.m(4)], gen_random_uuid()))->>'sent' = '1';
  assert pg_temp.yes(3, s)->>'result' = 'said-yes';
  assert pg_temp.booked(s) = 0;
end $$;

-- 4. Requests can go outside the position; job posts can't be answered from outside it
do $$
declare s uuid;
begin
  s := pg_temp.post(1, array[pg_temp.d(15)], 1, array[5]);
  assert pg_temp.yes(5, s)->>'result' = 'booked';
  s := pg_temp.post(1, array[pg_temp.d(16)]);
  perform pg_temp.expect(format('select pg_temp.yes(5, %L)', s), 'This job is for other positions.');
  -- A request someone wasn't sent: they can't see it.
  s := pg_temp.post(1, array[pg_temp.d(17)], 1, array[3]);
  perform pg_temp.expect(format('select pg_temp.yes(4, %L)', s), 'This shift no longer exists.');
  -- A venue can't say yes; a waiting talent can't either.
  perform pg_temp.expect(format('select pg_temp.yes(1, %L)', s), 'Choose a talent member.');
  perform pg_temp.expect(format('select pg_temp.yes(6, %L)', s), 'Your profile is waiting for approval.');
  -- Only approved talent can be sent a request.
  perform pg_temp.expect('select pg_temp.post(1, array[pg_temp.d(18)], 1, array[6])', 'Choose talent members to send this to.');
  perform pg_temp.expect('select pg_temp.post(1, array[pg_temp.d(18)], 1, array[2])', 'Choose talent members to send this to.');
end $$;

-- 5. Declining tells the venue; a request everyone declined closes as Declined
do $$
declare s uuid; r jsonb;
begin
  s := pg_temp.post(1, array[pg_temp.d(19)], 1, array[3, 4]);
  perform pg_temp.login(3);
  r := public.decline_request(s, gen_random_uuid());
  assert r->>'shift_status' = 'open';
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(1) and kind = 'declined'
                 and title = 'Poppy Bertram declined' and body = 'CDP · ' || private.fmt_date(pg_temp.d(19)) || ' · 17:00–23:00');
  assert (pg_temp.lines(1, 3))[cardinality(pg_temp.lines(1, 3))] = 'event:Poppy Bertram declined.';
  perform pg_temp.expect(format('select public.decline_request(%L, gen_random_uuid())', s), 'This has already been answered.');
  perform pg_temp.login(4);
  r := public.decline_request(s, gen_random_uuid());
  assert r->>'shift_status' = 'closed';
  assert (select closed_by from public.shifts where id = s) = 'all-declined';
  perform pg_temp.login(1);
  perform pg_temp.expect(format('select public.send_to_more(%L, array[pg_temp.m(5)], gen_random_uuid())', s), 'This shift is no longer open.');
  -- Someone with no answer can't decline.
  perform pg_temp.login(5);
  perform pg_temp.expect(format('select public.decline_request(%L, gen_random_uuid())', s), 'This shift no longer exists.');
end $$;

-- 6. Multi-day, two-person cover stays open until both are booked ----------
do $$
declare s uuid;
begin
  s := pg_temp.post(1, array[pg_temp.d(20), pg_temp.d(21), pg_temp.d(22)], 2);
  assert (select count(*) from public.shift_days where shift_id = s) = 3;
  perform pg_temp.yes(3, s);
  perform pg_temp.yes(4, s);
  assert pg_temp.book(1, s, 3)->>'shift_status' = 'open';
  assert pg_temp.booked(s) = 3;
  assert pg_temp.book(1, s, 4)->>'shift_status' = 'filled';
  assert pg_temp.booked(s) = 6;
end $$;

-- 7. A booking elsewhere lapses other waiting answers and blocks a late booking
do $$
declare a uuid; b uuid;
begin
  a := pg_temp.post(1, array[pg_temp.d(23)]);
  perform pg_temp.yes(3, a);
  b := pg_temp.post(2, array[pg_temp.d(23)], 1, array[3]);
  assert pg_temp.yes(3, b)->>'result' = 'booked';
  assert pg_temp.status(a, 3) = 'lapsed';
  assert (select end_reason from public.answers where shift_id = a and talent_id = pg_temp.m(3)) = 'booked-elsewhere';
  assert (pg_temp.lines(1, 3))[cardinality(pg_temp.lines(1, 3))] = 'event:Poppy Bertram is now booked elsewhere at this time.';
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(1) and kind = 'booked-elsewhere'
                 and title = 'Poppy Bertram is booked elsewhere' and body = 'CDP · ' || private.fmt_date(pg_temp.d(23)));
  perform pg_temp.expect(format('select pg_temp.book(1, %L, 3)', a), 'Poppy can’t be booked any more.');
  -- Saying yes again is refused while booked elsewhere.
  perform pg_temp.expect(format('select pg_temp.yes(3, %L)', a), 'You’re booked elsewhere at that time.');
  -- Spruce can't ask her again for those hours.
  perform pg_temp.expect(format('select pg_temp.post(1, array[%L::date], 1, array[3])', pg_temp.d(23)), 'Poppy is booked elsewhere then.');
end $$;

-- 8. Withdrawal wins before book; closing keeps confirmed places ------------
do $$
declare s uuid; r jsonb;
begin
  s := pg_temp.post(1, array[pg_temp.d(24)], 2);
  perform pg_temp.yes(3, s);
  perform pg_temp.login(3);
  r := public.withdraw_yes(s, gen_random_uuid());
  assert r->>'shift_status' = 'open';
  assert pg_temp.status(s, 3) = 'withdrawn';
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(1) and kind = 'withdrew' and title = 'Poppy Bertram withdrew');
  perform pg_temp.expect(format('select public.withdraw_yes(%L, gen_random_uuid())', s), 'This has already been answered.');
  perform pg_temp.expect(format('select pg_temp.book(1, %L, 3)', s), 'Poppy can’t be booked any more.');
  perform pg_temp.yes(3, s);
  perform pg_temp.yes(4, s);
  perform pg_temp.book(1, s, 3);
  perform pg_temp.login(1);
  perform pg_temp.expect(format('select public.close_shift(%L, %L, gen_random_uuid())', s, '  '), 'Choose a reason.');
  perform public.close_shift(s, 'Plans changed', gen_random_uuid());
  assert (select status || '/' || closed_by || '/' || close_reason from public.shifts where id = s) = 'closed/venue/Plans changed';
  assert pg_temp.booked(s) = 1;
  assert pg_temp.status(s, 3) = 'booked';
  assert pg_temp.status(s, 4) = 'not-selected';
  assert (select end_reason from public.answers where shift_id = s and talent_id = pg_temp.m(4)) = 'venue-closed';
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(4) and kind = 'shift-closed'
                 and title = 'Cancelled by Spruce: Plans changed' and body = 'Spruce · CDP');
  assert not exists (select 1 from public.notifications where member_id = pg_temp.m(3) and kind = 'shift-closed');
  perform pg_temp.expect(format('select public.close_shift(%L, %L, gen_random_uuid())', s, 'Plans changed'), 'This has already ended.');
  perform pg_temp.login(2);
  perform pg_temp.expect(format('select public.close_shift(%L, %L, gen_random_uuid())', s, 'Plans changed'), 'This shift no longer exists.');
end $$;

-- 9. Partial cover: some days each, the rest stay open ----------------------
do $$
declare s uuid; d1 date := pg_temp.d(26); d2 date := pg_temp.d(27); d3 date := pg_temp.d(28);
begin
  s := pg_temp.post(1, array[d1, d2, d3]);
  perform pg_temp.yes(3, s, array[d1, d2]);
  perform pg_temp.yes(4, s);
  assert private.day_dates(private.offered_days((select id from public.answers where shift_id = s and talent_id = pg_temp.m(3)))) = array[d1, d2];
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(1) and kind = 'said-yes'
                 and body like '% (2 of 3 days)'), 'partial yes says k of n';
  assert (pg_temp.lines(1, 3))[cardinality(pg_temp.lines(1, 3))] = 'card:Can do ' || private.fmt_dates(array[d1, d2]);
  assert pg_temp.book(1, s, 3)->>'shift_status' = 'open';
  assert private.day_dates(private.open_days(s, clock_timestamp())) = array[d3];
  -- Theo said yes to every day; booking him now takes only the day still open.
  assert pg_temp.book(1, s, 4)->>'shift_status' = 'filled';
  assert private.day_dates(private.booked_days_here(pg_temp.m(4), s)) = array[d3];
end $$;

-- 10. An answer whose days are all filled is told so --------------------------
do $$
declare s uuid; d1 date := pg_temp.d(29); d2 date := pg_temp.d(30); d3 date := pg_temp.d(31);
begin
  s := pg_temp.post(1, array[d1, d2, d3]);
  perform pg_temp.yes(3, s, array[d1]);
  perform pg_temp.yes(4, s, array[d1, d2]);
  perform pg_temp.book(1, s, 4);
  assert (select status from public.shifts where id = s) = 'open';
  assert pg_temp.status(s, 3) = 'not-selected';
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(3) and kind = 'filled-by-other'
                 and title = 'Filled by someone else' and body = 'Spruce · CDP');
  assert (pg_temp.lines(1, 3))[cardinality(pg_temp.lines(1, 3))] = 'event:Filled by someone else.';
  -- Saying yes to days already filled or not in the shift is refused.
  perform pg_temp.expect(format('select pg_temp.yes(5, %L, array[%L::date])', s, pg_temp.d(40)), 'This job is for other positions.');
  perform pg_temp.login(3);
end $$;
do $$
declare s uuid; d1 date := pg_temp.d(32); d2 date := pg_temp.d(33);
begin
  s := pg_temp.post(1, array[d1, d2]);
  perform pg_temp.expect(format('select pg_temp.yes(3, %L, array[%L::date])', s, pg_temp.d(50)), 'Choose dates from this shift.');
  perform pg_temp.yes(4, s, array[d1]);
  perform pg_temp.book(1, s, 4);
  perform pg_temp.expect(format('select pg_temp.yes(3, %L, array[%L::date])', s, d1),
    'One of those days isn’t available any more. Check the days and try again.');
  -- One answer per person: a second yes is refused.
  perform pg_temp.yes(3, s, array[d2]);
  perform pg_temp.expect(format('select pg_temp.yes(3, %L, array[%L::date])', s, d2), 'You’ve already said yes to this.');
  -- Book with days they didn't offer, or that aren't open.
  perform pg_temp.expect(format('select pg_temp.book(1, %L, 3, array[%L::date])', s, d1), 'Book only days they said yes to that are still open.');
end $$;

-- 11. A booking request can be accepted for some days; the rest stay open ---
do $$
declare s uuid; d1 date := pg_temp.d(34); d2 date := pg_temp.d(35); d3 date := pg_temp.d(36);
begin
  s := pg_temp.post(1, array[d1, d2, d3], 1, array[3]);
  assert pg_temp.yes(3, s, array[d1])->>'result' = 'booked';
  assert pg_temp.status(s, 3) = 'booked';
  assert private.day_dates(private.booked_days_here(pg_temp.m(3), s)) = array[d1];
  assert private.day_dates(private.open_days(s, clock_timestamp())) = array[d2, d3];
  -- She can offer more days on her booking; the venue then adds them.
  assert pg_temp.yes(3, s, array[d2])->>'result' = 'said-yes';
  assert (pg_temp.lines(1, 3))[cardinality(pg_temp.lines(1, 3))] = 'card:Can also do ' || private.fmt_date(d2);
  assert pg_temp.book(1, s, 3)->>'shift_status' = 'open';
  assert private.day_dates(private.booked_days_here(pg_temp.m(3), s)) = array[d1, d2];
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(3) and kind = 'days-added'
                 and title = 'Spruce added ' || private.fmt_date(d2) || ' to your booking'
                 and body = 'CDP · ' || private.fmt_dates(array[d1, d2]) || ' · 17:00–23:00');
end $$;

-- 12. A booking elsewhere trims clashing days from other answers -------------
do $$
declare m uuid; b uuid; d1 date := pg_temp.d(37); d2 date := pg_temp.d(38); d3 date := pg_temp.d(39);
begin
  m := pg_temp.post(1, array[d1, d2, d3]);
  perform pg_temp.yes(3, m);
  b := pg_temp.post(2, array[d2], 1, array[3]);
  assert pg_temp.yes(3, b)->>'result' = 'booked';
  assert pg_temp.status(m, 3) = 'can-cover';
  assert private.day_dates(private.offered_days((select id from public.answers where shift_id = m and talent_id = pg_temp.m(3)))) = array[d1, d3];
  assert (pg_temp.lines(1, 3))[cardinality(pg_temp.lines(1, 3))]
       = 'event:Poppy Bertram is now booked elsewhere on ' || private.fmt_date(d2) || '. Still free ' || private.fmt_dates(array[d1, d3]) || '.';
  -- An invited answer with days left stays invited.
  m := pg_temp.post(1, array[pg_temp.d(41), pg_temp.d(42)], 2, array[4]);
  b := pg_temp.post(2, array[pg_temp.d(42)], 1, array[4]);
  perform pg_temp.yes(4, b);
  assert pg_temp.status(m, 4) = 'invited';
  assert private.day_dates(private.waiting_days((select id from public.answers where shift_id = m and talent_id = pg_temp.m(4)), clock_timestamp())) = array[pg_temp.d(41)];
end $$;

-- 13. Mix and match: book chosen days, add more of the same person's days later
do $$
declare s uuid; d1 date := pg_temp.d(43); d2 date := pg_temp.d(44); d3 date := pg_temp.d(45);
begin
  s := pg_temp.post(1, array[d1, d2, d3]);
  perform pg_temp.yes(3, s);
  perform pg_temp.yes(4, s, array[d1]);
  perform pg_temp.book(1, s, 4, array[d1]);
  perform pg_temp.book(1, s, 3, array[d2]);
  assert private.day_dates(private.open_days(s, clock_timestamp())) = array[d3];
  perform pg_temp.expect(format('select pg_temp.book(1, %L, 3, array[%L::date])', s, d1), 'Book only days they said yes to that are still open.');
  assert pg_temp.book(1, s, 3, array[d3])->>'shift_status' = 'filled';
  assert (select count(*) from public.bookings where shift_id = s and talent_id = pg_temp.m(3)) = 1, 'one booking extended';
  assert private.day_dates(private.booked_days_here(pg_temp.m(3), s)) = array[d2, d3];
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(3) and kind = 'days-added');
end $$;

-- 14. No double booking: two venues book one person for clashing hours -----
do $$
declare a uuid; b uuid;
begin
  a := pg_temp.post(1, array[pg_temp.d(46)]);
  b := pg_temp.post(2, array[pg_temp.d(46)]);
  perform pg_temp.yes(4, a);
  perform pg_temp.yes(4, b);
  perform pg_temp.book(1, a, 4);
  perform pg_temp.expect(format('select pg_temp.book(2, %L, 4)', b), 'Theo can’t be booked any more.');
  assert pg_temp.booked(b) = 0;
  assert (select count(*) from public.booking_days where talent_id = pg_temp.m(4) and status <> 'cancelled'
          and starts_at = (select starts_at from public.shift_days where shift_id = a)) = 1;
end $$;
do $$
declare a uuid; b uuid; bk uuid; ans uuid;
begin
  a := pg_temp.post(1, array[pg_temp.d(47)]);
  perform pg_temp.yes(4, a);
  -- A clashing live day for Theo at Harper, written directly (no trimming).
  b := pg_temp.past_shift(2, array[0]);
  update public.shift_days set starts_at = (select starts_at from public.shift_days where shift_id = a),
                               ends_at = (select ends_at from public.shift_days where shift_id = a),
                               day_date = pg_temp.d(47)
   where shift_id = b;
  ans := pg_temp.past_answer(b, 4, 'booked', true);
  -- Settling the shift ends Theo's answer (no day left for him), so Book refuses plainly.
  perform pg_temp.expect(format('select pg_temp.book(1, %L, 4)', a), 'Theo can’t be booked any more.');
  -- And the exclusion constraint refuses the clashing live day written directly.
  insert into public.bookings (shift_id, talent_id) values (a, pg_temp.m(4)) returning id into bk;
  begin
    insert into public.booking_days (booking_id, shift_day_id, shift_id, talent_id, starts_at, ends_at)
    select bk, d.id, a, pg_temp.m(4), d.starts_at, d.ends_at from public.shift_days d where d.shift_id = a;
    raise exception 'FAIL: overlapping day accepted';
  exception when exclusion_violation then null;
  end;
end $$;

-- 15. Capacity: the trigger refuses a booked day beyond capacity -----------
do $$
declare s uuid; bk uuid; got text;
begin
  s := pg_temp.post(1, array[pg_temp.d(49)], 1);
  perform pg_temp.yes(3, s);
  perform pg_temp.yes(4, s);
  perform pg_temp.book(1, s, 3);
  update public.answers set status = 'booked', end_reason = null where shift_id = s and talent_id = pg_temp.m(4);
  insert into public.bookings (shift_id, talent_id) values (s, pg_temp.m(4)) returning id into bk;
  begin
    insert into public.booking_days (booking_id, shift_day_id, shift_id, talent_id, starts_at, ends_at)
    select bk, d.id, s, pg_temp.m(4), d.starts_at, d.ends_at from public.shift_days d where d.shift_id = s;
    got := 'none';
  exception when others then got := sqlstate;
  end;
  assert got = 'DK001', 'capacity trigger: ' || got;
  assert (select booked_count from public.shift_days where shift_id = s) = 1;
end $$;

-- 16. Sending a job post to more people reuses its places and answers -----
do $$
declare s uuid; r jsonb;
begin
  s := pg_temp.post(1, array[pg_temp.d(50)]);
  perform pg_temp.yes(3, s);
  perform pg_temp.login(1);
  r := public.send_to_more(s, array[pg_temp.m(3), pg_temp.m(4)], gen_random_uuid());
  assert r->>'sent' = '1', 'only Theo newly sent: ' || r::text;
  assert pg_temp.status(s, 3) = 'can-cover';
  assert pg_temp.status(s, 4) = 'invited';
  assert not private.book_on_accept(s), 'a job post never becomes an Accept';
  assert pg_temp.yes(4, s)->>'result' = 'said-yes';
  perform pg_temp.book(1, s, 4);
  assert pg_temp.status(s, 3) = 'not-selected';
  perform pg_temp.expect(format('select public.send_to_more(%L, array[]::uuid[], gen_random_uuid())', s), 'This shift is no longer open.');
  perform pg_temp.login(2);
  perform pg_temp.expect(format('select public.send_to_more(%L, array[pg_temp.m(5)], gen_random_uuid())', s), 'This shift no longer exists.');
end $$;

-- 17. A venue can't send a second ask to someone answering one of its asks --
do $$
declare s uuid; n int;
begin
  s := pg_temp.post(1, array[pg_temp.d(51)]);
  perform pg_temp.yes(3, s);
  n := (select count(*) from public.shifts);
  perform pg_temp.expect(format('select pg_temp.post(1, array[%L::date], 1, array[3])', pg_temp.d(51)),
    'Poppy already said yes to your job post for this time.');
  assert (select count(*) from public.shifts) = n, 'nothing was created';
  perform pg_temp.post(1, array[pg_temp.d(52)], 1, array[3]);
  perform pg_temp.expect(format('select pg_temp.post(1, array[%L::date], 1, array[3])', pg_temp.d(52)),
    'You’ve already asked Poppy for this time.');
  perform pg_temp.book(1, s, 3);
  perform pg_temp.expect(format('select pg_temp.post(1, array[%L::date], 1, array[3])', pg_temp.d(51)),
    'Poppy is already booked then.');
end $$;

-- 18. Booking clears a clashing answer with the same venue without calling it elsewhere
do $$
declare a uuid; b uuid;
begin
  a := pg_temp.post(1, array[pg_temp.d(53)]);
  b := pg_temp.post(1, array[pg_temp.d(53)], 1, '{}', '{Senior CDP,CDP}');
  perform pg_temp.yes(4, a);
  perform pg_temp.yes(4, b);
  perform pg_temp.book(1, a, 4);
  assert pg_temp.status(b, 4) = 'lapsed';
  assert (pg_temp.lines(1, 4))[cardinality(pg_temp.lines(1, 4))] = 'event:Theo Lane is now booked on another Spruce shift at this time.';
  assert not exists (select 1 from public.notifications where member_id = pg_temp.m(1) and kind = 'booked-elsewhere' and shift_id = b);
end $$;

-- 19. Sending again clears old days ------------------------------------------
do $$
declare s uuid; d1 date := pg_temp.d(54); d2 date := pg_temp.d(55); a uuid;
begin
  s := pg_temp.post(1, array[d1, d2], 2);
  perform pg_temp.yes(3, s, array[d1]);
  perform pg_temp.login(3);
  perform public.withdraw_yes(s, gen_random_uuid());
  perform pg_temp.login(1);
  perform public.send_to_more(s, array[pg_temp.m(3)], gen_random_uuid());
  select id into a from public.answers where shift_id = s and talent_id = pg_temp.m(3);
  assert pg_temp.status(s, 3) = 'invited';
  assert (select source from public.answers where id = a) = 'invite';
  assert not exists (select 1 from public.answer_days where answer_id = a), 'old days cleared';
end $$;

-- 20. post_shift refusals and output ----------------------------------------
do $$
declare r jsonb;
begin
  perform pg_temp.login(3);
  perform pg_temp.expect($q$select public.post_shift('Kitchen','{CDP}',array[pg_temp.d(5)],'17:00','23:00',1,1800,'',null,gen_random_uuid())$q$, 'Only venues can send shifts.');
  perform pg_temp.login(1);
  perform pg_temp.expect($q$select public.post_shift('Bar','{CDP}',array[pg_temp.d(5)],'17:00','23:00',1,1800,'',null,gen_random_uuid())$q$, 'Choose the position you need.');
  perform pg_temp.expect($q$select public.post_shift('Kitchen','{}',array[pg_temp.d(5)],'17:00','23:00',1,1800,'',null,gen_random_uuid())$q$, 'Choose the position you need.');
  perform pg_temp.expect($q$select public.post_shift('Kitchen','{CDP}',array[pg_temp.d(5)],'17:00','23:00',1,0,'',null,gen_random_uuid())$q$, 'Add the pay per hour.');
  perform pg_temp.expect($q$select public.post_shift('Kitchen','{CDP}',array[pg_temp.d(5)],'17:00','23:00',6,1800,'',null,gen_random_uuid())$q$, 'Choose between 1 and 5 people.');
  perform pg_temp.expect($q$select public.post_shift('Kitchen','{CDP}',array[pg_temp.d(5)],'17:00','23:00',1,1800,repeat('x',2001),null,gen_random_uuid())$q$, 'Keep the note under 2,000 characters.');
  perform pg_temp.expect($q$select public.post_shift('Kitchen','{CDP}',array[]::date[],'17:00','23:00',1,1800,'',null,gen_random_uuid())$q$, 'Choose between 1 and 14 dates.');
  perform pg_temp.expect($q$select public.post_shift('Kitchen','{CDP}',(select array_agg(pg_temp.d(n)) from generate_series(1,15) n),'17:00','23:00',1,1800,'',null,gen_random_uuid())$q$, 'Choose between 1 and 14 dates.');
  perform pg_temp.expect($q$select public.post_shift('Kitchen','{CDP}',array[pg_temp.d(5)],'17:00','17:00',1,1800,'',null,gen_random_uuid())$q$, 'Choose different start and end times.');
  perform pg_temp.expect($q$select public.post_shift('Kitchen','{CDP}',array['2026-10-25'::date],'01:30','05:00',1,1800,'',null,gen_random_uuid())$q$, 'That time happens twice when the clocks go back. Choose another.');
  perform pg_temp.expect($q$select public.post_shift('Kitchen','{CDP}',array[pg_temp.d(-1)],'17:00','23:00',1,1800,'',null,gen_random_uuid())$q$, 'That start time has passed.');
  perform pg_temp.expect($q$select public.post_shift('Kitchen','{CDP}',array[pg_temp.d(56)],'17:00','23:00',1,1800,'',null,gen_random_uuid())$q$, 'Choose dates in the next 8 weeks.');
  -- Repeats are dropped and the list is sorted; overnight ends the next morning.
  r := public.post_shift('Kitchen','{CDP}',array[pg_temp.d(9), pg_temp.d(7), pg_temp.d(9)],'22:00','02:00',1,1850,'',null,gen_random_uuid());
  assert (select array_agg(day_date order by day_date) from public.shift_days where shift_id = (r->>'shift_id')::uuid) = array[pg_temp.d(7), pg_temp.d(9)];
  assert (select bool_and(ends_at - starts_at = interval '4 hours') from public.shift_days where shift_id = (r->>'shift_id')::uuid);
  -- Counts include any other members in the database, so only a lower bound here.
  assert (r->>'in_position_count')::int >= 2 and (r->>'alerted_count')::int >= 2, 'Poppy and Theo hold CDP: ' || r::text;
  assert r->>'mode' = 'post';
  assert (select body from public.notifications where shift_id = (r->>'shift_id')::uuid and member_id = pg_temp.m(4))
       = 'CDP · ' || private.fmt_dates(array[pg_temp.d(7), pg_temp.d(9)]) || ' · 22:00–02:00 · £18.50/h';
  -- An unapproved venue can't post.
  update public.members set approved = false where id = pg_temp.m(2);
  perform pg_temp.login(2);
  perform pg_temp.expect($q$select public.post_shift('Kitchen','{CDP}',array[pg_temp.d(5)],'17:00','23:00',1,1800,'',null,gen_random_uuid())$q$, 'Your profile is waiting for approval.');
  update public.members set approved = true where id = pg_temp.m(2);
end $$;

-- 21. Job-post alerts skip people booked across every day, deletion requests and Off
do $$
declare s uuid; r jsonb;
begin
  s := pg_temp.post(1, array[pg_temp.d(8)], 1, array[3]);
  perform pg_temp.yes(3, s);                                           -- Poppy booked on d8
  update public.talents set shift_alerts = 'off' where member_id = pg_temp.m(4);
  perform pg_temp.login(2);
  r := public.post_shift('Kitchen','{CDP}',array[pg_temp.d(8)],'17:00','23:00',1,1800,'',null,gen_random_uuid());
  assert pg_temp.alerted((r->>'shift_id')::uuid) = 0, 'nobody alerted: ' || r::text;
  update public.talents set shift_alerts = 'soon' where member_id = pg_temp.m(4);
  r := public.post_shift('Kitchen','{CDP}',array[pg_temp.d(6)],'17:00','23:00',1,1800,'',null,gen_random_uuid());
  assert pg_temp.alerted((r->>'shift_id')::uuid) = 1, 'Poppy only (Theo soon, not tomorrow): ' || r::text;
  r := public.post_shift('Kitchen','{CDP}',array[pg_temp.d(1)],'17:00','23:00',1,1800,'',null,gen_random_uuid());
  assert pg_temp.alerted((r->>'shift_id')::uuid) = 2, 'tomorrow reaches soon: ' || r::text;
  update public.members set deletion_requested_at = now() where id = pg_temp.m(3);
  r := public.post_shift('Kitchen','{CDP}',array[pg_temp.d(2)],'17:00','23:00',1,1800,'',null,gen_random_uuid());
  assert pg_temp.alerted((r->>'shift_id')::uuid) = 0, 'deletion request and soon skip: ' || r::text;
  update public.members set deletion_requested_at = null where id = pg_temp.m(3);
  update public.talents set shift_alerts = 'all' where member_id = pg_temp.m(4);
end $$;

-- 22. A repeated tap returns the first result; a reused ref for another function is refused
do $$
declare ref uuid := gen_random_uuid(); r1 jsonb; r2 jsonb; s uuid;
begin
  perform pg_temp.login(1);
  r1 := public.post_shift('Kitchen','{CDP}',array[pg_temp.d(3)],'17:00','23:00',1,1800,'',null,ref);
  r2 := public.post_shift('Kitchen','{CDP}',array[pg_temp.d(3)],'17:00','23:00',1,1800,'',null,ref);
  assert r1 = r2, 'same result';
  assert (select count(*) from public.shifts where venue_id = pg_temp.m(1) and id = (r1->>'shift_id')::uuid) = 1;
  perform pg_temp.expect(format('select public.close_shift(%L, %L, %L)', r1->>'shift_id', 'Plans changed', ref), 'Couldn’t save. Try again.');
  perform pg_temp.expect(format('select public.close_shift(%L, %L, null)', r1->>'shift_id', 'Plans changed'), 'Couldn’t save. Try again.');
  -- A fresh tap after a success gets a true message.
  s := (r1->>'shift_id')::uuid;
  perform pg_temp.yes(3, s);
  perform pg_temp.expect(format('select pg_temp.yes(3, %L)', s), 'You’ve already said yes to this.');
  -- Signed out, or no profile.
  perform set_config('request.jwt.claims', '', true);
  perform pg_temp.expect(format('select public.say_yes(%L, null, gen_random_uuid())', s), 'Sign in to continue.');
  perform pg_temp.login(7);
  perform pg_temp.expect(format('select public.say_yes(%L, null, gen_random_uuid())', s), 'Create your profile first.');
end $$;

select 'booking_flow: all passed' as result;
rollback;
