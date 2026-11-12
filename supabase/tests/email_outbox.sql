-- Email outbox: which actions queue which email, with what data; the welcome
-- trigger; the complete-account selector; claim and mark. Runs in a
-- transaction that rolls back, like the other files here.
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
-- The newest queued email of a kind for member n (notice ids only grow).
create function pg_temp.email(n int, k text) returns jsonb language sql as $$
  select data || jsonb_build_object('_notice', notification_id, '_status', status)
  from public.email_outbox where member_id = pg_temp.m(n) and kind = k order by notification_id desc nulls last limit 1 $$;
create function pg_temp.emails(n int, k text) returns int language sql as $$
  select count(*)::int from public.email_outbox where member_id = pg_temp.m(n) and kind = k $$;

-- 0. Welcome: one per member, with the name ---------------------------------
-- The trigger waits for commit; this makes it run now.
set constraints public.members_queue_welcome immediate;
do $$
begin
  assert pg_temp.email(1, 'welcome-venue') @> jsonb_build_object('name', 'Spruce', 'side', 'venue',
    'member_id', pg_temp.m(1), 'target', 'home'), 'venue welcome: ' || coalesce(pg_temp.email(1, 'welcome-venue')::text, 'none');
  assert pg_temp.email(3, 'welcome-talent') @> jsonb_build_object('name', 'Poppy', 'side', 'talent',
    'member_id', pg_temp.m(3), 'target', 'availability');
  assert (select count(*) from public.email_outbox where member_id in (select pg_temp.m(x) from generate_series(1, 6) x)) = 6,
    'one welcome each for the six members';
  assert (select count(*) from public.email_outbox where member_id = pg_temp.m(1) and kind = 'welcome-talent') = 0;
  perform pg_temp.expect(format($q$insert into public.email_outbox (member_id, kind) values (%L, 'welcome-venue')$q$, pg_temp.m(1)),
    'duplicate key value violates unique constraint "email_outbox_one_welcome"');
end $$;
set constraints public.members_queue_welcome deferred;

-- 1. booking-request, to the talent, for every day of a multi-day ask --------
do $$
declare s uuid; e jsonb;
begin
  s := pg_temp.post(1, array[pg_temp.d(10), pg_temp.d(11), pg_temp.d(13)], 1, array[3]);
  e := pg_temp.email(3, 'booking-request');
  assert e @> jsonb_build_object('venue', 'Spruce', 'positions', 'CDP', 'hours', '17:00–23:00', 'rate', '£18/h',
    'dates', private.days_label(private.all_days(s)), 'side', 'talent', 'member_id', pg_temp.m(3),
    'target', 'shift/' || s, 'shift_id', s), 'booking-request: ' || e::text;
  assert (e->>'dates') like '%' || extract(day from pg_temp.d(13))::text || '%', 'all three days in the label';
  assert (e->>'_notice')::bigint = (select id from public.notifications where member_id = pg_temp.m(3) and shift_id = s and kind = 'booking-request');
  assert e->>'_status' = 'pending';
end $$;

-- 2. Job post: in-app job-posted only. Then said-yes (part), booked, days-added
do $$
declare s uuid; e jsonb; r jsonb;
begin
  s := pg_temp.post(1, array[pg_temp.d(20), pg_temp.d(21)], 1);
  assert exists (select 1 from public.notifications where shift_id = s and kind = 'job-posted'), 'the post made job-posted notices';
  assert not exists (select 1 from public.email_outbox o join public.notifications n on n.id = o.notification_id where n.shift_id = s),
    'job-posted sends no email';

  -- Theo can do the first day only.
  perform pg_temp.yes(4, s, array[pg_temp.d(20)]);
  e := pg_temp.email(1, 'said-yes');
  assert e @> jsonb_build_object('talent', 'Theo Lane', 'positions', 'CDP', 'hours', '17:00–23:00',
    'dates', private.fmt_date(pg_temp.d(20)), 'partial', '1 of 2 days', 'side', 'venue', 'target', 'shift/' || s), 'said-yes part: ' || e::text;

  -- Poppy can do both: no partial.
  perform pg_temp.yes(3, s);
  e := pg_temp.email(1, 'said-yes');
  assert e->>'talent' = 'Poppy Bertram' and e->>'dates' = private.days_label(private.all_days(s))
     and e->'partial' = 'null'::jsonb, 'said-yes full: ' || e::text;

  -- The venue books Poppy for day one: booked, with that day.
  r := pg_temp.book(1, s, 3, array[pg_temp.d(20)]);
  e := pg_temp.email(3, 'booked');
  assert e @> jsonb_build_object('venue', 'Spruce', 'dates', private.fmt_date(pg_temp.d(20)), 'hours', '17:00–23:00',
    'rate', '£18/h', 'target', 'booking/' || (r->>'booking_id')), 'booked: ' || e::text;

  -- Then day two: days-added, in-app only.
  perform pg_temp.book(1, s, 3, array[pg_temp.d(21)]);
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(3) and shift_id = s and kind = 'days-added');
  assert pg_temp.emails(3, 'booked') = 1, 'no second booked email';
  assert not exists (select 1 from public.email_outbox o join public.notifications n on n.id = o.notification_id
                     where n.kind = 'days-added'), 'days-added sends no email';
