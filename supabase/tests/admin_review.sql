-- Tests for am_i_admin, admin_review_document and the admin lists.
-- Ends in rollback; prints 'admin_review: all passed'.
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

-- Fixtures:
--   g1 admin login (no member, created long ago)
--   g2 talent Tess, waiting, missing mobile and agreements, 2 documents in review
--   g3 venue Oak, approved and complete, asked for deletion
--   g4 bare login 10 days old (stale), g5 bare login 1 day old (fresh)
insert into auth.users (id, instance_id, aud, role, email, created_at) values
  ('91111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','adm-admin@example.com', now() - interval '30 days'),
  ('92111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','adm-tess@example.com', now()),
  ('93111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','adm-oak@example.com', now() - interval '20 days'),
  ('94111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','adm-stale@example.com', now() - interval '10 days'),
  ('95111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','adm-fresh@example.com', now() - interval '1 day');
insert into public.admins (user_id, name) values ('91111111-1111-1111-1111-111111111111', 'Test admin');
insert into public.members (id, user_id, side, approved, deletion_requested_at, created_at) values
  ('82111111-1111-1111-1111-111111111111','92111111-1111-1111-1111-111111111111','talent',false,null, now()),
  ('83111111-1111-1111-1111-111111111111','93111111-1111-1111-1111-111111111111','venue',true, now(), now() - interval '20 days');
insert into public.talents (member_id, full_name, home_postcode, positions) values
  ('82111111-1111-1111-1111-111111111111','Tess Moore','E8 1AA','{CDP}');
insert into public.venues (member_id, business_name, street_address, postcode, contact_name, contact_phone,
  agreed_pay_fairly, agreed_treat_team_like_our_own, agreed_provide_clear_brief, agreed_rate_honestly) values
  ('83111111-1111-1111-1111-111111111111','Oak','2 Elm Street','N1 1AA','Sam','020 0000 0000',true,true,true,true);
insert into public.documents (id, member_id, doc_type, storage_path, original_filename, content_type, size_bytes, uploaded_at) values
  ('71111111-1111-1111-1111-111111111111','82111111-1111-1111-1111-111111111111','food-hygiene','92111111-1111-1111-1111-111111111111/h.pdf','Hygiene.pdf','application/pdf',1000, now() - interval '2 hours'),
  ('72111111-1111-1111-1111-111111111111','82111111-1111-1111-1111-111111111111','cv','92111111-1111-1111-1111-111111111111/cv.pdf','CV.pdf','application/pdf',1000, now() - interval '1 hour');

-- Refusals for anyone who isn't an admin ------------------------------------
do $$
declare u text;
begin
  foreach u in array array['92111111-1111-1111-1111-111111111111', null] loop
    perform pg_temp.login(u);
    perform pg_temp.expect_error($q$select public.admin_review_document('71111111-1111-1111-1111-111111111111','verified',null)$q$, 'Only Dyuknow can do this.');
    perform pg_temp.expect_error($q$select public.admin_list_members('all')$q$, 'Only Dyuknow can do this.');
    perform pg_temp.expect_error($q$select public.admin_get_member('82111111-1111-1111-1111-111111111111')$q$, 'Only Dyuknow can do this.');
    perform pg_temp.expect_error($q$select public.admin_list_documents()$q$, 'Only Dyuknow can do this.');
    perform pg_temp.expect_error($q$select public.admin_list_stale_logins()$q$, 'Only Dyuknow can do this.');
    assert public.am_i_admin() = '{"is_admin":false}'::jsonb, 'not admin';
  end loop;
  perform pg_temp.login('91111111-1111-1111-1111-111111111111');
  assert public.am_i_admin() = '{"is_admin":true}'::jsonb, 'admin';
end $$;

