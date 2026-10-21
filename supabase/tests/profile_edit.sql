-- Tests for update_my_profile, set_my_photo, update_my_settings,
-- request_account_deletion, keep_my_account, save_document, set_availability.
-- Ends in rollback; prints 'profile_edit: all passed'.
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
create function pg_temp.call(q text) returns jsonb language plpgsql as $$
declare r jsonb; begin execute q into r; return r; end $$;
create function pg_temp.today() returns date language sql as $$ select (now() at time zone 'Europe/London')::date $$;

-- Fixtures: talent T (kitchen), venue V, login N with no member.
insert into auth.users (id, instance_id, aud, role, email) values
  ('b1111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pe-talent@example.com'),
  ('b2222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pe-venue@example.com'),
  ('b3333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pe-none@example.com');
insert into public.members (id, user_id, side) values
  ('c1111111-1111-1111-1111-111111111111','b1111111-1111-1111-1111-111111111111','talent'),
  ('c2222222-2222-2222-2222-222222222222','b2222222-2222-2222-2222-222222222222','venue');
insert into public.talents (member_id, full_name, home_postcode, mobile_number, positions)
  values ('c1111111-1111-1111-1111-111111111111','Poppy Bertram','TW9 1UA','07700 900123','{CDP}');
insert into public.venues (member_id, business_name, street_address, postcode, contact_name, contact_phone)
  values ('c2222222-2222-2222-2222-222222222222','Spruce Ltd','1 Kew Road','TW9 2AA','Ana','020 7946 0000');
insert into storage.objects (bucket_id, name, owner, metadata) values
  ('member-photos','b1111111-1111-1111-1111-111111111111/p1.jpg','b1111111-1111-1111-1111-111111111111','{"size":50000,"mimetype":"image/jpeg"}'),
  ('member-photos','b1111111-1111-1111-1111-111111111111/p2.webp','b1111111-1111-1111-1111-111111111111','{"size":50000,"mimetype":"image/webp"}'),
  ('member-photos','b1111111-1111-1111-1111-111111111111/big.png','b1111111-1111-1111-1111-111111111111','{"size":6000000,"mimetype":"image/png"}'),
  ('member-photos','b1111111-1111-1111-1111-111111111111/doc.pdf','b1111111-1111-1111-1111-111111111111','{"size":5000,"mimetype":"application/pdf"}'),
  ('member-photos','b2222222-2222-2222-2222-222222222222/v.jpg','b2222222-2222-2222-2222-222222222222','{"size":5000,"mimetype":"image/jpeg"}'),
  ('member-documents','b1111111-1111-1111-1111-111111111111/hyg1.pdf','b1111111-1111-1111-1111-111111111111','{"size":5000,"mimetype":"application/pdf"}'),
  ('member-documents','b1111111-1111-1111-1111-111111111111/hyg2.jpg','b1111111-1111-1111-1111-111111111111','{"size":7000,"mimetype":"image/jpeg"}'),
  ('member-documents','b1111111-1111-1111-1111-111111111111/bad.webp','b1111111-1111-1111-1111-111111111111','{"size":7000,"mimetype":"image/webp"}'),
  ('member-documents','b2222222-2222-2222-2222-222222222222/reg.pdf','b2222222-2222-2222-2222-222222222222','{"size":7000,"mimetype":"application/pdf"}');