end $$;

-- 3. accepted (to the venue; the talent who accepted gets nothing) -----------
do $$
declare s uuid; e jsonb; r jsonb; before int;
begin
  before := pg_temp.emails(3, 'booked');
  s := pg_temp.post(1, array[pg_temp.d(30), pg_temp.d(31)], 1, array[3]);
  r := pg_temp.yes(3, s);
  assert r->>'result' = 'booked', 'accept: ' || r::text;
  e := pg_temp.email(1, 'accepted');
  assert e @> jsonb_build_object('talent', 'Poppy Bertram', 'dates', private.days_label(private.all_days(s)),
    'hours', '17:00–23:00', 'positions', 'CDP', 'target', 'booking/' || (r->>'booking_id')), 'accepted: ' || e::text;
  assert pg_temp.emails(3, 'booked') = before, 'Accept sends the talent no booked email';

  -- 4. days-cancelled. The talent cancels one day: to the venue, reason without the full stop.
  perform pg_temp.login(3);
  perform public.cancel_days((r->>'booking_id')::uuid, array[pg_temp.d(31)], 'Unwell.', gen_random_uuid());
  e := pg_temp.email(1, 'days-cancelled-venue');
  assert e @> jsonb_build_object('talent', 'Poppy Bertram', 'cancelled', private.fmt_date(pg_temp.d(31)),
    'reason', 'Unwell', 'positions', 'CDP', 'shift_id', s), 'days-cancelled-venue: ' || e::text;
  assert pg_temp.emails(3, 'days-cancelled-talent') = 0, 'the one who cancels gets nothing';

  -- The venue cancels the rest: to the talent, only the day this cancellation took.
  perform pg_temp.login(1);
  perform public.cancel_days((r->>'booking_id')::uuid, null, 'Private event cancelled', gen_random_uuid());
  e := pg_temp.email(3, 'days-cancelled-talent');
  assert e @> jsonb_build_object('venue', 'Spruce', 'cancelled', private.fmt_date(pg_temp.d(30)),
    'reason', 'Private event cancelled', 'target', 'booking/' || (r->>'booking_id')), 'days-cancelled-talent: ' || e::text;
end $$;

-- 5. declined (to the venue) -------------------------------------------------
do $$
declare s uuid; e jsonb;
begin
  s := pg_temp.post(1, array[pg_temp.d(40)], 1, array[4, 5]);
  perform pg_temp.login(4);
  perform public.decline_request(s, gen_random_uuid());
  e := pg_temp.email(1, 'declined');
  assert e @> jsonb_build_object('talent', 'Theo Lane', 'dates', private.fmt_date(pg_temp.d(40)), 'hours', '17:00–23:00',
    'target', 'shift/' || s), 'declined: ' || e::text;

  -- 6. shift-closed: Ines was still asked; the reason without the full stop.
  perform pg_temp.login(1);
  perform public.close_shift(s, 'Cover found elsewhere.', gen_random_uuid());
  e := pg_temp.email(5, 'shift-closed');
  assert e @> jsonb_build_object('venue', 'Spruce', 'reason', 'Cover found elsewhere', 'dates', private.fmt_date(pg_temp.d(40)),
    'target', 'shift/' || s), 'shift-closed: ' || e::text;
  assert pg_temp.emails(4, 'shift-closed') = 0, 'Theo had declined: nothing';
