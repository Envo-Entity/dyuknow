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

-- 1. get_badge_counts --------------------------------------------------------
do $$
declare s uuid; p uuid; r jsonb; b uuid; past uuid; pb uuid; c uuid;
begin
  -- Nobody signed in with a member: zeros.
  perform pg_temp.login(7);
  r := public.get_badge_counts();
  assert r = '{"unread_notifications": 0, "unread_conversation_ids": [], "needs_you": 0, "account_attention": false}'::jsonb, r::text;

  -- Talent: a booking request waiting for their answer.
  s := pg_temp.post(1, array[pg_temp.d(10)], 1, array[3]);
  perform pg_temp.login(3);
  r := public.get_badge_counts();
  select id into c from public.conversations where venue_id = pg_temp.m(1) and talent_id = pg_temp.m(3);
  assert (r->>'needs_you')::int = 1, r::text;
  assert (r->>'unread_notifications')::int = 1, r::text;
  assert r->'unread_conversation_ids' = jsonb_build_array(c), r::text;
  insert into public.conversation_reads (conversation_id, member_id, last_read_seq)
  values (c, pg_temp.m(3), (select last_seq from public.conversations where id = c));
  update public.notifications set read_at = now() where member_id = pg_temp.m(3);
  perform public.decline_request(s, gen_random_uuid());
  r := public.get_badge_counts();
  assert r = '{"unread_notifications": 0, "unread_conversation_ids": [], "needs_you": 0, "account_attention": false}'::jsonb,
    'own grey line is not unread: ' || r::text;

  -- Venue: a yes it can still book.
  p := pg_temp.post(1, array[pg_temp.d(11), pg_temp.d(12)]);
  perform pg_temp.yes(4, p);
  perform pg_temp.login(1);
  assert (public.get_badge_counts()->>'needs_you')::int = 1;
  b := (pg_temp.book(1, p, 4))->>'booking_id';
  perform pg_temp.login(1);
  assert (public.get_badge_counts()->>'needs_you')::int = 0, 'filled: nothing to book';
  -- A cancelled day that needs someone again.
  perform public.cancel_days(b, array[pg_temp.d(12)], 'Plans changed', gen_random_uuid());
  assert (public.get_badge_counts()->>'needs_you')::int = 1, 'cancelled day open again';
  -- A finished day waiting for hours (ended 2 hours ago), counted once per booking.
  past := pg_temp.past_shift(1, array[-8]);
  pb := pg_temp.past_answer(past, 3, 'booked', true);
  assert (public.get_badge_counts()->>'needs_you')::int = 2;
  perform public.confirm_day(pb, (select day_date from public.shift_days where shift_id = past), 'worked', null, null, gen_random_uuid());
  assert (public.get_badge_counts()->>'needs_you')::int = 1;
  -- A paused venue sees only the hours count.
  update public.members set approved = false where id = pg_temp.m(1);
  assert (public.get_badge_counts()->>'needs_you')::int = 0;
  update public.members set approved = true where id = pg_temp.m(1);
  -- A rejected document lights the Account dot.
  insert into public.documents (member_id, doc_type, storage_path, original_filename, content_type, size_bytes,
                                status, reviewed_at, reviewed_by, reject_reason)
  values (pg_temp.m(1), 'premises-licence', 'a0000000-0000-0000-0000-000000000001/x.pdf', 'x.pdf', 'application/pdf', 10,
          'rejected', now(), 'a0000000-0000-0000-0000-000000000007', 'Blurry');
  assert (public.get_badge_counts()->>'account_attention')::boolean;
end $$;