-- update_my_profile ---------------------------------------------------------
do $$
declare tal public.talents; ven public.venues;
begin
  perform pg_temp.login('b3333333-3333-3333-3333-333333333333');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"full_name":"X"}')$q$, 'Create your profile first.');
  perform pg_temp.login(null);
  perform pg_temp.expect_error($q$select public.update_my_profile('{"full_name":"X"}')$q$, 'Sign in to continue.');

  perform pg_temp.login('b1111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"photo_path":"x"}')$q$, 'Check your answers and try again.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"date_of_birth":"2000-01-01"}')$q$, 'Check your answers and try again.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"name":"x"}')$q$, 'Check your answers and try again.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"full_name":""}')$q$, 'Add a name.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"home_postcode":null}')$q$, 'Add a postcode.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"positions":[]}')$q$, 'Choose at least one position.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"mobile_number":" "}')$q$, 'Add a mobile number.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"skills":["Juggling"]}')$q$, 'Choose from the list.');
  perform pg_temp.expect_error(format('select public.update_my_profile(%L)', jsonb_build_object('bio', repeat('é', 251))), 'Keep your bio under 250 characters.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"minimum_same_day_rate_gbp":"-3"}')$q$, 'Check your answers and try again.');
  perform pg_temp.expect_error($q$select public.update_my_profile('"oops"')$q$, 'Check your answers and try again.');

  perform public.update_my_profile('{"full_name":" Poppy B ","bio":"Hi","skills":["Grill","Fish"],"custom_skills":["Ramen"],"minimum_same_day_rate_gbp":"18.5","positions":["Sous Chef","Waiter"]}');
  select * into tal from public.talents where member_id = 'c1111111-1111-1111-1111-111111111111';
  assert tal.full_name = 'Poppy B' and tal.bio = 'Hi' and tal.skills = '{Grill,Fish}' and tal.custom_skills = '{Ramen}', 'talent fields saved';
  assert tal.minimum_same_day_rate_gbp = 18.5 and tal.positions = '{"Sous Chef",Waiter}', 'rate and positions';
  assert tal.mobile_number = '07700 900123', 'untouched field kept';
  perform public.update_my_profile('{"minimum_same_day_rate_gbp":null,"bio":""}');
  select * into tal from public.talents where member_id = 'c1111111-1111-1111-1111-111111111111';
  assert tal.minimum_same_day_rate_gbp is null and tal.bio is null, 'optional fields cleared';
  assert public.update_my_profile('{}') = '{}'::jsonb, 'empty change is fine';

  perform pg_temp.login('b2222222-2222-2222-2222-222222222222');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"trading_name":"x"}')$q$, 'Check your answers and try again.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"business_name":"x"}')$q$, 'Check your answers and try again.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"full_name":"x"}')$q$, 'Check your answers and try again.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"street_address":""}')$q$, 'Add the street address.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"postcode":""}')$q$, 'Add a postcode.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"contact_name":""}')$q$, 'Add the on-site contact’s name.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"contact_phone":""}')$q$, 'Add the on-site contact’s phone.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"cuisines":["Martian"]}')$q$, 'Choose from the list.');
  perform pg_temp.expect_error($q$select public.update_my_profile('{"venue_types":["Boat"]}')$q$, 'Choose from the list.');
  perform public.update_my_profile('{"name":"Spruce","instagram_handle":"@spruce","cuisines":["British","Seafood"],"contact_position":"GM"}');
  select * into ven from public.venues where member_id = 'c2222222-2222-2222-2222-222222222222';
  assert ven.trading_name = 'Spruce' and ven.business_name = 'Spruce Ltd' and ven.display_name = 'Spruce', 'name goes to trading_name';
  assert ven.instagram_handle = '@spruce' and ven.cuisines = '{British,Seafood}' and ven.contact_position = 'GM', 'venue fields saved';
  -- Clearing the trading name falls back to the business name, so it is allowed.
  perform public.update_my_profile('{"name":""}');
  assert (select display_name from public.venues where member_id = 'c2222222-2222-2222-2222-222222222222') = 'Spruce Ltd', 'falls back to business name';
end $$;