end $$;

-- 7. The sweep: reminder (talent) and shift-unfilled (venue) -----------------
do $$
declare s uuid; b uuid; s2 uuid; d date;
begin
  s := pg_temp.past_shift(2, array[3]);
  b := pg_temp.past_answer(s, 5, 'booked', true);
  select day_date into d from public.shift_days where shift_id = s;
  s2 := pg_temp.past_shift(2, array[-1], 1, 'request');
  perform pg_temp.past_answer(s2, 4, 'invited');
  perform private.sweep_once();
  assert pg_temp.email(5, 'reminder') @> jsonb_build_object('venue', 'Harper', 'positions', 'CDP',
    'day', private.service_label(d, '17:00', '23:00'), 'target', 'booking/' || b), 'reminder: ' || pg_temp.email(5, 'reminder')::text;
  assert pg_temp.email(2, 'shift-unfilled') @> jsonb_build_object('positions', 'CDP',
    'dates', private.days_label(private.all_days(s2)), 'target', 'shift/' || s2), 'shift-unfilled';
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(4) and shift_id = s2 and kind = 'shift-started');
  assert pg_temp.emails(4, 'shift-started') = 0, 'shift-started is in-app only';
end $$;

-- 8. Only the chosen kinds email; approval stays in-app ----------------------
do $$
begin
  update public.members set approved = true where id = pg_temp.m(6);
  assert exists (select 1 from public.notifications where member_id = pg_temp.m(6) and kind = 'approved');
  assert not exists (select 1 from public.email_outbox o join public.notifications n on n.id = o.notification_id
                     where n.member_id in (select pg_temp.m(x) from generate_series(1, 6) x)
                       and n.kind not in ('booking-request', 'booked', 'days-cancelled', 'shift-closed', 'reminder',
                                          'said-yes', 'accepted', 'declined', 'shift-unfilled')),
    'an in-app-only notice queued an email';
  -- Each emailed notice maps to its email kind, days-cancelled by side.
  assert not exists (select 1 from public.email_outbox o join public.notifications n on n.id = o.notification_id
                     join public.members m on m.id = n.member_id
                     where o.kind <> case when n.kind = 'days-cancelled' then 'days-cancelled-' || m.side else n.kind end);
  -- And every notice of those kinds has its email.
  assert not exists (select 1 from public.notifications n
                     where n.member_id in (select pg_temp.m(x) from generate_series(1, 6) x)
                       and n.kind in ('booking-request', 'booked', 'days-cancelled', 'shift-closed', 'reminder',
                                      'said-yes', 'accepted', 'declined', 'shift-unfilled')
                       and not exists (select 1 from public.email_outbox o where o.notification_id = n.id)),
    'a notice that should email has no email';
end $$;

-- 9. complete-account: confirmed logins over a day old with no member --------
do $$
begin
  insert into auth.users (id, instance_id, aud, role, email, created_at, email_confirmed_at) values
    ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'due@dyuknow-test.invalid', now() - interval '2 days', now() - interval '2 days'),
    ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'new@dyuknow-test.invalid', now() - interval '1 hour', now() - interval '1 hour'),
    ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fake@example.com', now() - interval '2 days', now() - interval '2 days'),
    ('c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'unconfirmed@dyuknow-test.invalid', now() - interval '2 days', null);
  -- 03 has a member; 07 is an admin with no member.
  update auth.users set created_at = now() - interval '2 days', email_confirmed_at = now() - interval '2 days'
   where id in ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000007');
  assert 'c0000000-0000-0000-0000-000000000001'::uuid in (select private.complete_account_due());
  assert not exists (select 1 from private.complete_account_due() d
                     where d in ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003',
                                 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003',
                                 'a0000000-0000-0000-0000-000000000007')), 'only the confirmed, day-old login with no member';
  assert private.queue_complete_account() >= 1;
  assert (select count(*) from public.email_outbox where user_id = 'c0000000-0000-0000-0000-000000000001'
          and kind = 'complete-account' and member_id is null) = 1;
  perform private.queue_complete_account();
  assert (select count(*) from public.email_outbox where user_id = 'c0000000-0000-0000-0000-000000000001') = 1, 'sent once';
  assert not ('c0000000-0000-0000-0000-000000000001'::uuid in (select private.complete_account_due()));
