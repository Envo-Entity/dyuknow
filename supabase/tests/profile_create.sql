-- Tests for create_my_profile. Run the whole file with execute_sql; it ends in
-- rollback and leaves nothing behind. Prints 'profile_create: all passed'.
begin;

-- Helpers -------------------------------------------------------------------
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
create function pg_temp.call(q text) returns jsonb language plpgsql as $$
declare r jsonb; begin execute q into r; return r; end $$;
create function pg_temp.today() returns date language sql as $$ select (now() at time zone 'Europe/London')::date $$;

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email) values
  ('a1111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pc-talent@example.com'),
  ('a2222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pc-venue@example.com'),
  ('a3333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pc-foh@example.com');
insert into storage.objects (bucket_id, name, owner, metadata) values
  ('member-documents','a1111111-1111-1111-1111-111111111111/rtw.pdf','a1111111-1111-1111-1111-111111111111','{"size":2048,"mimetype":"application/pdf"}'),
  ('member-documents','a1111111-1111-1111-1111-111111111111/hygiene.png','a1111111-1111-1111-1111-111111111111','{"size":4096,"mimetype":"image/png"}'),
  ('member-documents','a1111111-1111-1111-1111-111111111111/anim.gif','a1111111-1111-1111-1111-111111111111','{"size":4096,"mimetype":"image/gif"}'),
  ('member-documents','a1111111-1111-1111-1111-111111111111/huge.pdf','a1111111-1111-1111-1111-111111111111','{"size":20000000,"mimetype":"application/pdf"}'),
  ('member-documents','a2222222-2222-2222-2222-222222222222/licence.pdf','a2222222-2222-2222-2222-222222222222','{"size":1000,"mimetype":"application/pdf"}'),
  ('member-documents','a3333333-3333-3333-3333-333333333333/hygiene.pdf','a3333333-3333-3333-3333-333333333333','{"size":1000,"mimetype":"application/pdf"}');

create temp table base as select jsonb_build_object(
  'full_name', '  Poppy Bertram ', 'home_postcode', 'TW9 1UA', 'mobile_number', '07700 900123',
  'positions', jsonb_build_array('CDP','Sous Chef'), 'skills', jsonb_build_array('Grill'),
  'bio', 'Calm on the pass.', 'minimum_same_day_rate_gbp', '18.50', 'date_of_birth', '1995-04-02',
  'employment_history', '[{"restaurant":"Spruce","position":"CDP","dates":"2022–2024"}]'::jsonb,
  'agreed_turn_up_on_time', true, 'agreed_treat_venues_with_respect', true,
  'agreed_give_notice_if_cancelling', true, 'agreed_represent_professionally', true) as tj,
  jsonb_build_object(
  'business_name', 'Spruce Ltd', 'trading_name', 'Spruce', 'street_address', '1 Kew Road', 'postcode', 'TW9 2AA',
  'contact_name', 'Ana', 'contact_phone', '020 7946 0000', 'venue_types', jsonb_build_array('Restaurant'),
  'cuisines', jsonb_build_array('British'), 'average_team_size', '12', 'typical_hourly_rate_chef_gbp', 18,
  'uniform_provided', true,
  'agreed_pay_fairly', true, 'agreed_treat_team_like_our_own', true, 'agreed_provide_clear_brief', true,
  'agreed_rate_honestly', true) as vj;
grant select on base to public;