-- set_my_photo --------------------------------------------------------------
do $$
declare r jsonb;
begin
  perform pg_temp.login('b3333333-3333-3333-3333-333333333333');
  perform pg_temp.expect_error($q$select public.set_my_photo('b3333333-3333-3333-3333-333333333333/x.jpg')$q$, 'Create your profile first.');
  perform pg_temp.login('b1111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error($q$select public.set_my_photo('b1111111-1111-1111-1111-111111111111/nope.jpg')$q$, 'That upload didn’t finish. Add the file again.');
  perform pg_temp.expect_error($q$select public.set_my_photo('b2222222-2222-2222-2222-222222222222/v.jpg')$q$, 'That upload didn’t finish. Add the file again.');
  perform pg_temp.expect_error($q$select public.set_my_photo('b1111111-1111-1111-1111-111111111111/hyg1.pdf')$q$, 'That upload didn’t finish. Add the file again.');
  perform pg_temp.expect_error($q$select public.set_my_photo(null)$q$, 'That upload didn’t finish. Add the file again.');
  perform pg_temp.expect_error($q$select public.set_my_photo('b1111111-1111-1111-1111-111111111111/big.png')$q$, 'Upload a photo up to 5 MB.');
  perform pg_temp.expect_error($q$select public.set_my_photo('b1111111-1111-1111-1111-111111111111/doc.pdf')$q$, 'Upload a photo up to 5 MB.');
  r := public.set_my_photo('b1111111-1111-1111-1111-111111111111/p1.jpg');
  assert r = '{"old_path":null}'::jsonb, 'first photo has no old path';
  r := public.set_my_photo('b1111111-1111-1111-1111-111111111111/p2.webp');
  assert r->>'old_path' = 'b1111111-1111-1111-1111-111111111111/p1.jpg', 'old path returned';
  assert (select photo_path from public.talents where member_id = 'c1111111-1111-1111-1111-111111111111') = 'b1111111-1111-1111-1111-111111111111/p2.webp', 'photo saved';
  r := public.set_my_photo('b1111111-1111-1111-1111-111111111111/p2.webp');
  assert r->>'old_path' is null, 'same photo again: nothing to delete';
  perform pg_temp.login('b2222222-2222-2222-2222-222222222222');
  perform public.set_my_photo('b2222222-2222-2222-2222-222222222222/v.jpg');
  assert (select photo_path from public.venues where member_id = 'c2222222-2222-2222-2222-222222222222') = 'b2222222-2222-2222-2222-222222222222/v.jpg', 'venue photo saved';
end $$;

-- update_my_settings, deletion requests --------------------------------------
do $$
declare r jsonb; r2 jsonb;
begin
  perform pg_temp.login('b2222222-2222-2222-2222-222222222222');
  perform pg_temp.expect_error($q$select public.update_my_settings('off')$q$, 'Check your answers and try again.');
  perform pg_temp.login('b1111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error($q$select public.update_my_settings('sometimes')$q$, 'Check your answers and try again.');
  perform pg_temp.expect_error($q$select public.update_my_settings(null)$q$, 'Check your answers and try again.');
  perform public.update_my_settings('soon');
  assert (select shift_alerts from public.talents where member_id = 'c1111111-1111-1111-1111-111111111111') = 'soon', 'alerts saved';

  r := public.request_account_deletion();
  assert r->>'requested_at' is not null, 'requested';
  r2 := public.request_account_deletion();
  assert r2 = r, 'second request keeps the first time';
  assert (select deletion_requested_at from public.members where id = 'c1111111-1111-1111-1111-111111111111') = (r->>'requested_at')::timestamptz, 'stored';
  assert public.keep_my_account() = '{}'::jsonb, 'keep';
  assert (select deletion_requested_at from public.members where id = 'c1111111-1111-1111-1111-111111111111') is null, 'cleared';
  perform pg_temp.login('b3333333-3333-3333-3333-333333333333');
  perform pg_temp.expect_error($q$select public.request_account_deletion()$q$, 'Create your profile first.');
end $$;

-- save_document -------------------------------------------------------------
do $$
declare r jsonb; r2 jsonb; d uuid;
begin
  perform pg_temp.login('b1111111-1111-1111-1111-111111111111');
  -- positions are now Sous Chef + Waiter: kitchen, so allergen-awareness (front-of-house only) is refused
  perform pg_temp.expect_error($q$select public.save_document('allergen-awareness','b1111111-1111-1111-1111-111111111111/hyg1.pdf','a.pdf')$q$, 'Choose one of the listed documents.');
  perform pg_temp.expect_error($q$select public.save_document('premises-licence','b1111111-1111-1111-1111-111111111111/hyg1.pdf','a.pdf')$q$, 'Choose one of the listed documents.');
  perform pg_temp.expect_error($q$select public.save_document('nonsense','b1111111-1111-1111-1111-111111111111/hyg1.pdf','a.pdf')$q$, 'Choose one of the listed documents.');
  perform pg_temp.expect_error($q$select public.save_document('food-hygiene','b2222222-2222-2222-2222-222222222222/reg.pdf','a.pdf')$q$, 'That upload didn’t finish. Add the file again.');
  perform pg_temp.expect_error($q$select public.save_document('food-hygiene','b1111111-1111-1111-1111-111111111111/p1.jpg','a.jpg')$q$, 'That upload didn’t finish. Add the file again.');
  perform pg_temp.expect_error($q$select public.save_document('food-hygiene','b1111111-1111-1111-1111-111111111111/bad.webp','a.webp')$q$, 'Upload a photo or PDF up to 10 MB.');

  r := public.save_document('food-hygiene', 'b1111111-1111-1111-1111-111111111111/hyg1.pdf', 'Level 2.pdf');
  d := (r->>'document_id')::uuid;
  assert r->>'old_path' is null, 'first upload has no old path';
  assert (select status from public.documents where id = d) = 'review', 'in review';
  -- The same file can't be saved as a second type.
  perform pg_temp.expect_error($q$select public.save_document('cv','b1111111-1111-1111-1111-111111111111/hyg1.pdf','a.pdf')$q$, 'That upload didn’t finish. Add the file again.');

  -- An admin rejects it; a replacement goes back to review.
  update public.documents set status = 'rejected', reviewed_at = now(), reviewed_by = 'b2222222-2222-2222-2222-222222222222', reject_reason = 'Blurry' where id = d;
  r2 := public.save_document('food-hygiene', 'b1111111-1111-1111-1111-111111111111/hyg2.jpg', 'Level 2 again.jpg');
  assert (r2->>'document_id')::uuid = d, 'same row replaced';
  assert r2->>'old_path' = 'b1111111-1111-1111-1111-111111111111/hyg1.pdf', 'old path returned';
  assert (select status = 'review' and reviewed_at is null and reviewed_by is null and reject_reason is null
                 and content_type = 'image/jpeg' and size_bytes = 7000 and original_filename = 'Level 2 again.jpg'
          from public.documents where id = d), 'replacement reset';

  perform pg_temp.login('b2222222-2222-2222-2222-222222222222');
  perform pg_temp.expect_error($q$select public.save_document('right-to-work','b2222222-2222-2222-2222-222222222222/reg.pdf','r.pdf')$q$, 'Choose one of the listed documents.');
  r := public.save_document('business-registration', 'b2222222-2222-2222-2222-222222222222/reg.pdf', 'Reg.pdf');
  assert r->>'document_id' is not null, 'venue document saved';
end $$;

-- set_availability ----------------------------------------------------------
do $$
declare r jsonb; a public.availability; td date := pg_temp.today();
begin
  perform pg_temp.login('b2222222-2222-2222-2222-222222222222');
  perform pg_temp.expect_error(format('select public.set_availability(%L, %L, null, null)', array[td + 1], 'not-free'), 'Only talent set availability.');
  perform pg_temp.login('b1111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error($q$select public.set_availability('{}', 'not-free', null, null)$q$, 'Choose at least one date.');
  perform pg_temp.expect_error($q$select public.set_availability(null, 'not-free', null, null)$q$, 'Choose at least one date.');
  perform pg_temp.expect_error(format('select public.set_availability(%L, %L, null, null)', array[td - 1], 'not-free'), 'Choose dates in the next 8 weeks.');
  perform pg_temp.expect_error(format('select public.set_availability(%L, %L, null, null)', array[td + 56], 'not-free'), 'Choose dates in the next 8 weeks.');
  perform pg_temp.expect_error(format('select public.set_availability(%L, %L, null, null)', array[td + 1], 'maybe'), 'Check your answers and try again.');
  perform pg_temp.expect_error(format('select public.set_availability(%L, %L, %L, %L)', array[td + 1], 'free', '09:00', '09:00'), 'Choose different start and end times.');
  perform pg_temp.expect_error(format('select public.set_availability(%L, %L, null, null)', array[td + 1], 'free'), 'Check your answers and try again.');
  if td <= date '2026-10-25' then
    perform pg_temp.expect_error($q$select public.set_availability('{2026-10-25}', 'free', '01:30', '04:00')$q$,
      'That time happens twice when the clocks go back. Choose another.');
  end if;

  r := public.set_availability(array[td + 3, td + 1, td + 3, td + 55], 'free', '00:00', '00:00');
  assert r = '{"saved":3}'::jsonb, 'three dates saved';
  select * into a from public.availability where member_id = 'c1111111-1111-1111-1111-111111111111' and day_date = td + 1;
  assert a.kind = 'free' and a.starts_at is not null and a.ends_at > a.starts_at, 'all day free';
  r := public.set_availability(array[td + 1], 'free', '22:00', '02:00');
  select * into a from public.availability where member_id = 'c1111111-1111-1111-1111-111111111111' and day_date = td + 1;
  assert a.start_time = '22:00' and (a.ends_at at time zone 'Europe/London')::date = td + 2, 'overnight replaces';
  r := public.set_availability(array[td + 1, td], 'not-free', '10:00', '12:00');
  select * into a from public.availability where member_id = 'c1111111-1111-1111-1111-111111111111' and day_date = td + 1;
  assert a.kind = 'not-free' and a.starts_at is null and a.start_time = '00:00', 'not free stores no instants';
  assert (select count(*) from public.availability where member_id = 'c1111111-1111-1111-1111-111111111111') = 4, 'four dates in total';
end $$;

do $$ begin
  assert (select count(*) from public.notifications where member_id in ('c1111111-1111-1111-1111-111111111111','c2222222-2222-2222-2222-222222222222')) = 0, 'profile edits send no notices';
  assert not has_function_privilege('anon', 'public.set_availability(date[], text, time, time)', 'execute'), 'anon closed';
  assert has_function_privilege('authenticated', 'public.save_document(text, text, text)', 'execute'), 'authenticated open';
  assert (select count(*) from public.talent_profiles) = 10 and (select count(*) from public.venue_profiles) = 8, 'archive counts changed';
end $$;

select 'profile_edit: all passed' as result;
rollback;