-- 2. get_booking_contact -------------------------------------------------------
do $$
declare s uuid; b uuid; r jsonb; past uuid; pb uuid;
begin
  s := pg_temp.post(2, array[pg_temp.d(13)], 1, array[5]);
  b := (pg_temp.yes(5, s))->>'booking_id';
  perform pg_temp.login(5);
  r := public.get_booking_contact(b);
  assert r - 'window_closes_at' = '{"street_address": "2 High St", "postcode": "W1 2AA", "contact_name": "Hal Jones", "contact_position": "Manager", "contact_phone": "07700900002"}'::jsonb, r::text;
  assert (r->>'window_closes_at')::timestamptz = (select ends_at + interval '48 hours' from public.booking_days where booking_id = b);
  perform pg_temp.login(2);
  r := public.get_booking_contact(b);
  assert r - 'window_closes_at' = '{"mobile_number": "07700900005"}'::jsonb, r::text;
  perform pg_temp.login(1);
  perform pg_temp.expect(format('select public.get_booking_contact(%L)', b), 'Contact details aren’t available for this booking.');
  perform pg_temp.login(4);
  perform pg_temp.expect(format('select public.get_booking_contact(%L)', b), 'Contact details aren’t available for this booking.');
  perform pg_temp.expect(format('select public.get_booking_contact(%L)', gen_random_uuid()), 'Contact details aren’t available for this booking.');
  -- A paused member gets nothing, even inside the window.
  update public.members set approved = false where id = pg_temp.m(5);
  perform pg_temp.login(5);
  perform pg_temp.expect(format('select public.get_booking_contact(%L)', b), 'Contact details aren’t available for this booking.');
  update public.members set approved = true where id = pg_temp.m(5);
  -- Fully cancelled: no window.
  perform public.cancel_days(b, null, 'Illness', gen_random_uuid());
  perform pg_temp.expect(format('select public.get_booking_contact(%L)', b), 'Contact details aren’t available for this booking.');
  -- The window closes 48 hours after the last day ends.
  past := pg_temp.past_shift(2, array[-60]);
  pb := pg_temp.past_answer(past, 5, 'booked', true);
  perform pg_temp.expect(format('select public.get_booking_contact(%L)', pb), 'Contact details aren’t available for this booking.');
end $$;