-- admin_review_document -----------------------------------------------------
do $$
declare n record;
begin
  perform pg_temp.login('91111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error($q$select public.admin_review_document('00000000-0000-0000-0000-000000000000','verified',null)$q$, 'That document can’t be found.');
  perform pg_temp.expect_error($q$select public.admin_review_document('71111111-1111-1111-1111-111111111111','maybe',null)$q$, 'Check your answers and try again.');
  perform pg_temp.expect_error($q$select public.admin_review_document('71111111-1111-1111-1111-111111111111','rejected','  ')$q$, 'Add a reason.');

  assert public.admin_review_document('71111111-1111-1111-1111-111111111111', 'verified', 'ignored') = '{}'::jsonb, 'verify';
  assert (select status = 'verified' and reviewed_by = '91111111-1111-1111-1111-111111111111' and reviewed_at is not null and reject_reason is null
          from public.documents where id = '71111111-1111-1111-1111-111111111111'), 'document verified';
  assert (select count(*) from public.admin_actions where document_id = '71111111-1111-1111-1111-111111111111'
          and action = 'verify-document' and admin_user_id = '91111111-1111-1111-1111-111111111111'
          and member_id = '82111111-1111-1111-1111-111111111111') = 1, 'logged';
  select * into n from public.notifications where member_id = '82111111-1111-1111-1111-111111111111' and kind = 'document-verified';
  assert n.title = 'Food hygiene certificate verified' and n.body = 'It now shows on your profile.' and n.target = 'account', 'verified notice';

  -- Same verdict again: nothing to do.
  perform public.admin_review_document('71111111-1111-1111-1111-111111111111', 'verified', null);
  assert (select count(*) from public.admin_actions where document_id = '71111111-1111-1111-1111-111111111111') = 1, 'no second log';
  assert (select count(*) from public.notifications where member_id = '82111111-1111-1111-1111-111111111111') = 1, 'no second notice';

  perform public.admin_review_document('71111111-1111-1111-1111-111111111111', 'rejected', ' Too blurry. ');
  assert (select status = 'rejected' and reject_reason = 'Too blurry.' from public.documents where id = '71111111-1111-1111-1111-111111111111'), 'rejected';
  select * into n from public.notifications where member_id = '82111111-1111-1111-1111-111111111111' and kind = 'document-rejected';
  assert n.title = 'Food hygiene certificate not accepted' and n.body = 'Too blurry. Upload a new one.' and n.target = 'account', 'rejected notice';
  assert (select note from public.admin_actions where document_id = '71111111-1111-1111-1111-111111111111' and action = 'reject-document') = 'Too blurry.', 'reason logged';
  perform public.admin_review_document('71111111-1111-1111-1111-111111111111', 'rejected', 'Too blurry.');
  assert (select count(*) from public.notifications where member_id = '82111111-1111-1111-1111-111111111111') = 2, 'same rejection twice: one notice';

  perform public.admin_review_document('72111111-1111-1111-1111-111111111111', 'verified', null);
  assert (select body from public.notifications where member_id = '82111111-1111-1111-1111-111111111111' and kind = 'document-verified'
          and title = 'CV verified') = 'Dyuknow has checked it.', 'CV wording';
end $$;

-- admin lists ---------------------------------------------------------------
do $$
declare r jsonb; e jsonb;
begin
  perform pg_temp.login('91111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error($q$select public.admin_list_members('everyone')$q$, 'Check your answers and try again.');
  perform pg_temp.expect_error($q$select public.admin_list_documents('lost')$q$, 'Check your answers and try again.');
  perform pg_temp.expect_error($q$select public.admin_list_stale_logins(-1)$q$, 'Check your answers and try again.');
  perform pg_temp.expect_error($q$select public.admin_get_member('00000000-0000-0000-0000-000000000000')$q$, 'That member can’t be found.');

  r := public.admin_list_members('waiting');
  select x into e from jsonb_array_elements(r) x where x->>'member_id' = '82111111-1111-1111-1111-111111111111';
  assert e->>'email' = 'adm-tess@example.com' and e->>'name' = 'Tess Moore' and e->>'side' = 'talent', 'waiting talent listed';
  assert e->'missing' = '["mobile number", "the four agreements"]'::jsonb, 'missing fields listed';
  assert not (e ? 'sort_key'), 'no internal keys';
  assert not exists (select 1 from jsonb_array_elements(r) x where x->>'member_id' = '83111111-1111-1111-1111-111111111111'), 'approved not in waiting';
  assert jsonb_array_length(r) <= 200, 'at most 200';

  r := public.admin_list_members('approved');
  select x into e from jsonb_array_elements(r) x where x->>'member_id' = '83111111-1111-1111-1111-111111111111';
  assert e->>'name' = 'Oak' and e->'missing' = '[]'::jsonb, 'approved venue complete';
  r := public.admin_list_members('deletion-requested');
  assert exists (select 1 from jsonb_array_elements(r) x where x->>'member_id' = '83111111-1111-1111-1111-111111111111')
     and not exists (select 1 from jsonb_array_elements(r) x where x->>'member_id' = '82111111-1111-1111-1111-111111111111'), 'deletion requested';
  r := public.admin_list_members(null);
  assert (select count(*) from jsonb_array_elements(r) x where x->>'member_id' in ('82111111-1111-1111-1111-111111111111','83111111-1111-1111-1111-111111111111')) = 2, 'all';

  r := public.admin_get_member('82111111-1111-1111-1111-111111111111');
  assert r->>'email' = 'adm-tess@example.com' and r->'profile'->>'full_name' = 'Tess Moore' and r->'member'->>'side' = 'talent', 'member detail';
  assert jsonb_array_length(r->'documents') = 2 and r->'documents'->0->>'label' = 'Food hygiene certificate', 'documents with labels';
  assert r->'missing' = '["mobile number", "the four agreements"]'::jsonb, 'missing in detail';

  -- Documents: the rejected one is out of review; the replacement goes back in.
  update public.documents set status = 'review', reviewed_at = null, reviewed_by = null, reject_reason = null
   where id = '72111111-1111-1111-1111-111111111111';
  r := public.admin_list_documents();
  assert exists (select 1 from jsonb_array_elements(r) x where x->>'document_id' = '72111111-1111-1111-1111-111111111111'
                 and x->>'label' = 'CV' and x->>'member_name' = 'Tess Moore' and x->>'storage_path' is not null), 'review list';
  assert not exists (select 1 from jsonb_array_elements(r) x where x->>'document_id' = '71111111-1111-1111-1111-111111111111'), 'rejected not in review';
  assert (select bool_and(a.v <= b.v) from
           (select (x->>'uploaded_at')::timestamptz v, o from jsonb_array_elements(r) with ordinality t(x, o)) a
           join (select (x->>'uploaded_at')::timestamptz v, o from jsonb_array_elements(r) with ordinality t(x, o)) b on b.o = a.o + 1)
         is not false, 'oldest first';
  r := public.admin_list_documents('rejected');
  assert exists (select 1 from jsonb_array_elements(r) x where x->>'document_id' = '71111111-1111-1111-1111-111111111111' and x->>'reject_reason' = 'Too blurry.'), 'rejected list';

  r := public.admin_list_stale_logins(7);
  assert exists (select 1 from jsonb_array_elements(r) x where x->>'email' = 'adm-stale@example.com'), 'stale login listed';
  assert not exists (select 1 from jsonb_array_elements(r) x where x->>'email' in
           ('adm-fresh@example.com','adm-admin@example.com','adm-oak@example.com','adm-tess@example.com')), 'others left out';
  r := public.admin_list_stale_logins(null);
  assert exists (select 1 from jsonb_array_elements(r) x where x->>'email' = 'adm-stale@example.com'), 'default 7 days';
  r := public.admin_list_stale_logins(0);
  assert exists (select 1 from jsonb_array_elements(r) x where x->>'email' = 'adm-fresh@example.com'), '0 days lists fresh';
end $$;

do $$ begin
  assert not has_function_privilege('anon', 'public.admin_list_members(text)', 'execute'), 'anon closed';
  assert has_function_privilege('authenticated', 'public.am_i_admin()', 'execute'), 'authenticated open';
  assert not has_function_privilege('authenticated', 'private.profile_missing_fields(uuid)', 'execute'), 'helper closed';
  assert (select count(*) from public.talent_profiles) = 10 and (select count(*) from public.venue_profiles) = 8, 'archive counts changed';
end $$;

select 'admin_review: all passed' as result;
rollback;
