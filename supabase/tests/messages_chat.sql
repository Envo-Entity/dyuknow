-- Tests for open_conversation, send_message, mark_conversation_read and
-- mark_notifications_read. Ends in rollback; prints 'messages_chat: all passed'.
begin;

create function pg_temp.login(p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then '' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid, ''), true);
end $$;
create function pg_temp.expect_error(q text, msg text) returns void language plpgsql as $$
declare got text;
begin
  begin execute q; got := null; exception when others then got := sqlerrm; end;
  if got is distinct from msg then
    raise exception 'FAIL: % -- expected "%", got "%"', q, msg, coalesce(got, 'success');
  end if;
end $$;

-- Fixtures. Logins d1..d6; members e1..e6:
--   e1 venue Spruce (approved), e2 talent Poppy (approved), e3 talent Tom (waiting),
--   e4 venue Fig (approved), e5 talent Ava (approved, outsider), e6 talent Max (approved)
insert into auth.users (id, instance_id, aud, role, email)
select ('d' || n || '111111-1111-1111-1111-111111111111')::uuid, '00000000-0000-0000-0000-000000000000',
       'authenticated', 'authenticated', 'msg' || n || '@example.com'
from generate_series(1, 6) n;
insert into public.members (id, user_id, side, approved) values
  ('e1111111-1111-1111-1111-111111111111','d1111111-1111-1111-1111-111111111111','venue',true),
  ('e2111111-1111-1111-1111-111111111111','d2111111-1111-1111-1111-111111111111','talent',true),
  ('e3111111-1111-1111-1111-111111111111','d3111111-1111-1111-1111-111111111111','talent',false),
  ('e4111111-1111-1111-1111-111111111111','d4111111-1111-1111-1111-111111111111','venue',true),
  ('e5111111-1111-1111-1111-111111111111','d5111111-1111-1111-1111-111111111111','talent',true),
  ('e6111111-1111-1111-1111-111111111111','d6111111-1111-1111-1111-111111111111','talent',true);
insert into public.venues (member_id, trading_name) values
  ('e1111111-1111-1111-1111-111111111111','Spruce'), ('e4111111-1111-1111-1111-111111111111','Fig');
insert into public.talents (member_id, full_name) values
  ('e2111111-1111-1111-1111-111111111111','Poppy Bertram'), ('e3111111-1111-1111-1111-111111111111','Tom Reed'),
  ('e5111111-1111-1111-1111-111111111111','Ava Stone'), ('e6111111-1111-1111-1111-111111111111','Max Hill');
-- A conversation with the waiting talent, as if from an earlier booking.
insert into public.conversations (id, venue_id, talent_id) values
  ('f3111111-1111-1111-1111-111111111111','e1111111-1111-1111-1111-111111111111','e3111111-1111-1111-1111-111111111111');
create temp table ids (name text primary key, id uuid);
grant all on ids to public;