end $$;

-- 10. Claim and mark: service role only; retries back off, then fail ---------
do $$
declare o uuid; r record; t timestamptz;
begin
  -- Members can't read the outbox or call the send functions.
  assert not exists (select 1 from unnest(array['anon', 'authenticated']) rl
                     where has_table_privilege(rl, 'public.email_outbox', 'select,insert,update,delete')
                        or has_function_privilege(rl, 'public.email_claim(int)', 'execute')
                        or has_function_privilege(rl, 'public.email_mark(uuid, text, text, text)', 'execute')
                        or has_function_privilege(rl, 'public.email_config()', 'execute')
                        or has_function_privilege(rl, 'public.email_set_config(text, text)', 'execute')
                        or has_function_privilege(rl, 'private.email_data(text, uuid, text, text, text, uuid, uuid, uuid)', 'execute')
                        or has_function_privilege(rl, 'private.queue_complete_account()', 'execute')
                        or has_function_privilege(rl, 'private.kick_send_emails()', 'execute'));
  assert has_function_privilege('service_role', 'public.email_claim(int)', 'execute')
     and has_function_privilege('service_role', 'public.email_mark(uuid, text, text, text)', 'execute')
     and has_function_privilege('service_role', 'public.email_config()', 'execute');
  assert (select relrowsecurity from pg_class where oid = 'public.email_outbox'::regclass);

  -- Everything else waits, so the claim takes this one row.
  update public.email_outbox set next_try_at = now() + interval '1 day' where status = 'pending';
  insert into public.email_outbox (member_id, kind, data) values (pg_temp.m(3), 'booked', '{}') returning id into o;
  select * into r from public.email_claim(5);
  assert r.id = o and r.to_email = 'booking3@example.com' and r.attempts = 1 and r.skip_reason is null, 'claim: ' || r::text;
  assert (select status from public.email_outbox where id = o) = 'sending';
  assert not exists (select 1 from public.email_claim(5)), 'a row being sent is not claimed twice';

  t := now();
  perform public.email_mark(o, 'retry', null, 'Resend 500: boom');
  assert (select status = 'pending' and next_try_at = t + interval '1 minute' and error = 'Resend 500: boom'
          from public.email_outbox where id = o), 'first retry waits a minute';
  update public.email_outbox set status = 'sending', attempts = 5 where id = o;
  perform public.email_mark(o, 'retry', null, 'Resend 500: boom');
  assert (select status from public.email_outbox where id = o) = 'failed', 'five tries, then failed';

  update public.email_outbox set status = 'sending' where id = o;
  perform public.email_mark(o, 'sent', 're_123');
  assert (select status = 'sent' and resend_id = 're_123' and sent_at is not null and error is null
          from public.email_outbox where id = o);
  perform public.email_mark(o, 'failed', null, 'late');
  assert (select status from public.email_outbox where id = o) = 'sent', 'a finished row is never changed';

  -- A deleted member's email is skipped.
  update public.members set deleted_at = now() where id = pg_temp.m(4);
  insert into public.email_outbox (member_id, kind, data) values (pg_temp.m(4), 'booked', '{}') returning id into o;
  select * into r from public.email_claim(5);
  assert r.id = o and r.skip_reason = 'member deleted', 'deleted: ' || r::text;
end $$;

-- 11. The cron jobs are scheduled ---------------------------------------------
do $$
begin
  assert exists (select 1 from cron.job where jobname = 'dyuknow-send-emails' and schedule = '* * * * *'
                 and command = 'select private.kick_send_emails()');
  assert exists (select 1 from cron.job where jobname = 'dyuknow-complete-account' and schedule = '17 * * * *'
                 and command = 'select private.queue_complete_account()');
  assert exists (select 1 from vault.secrets where name = 'send_emails_secret');
end $$;

select 'email_outbox: all passed' as result;
rollback;