-- 3. get_busy_times -----------------------------------------------------------
do $$
declare s uuid; n int;
begin
  s := pg_temp.post(1, array[pg_temp.d(14)], 1, array[3]);
  perform pg_temp.yes(3, s);
  perform pg_temp.login(2);
  select count(*) into n from public.get_busy_times(array[pg_temp.m(3), pg_temp.m(6)], pg_temp.d(13), pg_temp.d(15));
  assert n = 1, 'one booked day, never where: ' || n;
  -- Booked days elsewhere count too (Theo's day from test 1), and the whole window works.
  select count(*) into n from public.get_busy_times(array[pg_temp.m(3), pg_temp.m(4), pg_temp.m(6)], pg_temp.d(0), pg_temp.d(55));
  assert n >= 2, 'whole window: ' || n;
  assert (select starts_at from public.get_busy_times(array[pg_temp.m(3)], pg_temp.d(14), pg_temp.d(14)))
       = (select starts_at from public.shift_days where shift_id = s);
  select count(*) into n from public.get_busy_times(array[pg_temp.m(3)], pg_temp.d(15), pg_temp.d(20));
  assert n = 0;
  perform pg_temp.expect(format('select * from public.get_busy_times(array[%L::uuid], %L, %L)', pg_temp.m(3), pg_temp.d(-1), pg_temp.d(3)), 'Choose dates in the next 8 weeks.');
  perform pg_temp.expect(format('select * from public.get_busy_times(array[%L::uuid], %L, %L)', pg_temp.m(3), pg_temp.d(3), pg_temp.d(56)), 'Choose dates in the next 8 weeks.');
  perform pg_temp.expect(format('select * from public.get_busy_times(array[%L::uuid], %L, %L)', pg_temp.m(3), pg_temp.d(5), pg_temp.d(3)), 'Choose dates in the next 8 weeks.');
  perform pg_temp.expect(format('select * from public.get_busy_times((select array_agg(gen_random_uuid()) from generate_series(1, 101)), %L, %L)', pg_temp.d(0), pg_temp.d(3)), 'Choose up to 100 people.');
  perform pg_temp.login(4);
  perform pg_temp.expect(format('select * from public.get_busy_times(array[%L::uuid], %L, %L)', pg_temp.m(3), pg_temp.d(0), pg_temp.d(3)), 'Only venues can see when people are booked.');
  update public.members set approved = false where id = pg_temp.m(2);
  perform pg_temp.login(2);
  perform pg_temp.expect(format('select * from public.get_busy_times(array[%L::uuid], %L, %L)', pg_temp.m(3), pg_temp.d(0), pg_temp.d(3)), 'Your profile is waiting for approval.');
  update public.members set approved = true where id = pg_temp.m(2);
end $$;

-- 4. get_accept_flags ---------------------------------------------------------
do $$
declare one uuid; two uuid; post uuid; n int;
begin
  one := pg_temp.post(1, array[pg_temp.d(16)], 1, array[4]);
  two := pg_temp.post(1, array[pg_temp.d(17)], 1, array[4, 5]);
  post := pg_temp.post(1, array[pg_temp.d(18)]);
  perform pg_temp.login(4);
  assert (select array_agg(f.book_on_accept order by f.shift_id = one desc) from public.get_accept_flags(array[one, two, post]) f) = array[true, false],
    'only shifts with their answer, with the right flags';
  perform pg_temp.login(1);
  select count(*) into n from public.get_accept_flags(array[one, two, post]);
  assert n = 3, 'the venue sees its own';
  perform pg_temp.login(2);
  select count(*) into n from public.get_accept_flags(array[one, two, post]);
  assert n = 0, 'other venues see nothing';
end $$;

-- 5. admin_set_approval -------------------------------------------------------
do $$
declare req uuid; post uuid; hreq uuid; r jsonb;
begin
  perform pg_temp.login(1);
  perform pg_temp.expect(format('select public.admin_set_approval(%L, true, null)', pg_temp.m(6)), 'Only Dyuknow can do this.');
  perform pg_temp.login(7);
  perform pg_temp.expect(format('select public.admin_set_approval(%L, true, null)', gen_random_uuid()), 'That member can’t be found.');
  update public.talents set mobile_number = null where member_id = pg_temp.m(6);
  perform pg_temp.expect(format('select public.admin_set_approval(%L, true, null)', pg_temp.m(6)), 'This profile is missing: mobile number.');
  update public.talents set mobile_number = '07700900006' where member_id = pg_temp.m(6);
  r := public.admin_set_approval(pg_temp.m(6), true, 'Checked by phone');
  assert r = '{}'::jsonb;
  assert (select approved and approved_at is not null from public.members where id = pg_temp.m(6));
  assert exists (select 1 from public.admin_actions where member_id = pg_temp.m(6) and action = 'approve'
                 and admin_user_id = 'a0000000-0000-0000-0000-000000000007' and note = 'Checked by phone');
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(6) and kind = 'approved');
  -- Approving again changes nothing.
  perform public.admin_set_approval(pg_temp.m(6), true, null);
  assert (select count(*) from public.admin_actions where member_id = pg_temp.m(6)) = 1;

  -- Taking a talent's approval away ends their waiting answers.
  req := pg_temp.post(1, array[pg_temp.d(19)], 1, array[6]);
  post := pg_temp.post(1, array[pg_temp.d(20), pg_temp.d(21)]);
  perform pg_temp.yes(6, post, array[pg_temp.d(21)]);
  perform pg_temp.login(7);
  perform public.admin_set_approval(pg_temp.m(6), false, 'Paused');
  assert not (select approved from public.members where id = pg_temp.m(6));
  assert pg_temp.status(req, 6) = 'lapsed' and pg_temp.status(post, 6) = 'lapsed';
  assert (select bool_and(end_reason = 'unavailable') from public.answers where talent_id = pg_temp.m(6));
  assert (select status || '/' || closed_by from public.shifts where id = req) = 'closed/all-declined', 'nobody left on the request';
  assert (select status from public.shifts where id = post) = 'open';
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(1) and kind = 'unavailable' and shift_id = post
                 and title = 'Wade Long is no longer available' and body = 'CDP · ' || private.fmt_date(pg_temp.d(21)));
  assert (pg_temp.lines(1, 6))[cardinality(pg_temp.lines(1, 6))] = 'event:Wade Long is no longer available.';
  assert not exists (select 1 from public.notifications where member_id = pg_temp.m(6) and kind not in ('approved', 'booking-request', 'job-posted')),
    'the paused talent is not told';

  -- Taking a venue's approval away closes its open asks; booked people stay booked.
  hreq := pg_temp.post(2, array[pg_temp.d(22)], 2, array[3, 4]);
  perform pg_temp.yes(4, hreq);
  perform pg_temp.book(2, hreq, 4);
  perform pg_temp.login(7);
  perform public.admin_set_approval(pg_temp.m(2), false, null);
  assert (select status || '/' || closed_by || '/' || close_reason from public.shifts where id = hreq) = 'closed/dyuknow/No longer on Dyuknow';
  assert pg_temp.status(hreq, 3) = 'not-selected' and pg_temp.status(hreq, 4) = 'booked';
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(3) and kind = 'shift-closed'
                 and title = 'Cancelled by Harper: No longer on Dyuknow' and body = 'Harper · CDP');
  -- The paused venue can still cancel booked days, but can't post.
  perform pg_temp.login(2);
  perform pg_temp.expect($q$select pg_temp.post(2, array[pg_temp.d(23)])$q$, 'Your profile is waiting for approval.');
  assert (public.cancel_days((select id from public.bookings where shift_id = hreq), null, 'Plans changed', gen_random_uuid()))->>'booking_status' = 'cancelled';