-- open_conversation ---------------------------------------------------------
do $$
declare r jsonb; r2 jsonb;
begin
  perform pg_temp.login('d3111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error($q$select public.open_conversation('e1111111-1111-1111-1111-111111111111')$q$, 'Your profile is waiting for approval.');
  perform pg_temp.login('d9111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error($q$select public.open_conversation('e1111111-1111-1111-1111-111111111111')$q$, 'Create your profile first.');

  perform pg_temp.login('d1111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error($q$select public.open_conversation('e4111111-1111-1111-1111-111111111111')$q$, 'Venues and talent can message each other.');
  perform pg_temp.expect_error($q$select public.open_conversation('e3111111-1111-1111-1111-111111111111')$q$, 'Venues and talent can message each other.');
  perform pg_temp.expect_error($q$select public.open_conversation('00000000-0000-0000-0000-000000000000')$q$, 'Venues and talent can message each other.');
  perform pg_temp.expect_error($q$select public.open_conversation(null)$q$, 'Venues and talent can message each other.');

  r := public.open_conversation('e2111111-1111-1111-1111-111111111111');
  perform pg_temp.login('d2111111-1111-1111-1111-111111111111');
  r2 := public.open_conversation('e1111111-1111-1111-1111-111111111111');
  assert r->>'conversation_id' is not null and r = r2, 'both sides find one conversation';
  assert (select count(*) from public.messages where conversation_id = (r->>'conversation_id')::uuid) = 0, 'opening writes no message';
  insert into ids values ('c12', (r->>'conversation_id')::uuid);
end $$;

-- send_message --------------------------------------------------------------
do $$
declare c uuid := (select id from ids where name = 'c12'); r jsonb; r2 jsonb; r3 jsonb; ref uuid := gen_random_uuid();
begin
  perform pg_temp.login('d5111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error(format('select public.send_message(%L, %L, %L)', c, 'hi', gen_random_uuid()), 'This conversation is private.');
  perform pg_temp.expect_error(format('select public.send_message(%L, %L, %L)', gen_random_uuid(), 'hi', gen_random_uuid()), 'This conversation is private.');

  perform pg_temp.login('d3111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error(format('select public.send_message(%L, %L, %L)', 'f3111111-1111-1111-1111-111111111111', 'hi', gen_random_uuid()), 'Your profile is waiting for approval.');

  perform pg_temp.login('d1111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error(format('select public.send_message(%L, %L, %L)', 'f3111111-1111-1111-1111-111111111111', 'hi', gen_random_uuid()), 'Tom Reed can’t get messages right now.');
  perform pg_temp.expect_error(format('select public.send_message(%L, %L, %L)', c, '   ', gen_random_uuid()), 'Write a message first.');
  perform pg_temp.expect_error(format('select public.send_message(%L, null, %L)', c, gen_random_uuid()), 'Write a message first.');
  perform pg_temp.expect_error(format('select public.send_message(%L, %L, %L)', c, repeat('a', 2001), gen_random_uuid()), 'Keep messages under 2,000 characters.');
  perform pg_temp.expect_error(format('select public.send_message(%L, %L, null)', c, 'hi'), 'Couldn’t save. Try again.');

  r := public.send_message(c, '  See you at five  ', ref);
  assert (r->>'seq')::int = 1 and r->>'message_id' is not null, 'first message';
  assert (select body = 'See you at five' and kind = 'text' and sender_id = 'e1111111-1111-1111-1111-111111111111'
          from public.messages where id = (r->>'message_id')::bigint), 'message saved trimmed';
  assert (select last_seq = 1 and last_message_at is not null from public.conversations where id = c), 'conversation moved';
  assert (select last_read_seq from public.conversation_reads where conversation_id = c and member_id = 'e1111111-1111-1111-1111-111111111111') = 1, 'sender marker moved';

  r2 := public.send_message(c, 'See you at five', ref);
  assert r2 = r, 'repeat tap returns the first result';
  assert (select count(*) from public.messages where conversation_id = c) = 1, 'repeat tap sends nothing';
  -- A receipt for another function is refused.
  insert into public.call_receipts (member_id, client_ref, function_name, result)
  values ('e1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'say_yes', '{}');
  perform pg_temp.expect_error(format('select public.send_message(%L, %L, %L)', c, 'x', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'Couldn’t save. Try again.');

  perform pg_temp.login('d2111111-1111-1111-1111-111111111111');
  r3 := public.send_message(c, repeat('b', 2000), gen_random_uuid());
  assert (r3->>'seq')::int = 2, 'second message from talent';
  assert (select last_read_seq from public.conversation_reads where conversation_id = c and member_id = 'e2111111-1111-1111-1111-111111111111') = 2, 'talent marker moved';

  -- The other person paused or deleted: refused with their name.
  update public.members set deleted_at = now() where id = 'e1111111-1111-1111-1111-111111111111';
  perform pg_temp.expect_error(format('select public.send_message(%L, %L, %L)', c, 'hi', gen_random_uuid()), 'Spruce can’t get messages right now.');
  perform pg_temp.login('d1111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error(format('select public.send_message(%L, %L, %L)', c, 'hi', gen_random_uuid()), 'Sign in to continue.');
  update public.members set deleted_at = null where id = 'e1111111-1111-1111-1111-111111111111';

  assert (select count(*) from public.notifications
          where member_id in ('e1111111-1111-1111-1111-111111111111','e2111111-1111-1111-1111-111111111111')) = 0, 'chat makes no notices';
end $$;

-- mark_conversation_read ----------------------------------------------------
do $$
declare c uuid := (select id from ids where name = 'c12');
begin
  perform pg_temp.login('d5111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error(format('select public.mark_conversation_read(%L, 1)', c), 'This conversation is private.');
  perform pg_temp.expect_error(format('select public.mark_conversation_read(%L, 1)', gen_random_uuid()), 'This conversation is private.');

  perform pg_temp.login('d1111111-1111-1111-1111-111111111111');
  assert public.mark_conversation_read(c, 99) = '{}'::jsonb, 'mark read';
  assert (select last_read_seq from public.conversation_reads where conversation_id = c and member_id = 'e1111111-1111-1111-1111-111111111111') = 2, 'clamped to last_seq';
  perform public.mark_conversation_read(c, 0);
  assert (select last_read_seq from public.conversation_reads where conversation_id = c and member_id = 'e1111111-1111-1111-1111-111111111111') = 2, 'never moves back';

  -- Approval isn't needed: the waiting talent can mark their own conversation.
  perform pg_temp.login('d3111111-1111-1111-1111-111111111111');
  perform public.mark_conversation_read('f3111111-1111-1111-1111-111111111111', null);
  assert (select last_read_seq from public.conversation_reads where conversation_id = 'f3111111-1111-1111-1111-111111111111') = 0, 'empty conversation marker 0';
end $$;

-- mark_notifications_read ---------------------------------------------------
do $$
declare n1 bigint; r jsonb;
begin
  insert into public.notifications (member_id, kind, title, target) values
    ('e2111111-1111-1111-1111-111111111111','approved','You''re approved','availability'),
    ('e2111111-1111-1111-1111-111111111111','booked','A','booking/1'),
    ('e2111111-1111-1111-1111-111111111111','days-added','B','booking/1'),
    ('e2111111-1111-1111-1111-111111111111','reminder','C','booking/2'),
    ('e6111111-1111-1111-1111-111111111111','approved','You''re approved','availability');
  select id into n1 from public.notifications where member_id = 'e2111111-1111-1111-1111-111111111111' and kind = 'approved';

  perform pg_temp.login('d2111111-1111-1111-1111-111111111111');
  r := public.mark_notifications_read(array[n1, (select id from public.notifications where member_id = 'e6111111-1111-1111-1111-111111111111')], null);
  assert r = '{"marked":1}'::jsonb, 'only own ids marked';
  assert (select read_at is null from public.notifications where member_id = 'e6111111-1111-1111-1111-111111111111'), 'other member untouched';
  r := public.mark_notifications_read(array[n1], null);
  assert r = '{"marked":0}'::jsonb, 'already read';
  r := public.mark_notifications_read(null, 'booking/1');
  assert r = '{"marked":2}'::jsonb, 'by target';
  r := public.mark_notifications_read(null, null);
  assert r = '{"marked":1}'::jsonb, 'all the rest';
  assert (select count(*) from public.notifications where member_id = 'e2111111-1111-1111-1111-111111111111' and read_at is null) = 0, 'all read';

  perform pg_temp.login('d9111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error('select public.mark_notifications_read(null, null)', 'Create your profile first.');
end $$;

do $$ begin
  assert not has_function_privilege('anon', 'public.send_message(uuid, text, uuid)', 'execute'), 'anon closed';
  assert has_function_privilege('authenticated', 'public.send_message(uuid, text, uuid)', 'execute'), 'authenticated open';
  assert has_function_privilege('authenticated', 'public.mark_notifications_read(bigint[], text)', 'execute'), 'authenticated open';
  assert (select count(*) from public.talent_profiles) = 10 and (select count(*) from public.venue_profiles) = 8, 'archive counts changed';
end $$;

select 'messages_chat: all passed' as result;
rollback;