-- Refusals ------------------------------------------------------------------
do $$
declare t jsonb := (select tj from base); v jsonb := (select vj from base);
begin
  perform pg_temp.login(null);
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t), 'Sign in to continue.');

  perform pg_temp.login('a1111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'chef', t), 'Choose venue or talent.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"photo_path":"x"}'), 'Check your answers and try again.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"member_id":"a1111111-1111-1111-1111-111111111111"}'), 'Check your answers and try again.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"home_area":"TW9"}'), 'Check your answers and try again.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"approved":true}'), 'Check your answers and try again.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"business_name":"x"}'), 'Check your answers and try again.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"full_name":"   "}'), 'Add a name.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t - 'home_postcode'), 'Add a postcode.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"positions":[]}'), 'Choose at least one position.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"mobile_number":""}'), 'Add a mobile number.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"agreed_turn_up_on_time":false}'), 'Agree to all four to continue.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"positions":["Astronaut"]}'), 'Choose from the list.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"years_band":"40+"}'), 'Choose from the list.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || jsonb_build_object('bio', repeat('x', 251))), 'Keep your bio under 250 characters.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"minimum_same_day_rate_gbp":"18–20"}'), 'Check your answers and try again.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"date_of_birth":"1995-13-40"}'), 'Check your answers and try again.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'talent', t || '{"full_name":42}'), 'Check your answers and try again.');

  -- files
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, %L, null)', 'talent', t,
    '[{"kind":"right-to-work","storage_path":"a1111111-1111-1111-1111-111111111111/missing.pdf","original_filename":"x.pdf"}]'),
    'That upload didn’t finish. Add the file again.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, %L, null)', 'talent', t,
    '[{"kind":"right-to-work","storage_path":"a2222222-2222-2222-2222-222222222222/licence.pdf","original_filename":"x.pdf"}]'),
    'That upload didn’t finish. Add the file again.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, %L, null)', 'talent', t,
    '[{"kind":"premises-licence","storage_path":"a1111111-1111-1111-1111-111111111111/rtw.pdf","original_filename":"x.pdf"}]'),
    'Choose one of the listed documents.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, %L, null)', 'talent', t,
    '[{"kind":"allergen-awareness","storage_path":"a1111111-1111-1111-1111-111111111111/rtw.pdf","original_filename":"x.pdf"}]'),
    'Choose one of the listed documents.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, %L, null)', 'talent', t,
    '[{"kind":"photo-id","storage_path":"a1111111-1111-1111-1111-111111111111/anim.gif","original_filename":"x.gif"}]'),
    'Upload a photo or PDF up to 10 MB.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, %L, null)', 'talent', t,
    '[{"kind":"photo-id","storage_path":"a1111111-1111-1111-1111-111111111111/huge.pdf","original_filename":"x.pdf"}]'),
    'Upload a photo or PDF up to 10 MB.');

  -- availability
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, %L)', 'talent', t,
    jsonb_build_array(jsonb_build_object('day_date', pg_temp.today() + 56, 'kind', 'not-free'))),
    'Choose dates in the next 8 weeks.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, %L)', 'talent', t,
    '[{"day_date":"2026-10-25","kind":"free","start_time":"01:30","end_time":"05:00"}]'),
    case when pg_temp.today() <= date '2026-10-25' then 'That time happens twice when the clocks go back. Choose another.'
         else null end);
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, %L)', 'talent', t,
    jsonb_build_array(jsonb_build_object('day_date', pg_temp.today() + 1, 'kind', 'free', 'start_time', '09:00', 'end_time', '09:00'))),
    'Choose different start and end times.');

  -- venue
  perform pg_temp.login('a2222222-2222-2222-2222-222222222222');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'venue', v || '{"full_name":"x"}'), 'Check your answers and try again.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'venue', v || '{"display_name":"x"}'), 'Check your answers and try again.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'venue', (v - 'trading_name') - 'business_name'), 'Add a name.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'venue', v - 'street_address'), 'Add the street address.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'venue', v || '{"postcode":" "}'), 'Add a postcode.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'venue', v - 'contact_name'), 'Add the on-site contact’s name.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'venue', v - 'contact_phone'), 'Add the on-site contact’s phone.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'venue', v - 'agreed_rate_honestly'), 'Agree to all four to continue.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'venue', v || '{"cuisines":["Martian"]}'), 'Choose from the list.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'venue', v || '{"venue_types":["Spaceship"]}'), 'Choose from the list.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, null)', 'venue', v || '{"average_team_size":"2.5"}'), 'Check your answers and try again.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, %L, null)', 'venue', v,
    '[{"kind":"right-to-work","storage_path":"a2222222-2222-2222-2222-222222222222/licence.pdf","original_filename":"l.pdf"}]'),
    'Choose one of the listed documents.');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, null, %L)', 'venue', v,
    jsonb_build_array(jsonb_build_object('day_date', pg_temp.today() + 1, 'kind', 'not-free'))),
    'Only talent set availability.');

  -- FOH-only talent can't add a kitchen document
  perform pg_temp.login('a3333333-3333-3333-3333-333333333333');
  perform pg_temp.expect_error(format('select public.create_my_profile(%L, %L, %L, null)', 'talent', t || '{"positions":["Waiter"]}',
    '[{"kind":"food-hygiene","storage_path":"a3333333-3333-3333-3333-333333333333/hygiene.pdf","original_filename":"h.pdf"}]'),
    'Choose one of the listed documents.');

  assert (select count(*) from public.members where user_id in ('a1111111-1111-1111-1111-111111111111','a2222222-2222-2222-2222-222222222222','a3333333-3333-3333-3333-333333333333')) = 0, 'refusals left a member behind';
end $$;