end $$;

-- 6. Rights: only signed-in users run the public functions; nobody runs private ones
do $$
declare f text;
begin
  foreach f in array array['public.post_shift(text,text[],date[],time,time,int,int,text,uuid[],uuid)',
    'public.send_to_more(uuid,uuid[],uuid)', 'public.say_yes(uuid,date[],uuid)', 'public.decline_request(uuid,uuid)',
    'public.withdraw_yes(uuid,uuid)', 'public.close_shift(uuid,text,uuid)', 'public.book_talent(uuid,uuid,date[],uuid)',
    'public.cancel_days(uuid,date[],text,uuid)', 'public.confirm_day(uuid,date,text,time,time,uuid)',
    'public.get_booking_contact(uuid)', 'public.get_busy_times(uuid[],date,date)', 'public.get_badge_counts()',
    'public.admin_set_approval(uuid,boolean,text)', 'public.get_accept_flags(uuid[])'] loop
    assert has_function_privilege('authenticated', f, 'execute'), f || ' for authenticated';
    assert not has_function_privilege('anon', f, 'execute'), f || ' not for anon';
  end loop;
  assert not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname in ('settle_shift','book_days','send_request','sweep_once','daily_tidy',
      'post_shift_work','say_yes_work','book_talent_work','cancel_days_work','admin_set_approval_work','lock_set','buf_flush')
      and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute')));
  assert not has_function_privilege('authenticated', 'private.run_sweep()', 'execute');
end $$;
-- The same, as a real signed-in caller.
select pg_temp.login(3);
set local role authenticated;
select public.get_badge_counts() is not null as works_as_authenticated;
reset role;

-- 7. Cancelling the reminded day lets the next day get its own reminder ---------
do $$
declare s uuid; b uuid;
begin
  update public.members set approved = true where id in (pg_temp.m(2), pg_temp.m(6));
  s := pg_temp.post(1, array[pg_temp.d(30), pg_temp.d(31)]);
  perform pg_temp.yes(3, s);
  b := (pg_temp.book(1, s, 3))->>'booking_id';
  update public.bookings set reminded_at = clock_timestamp() where id = b;
  perform pg_temp.login(3);
  perform public.cancel_days(b, array[pg_temp.d(31)], 'Illness', gen_random_uuid());
  assert (select reminded_at is not null from public.bookings where id = b), 'a later day: reminder stays';
  perform public.cancel_days(b, array[pg_temp.d(30)], 'Illness', gen_random_uuid());
  assert (select status from public.bookings where id = b) = 'cancelled';
  s := pg_temp.post(1, array[pg_temp.d(32), pg_temp.d(33)]);
  perform pg_temp.yes(3, s);
  b := (pg_temp.book(1, s, 3))->>'booking_id';
  update public.bookings set reminded_at = clock_timestamp() where id = b;
  perform pg_temp.login(1);
  perform public.cancel_days(b, array[pg_temp.d(32)], 'Plans changed', gen_random_uuid());
  assert (select reminded_at is null from public.bookings where id = b), 'the reminded first day was cancelled';
end $$;

select 'booking_reads_admin: all passed' as result;
rollback;