-- Success: talent -------------------------------------------------------------
do $$
declare t jsonb := (select tj from base); r jsonb; r2 jsonb; m uuid; tal public.talents;
begin
  perform pg_temp.login('a1111111-1111-1111-1111-111111111111');
  r := pg_temp.call(format('select public.create_my_profile(%L, %L, %L, %L)', 'talent', t,
    '[{"kind":"right-to-work","storage_path":"a1111111-1111-1111-1111-111111111111/rtw.pdf","original_filename":"Passport scan.pdf"},
      {"kind":"food-hygiene","storage_path":"a1111111-1111-1111-1111-111111111111/hygiene.png","original_filename":" "}]',
    jsonb_build_array(
      jsonb_build_object('day_date', pg_temp.today() - 1, 'kind', 'free', 'start_time', '09:00', 'end_time', '17:00'),
      jsonb_build_object('day_date', pg_temp.today() + 1, 'kind', 'free', 'start_time', '00:00', 'end_time', '00:00'),
      jsonb_build_object('day_date', pg_temp.today() + 2, 'kind', 'free', 'start_time', '22:00', 'end_time', '02:00'),
      jsonb_build_object('day_date', pg_temp.today() + 3, 'kind', 'not-free', 'start_time', null, 'end_time', null))));
  m := (r->>'member_id')::uuid;
  assert r->>'side' = 'talent' and (r->>'approved')::boolean = false, 'create result';
  assert (select approved from public.members where id = m) = false, 'new member not approved';
  select * into tal from public.talents where member_id = m;
  assert tal.full_name = 'Poppy Bertram', 'name trimmed';
  assert tal.home_area = 'TW9', 'home_area generated';
  assert tal.minimum_same_day_rate_gbp = 18.50, 'rate parsed';
  assert tal.positions = array['CDP','Sous Chef'], 'positions';
  assert tal.photo_path is null and tal.onboarding_completed_at is not null, 'photo empty, completed set';
  assert tal.shift_alerts = 'all', 'default alerts';
  assert jsonb_array_length(tal.employment_history) = 1, 'employment history';
  assert (select count(*) from public.documents where member_id = m and status = 'review') = 2, 'two documents in review';
  assert (select size_bytes from public.documents where doc_type = 'food-hygiene' and member_id = m) = 4096, 'size from storage';
  assert (select content_type from public.documents where doc_type = 'food-hygiene' and member_id = m) = 'image/png', 'type from storage';
  assert (select original_filename from public.documents where doc_type = 'food-hygiene' and member_id = m) = 'hygiene.png', 'blank filename falls back';
  assert (select count(*) from public.availability where member_id = m) = 3, 'past date skipped';
  assert (select ends_at - starts_at from public.availability where member_id = m and day_date = pg_temp.today() + 1)
         between interval '23 hours' and interval '25 hours', 'all day';
  assert (select ends_at - starts_at from public.availability where member_id = m and day_date = pg_temp.today() + 2)
         between interval '3 hours' and interval '5 hours', 'overnight';
  assert (select count(*) from public.notifications where member_id = m) = 0, 'no notice';

  -- Idempotent: a second tap returns the same member, unchanged.
  r2 := pg_temp.call(format('select public.create_my_profile(%L, %L, null, null)', 'venue', '{}'));
  assert r2->>'member_id' = m::text and r2->>'side' = 'talent', 'second call returns same member';
  assert (select count(*) from public.members where user_id = 'a1111111-1111-1111-1111-111111111111') = 1, 'one member';
end $$;

-- Success: venue ------------------------------------------------------------
do $$
declare v jsonb := (select vj from base); r jsonb; ven public.venues;
begin
  perform pg_temp.login('a2222222-2222-2222-2222-222222222222');
  r := pg_temp.call(format('select public.create_my_profile(%L, %L, %L, %L)', 'venue', v,
    '[{"kind":"premises-licence","storage_path":"a2222222-2222-2222-2222-222222222222/licence.pdf","original_filename":"Licence.pdf"}]', '[]'));
  select * into ven from public.venues where member_id = (r->>'member_id')::uuid;
  assert ven.display_name = 'Spruce' and ven.area = 'TW9', 'venue display name and area';
  assert ven.average_team_size = 12 and ven.typical_hourly_rate_chef_gbp = 18 and ven.uniform_provided, 'venue numbers';
  assert (select count(*) from public.documents where member_id = (r->>'member_id')::uuid) = 1, 'venue document';
end $$;

-- Grants --------------------------------------------------------------------
do $$
begin
  assert not has_function_privilege('anon', 'public.create_my_profile(text, jsonb, jsonb, jsonb)', 'execute'), 'anon cannot call';
  assert has_function_privilege('authenticated', 'public.create_my_profile(text, jsonb, jsonb, jsonb)', 'execute'), 'authenticated can call';
  assert not has_function_privilege('authenticated', 'private.clean_profile_answers(text, jsonb, text[])', 'execute'), 'helper closed';
  assert not has_function_privilege('authenticated', 'private.own_stored_file(text, text)', 'execute'), 'helper closed';
end $$;

-- Onboarding archive untouched.
do $$ begin
  assert (select count(*) from public.talent_profiles) = 10 and (select count(*) from public.venue_profiles) = 8, 'archive counts changed';
end $$;

select 'profile_create: all passed' as result;
rollback;
