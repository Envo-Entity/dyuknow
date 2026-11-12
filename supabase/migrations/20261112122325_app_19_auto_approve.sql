-- New members are approved as soon as they finish onboarding. Documents stay
-- optional. Everything else in create_my_profile is unchanged. Admins can
-- still take approval away (admin_set_approval), and every approval check
-- stays in place for that.

create or replace function public.create_my_profile(p_side text, p_answers jsonb, p_files jsonb, p_availability jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  m public.members;
  t timestamptz;
  v_today date;
  a jsonb;
  v_member uuid;
  v_cols text;
  v_rcols text;
  f jsonb;
  v_kind text; v_path text; v_name text;
  v_size bigint; v_mime text;
  v_positions text[];
  v_date date; v_start time; v_end time; v_akind text;
  talent_keys constant text[] := array['full_name','mobile_number','home_postcode','date_of_birth','category',
    'positions','skills','custom_skills','known_for','custom_known_for','years_band','employment_history','bio',
    'preferred_shifts','max_travel','preferred_areas','preferred_hourly_rate','minimum_same_day_rate_gbp',
    'shift_alerts','agreed_turn_up_on_time','agreed_treat_venues_with_respect','agreed_give_notice_if_cancelling',
    'agreed_represent_professionally'];
  venue_keys constant text[] := array['business_name','trading_name','registered_company','website',
    'instagram_handle','contact_name','contact_position','contact_phone','contact_email','street_address',
    'postcode','venue_types','cuisines','covers_band','average_team_size','average_team_vacancies_per_week',
    'roles_needed','teams_needed','typical_shifts','typical_notice','dress_code','uniform_provided','staff_meal',
    'typical_hourly_rate_chef_gbp','typical_hourly_rate_foh_gbp','bio','known_for','agreed_pay_fairly',
    'agreed_treat_team_like_our_own','agreed_provide_clear_brief','agreed_rate_honestly'];
begin
  if v_uid is null then
    raise exception 'Sign in to continue.';
  end if;

  -- One call per login at a time: a second tab or tap waits here.
  perform pg_advisory_xact_lock(hashtextextended('dyuknow.create_my_profile:' || v_uid::text, 0));

  select * into m from public.members where user_id = v_uid;
  if found then
    return jsonb_build_object('member_id', m.id, 'side', m.side, 'approved', m.approved);
  end if;

  t := clock_timestamp();
  v_today := private.london_date(t);

  if p_side is null or p_side not in ('talent','venue') then
    raise exception 'Choose venue or talent.';
  end if;

  a := private.clean_profile_answers(p_side, p_answers,
         case p_side when 'talent' then talent_keys else venue_keys end);
  -- Leave out nulls for required columns, so their defaults apply.
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into a
    from jsonb_each(a)
    where not (jsonb_typeof(value) = 'null' and exists (
      select 1 from pg_catalog.pg_attribute x
      where x.attrelid = case p_side when 'talent' then 'public.talents'::regclass else 'public.venues'::regclass end
        and x.attname = key and x.attnotnull));

  -- Required answers.
  if p_side = 'talent' then
    if a->>'full_name' is null then raise exception 'Add a name.'; end if;
    if a->>'home_postcode' is null then raise exception 'Add a postcode.'; end if;
    if coalesce(jsonb_array_length(a->'positions'), 0) = 0 then raise exception 'Choose at least one position.'; end if;
    if a->>'mobile_number' is null then raise exception 'Add a mobile number.'; end if;
    if not (coalesce((a->>'agreed_turn_up_on_time')::boolean, false)
            and coalesce((a->>'agreed_treat_venues_with_respect')::boolean, false)
            and coalesce((a->>'agreed_give_notice_if_cancelling')::boolean, false)
            and coalesce((a->>'agreed_represent_professionally')::boolean, false)) then
      raise exception 'Agree to all four to continue.';
    end if;
  else
    if coalesce(a->>'trading_name', a->>'business_name') is null then raise exception 'Add a name.'; end if;
    if a->>'street_address' is null then raise exception 'Add the street address.'; end if;
    if a->>'postcode' is null then raise exception 'Add a postcode.'; end if;
    if a->>'contact_name' is null then raise exception 'Add the on-site contact’s name.'; end if;
    if a->>'contact_phone' is null then raise exception 'Add the on-site contact’s phone.'; end if;
    if not (coalesce((a->>'agreed_pay_fairly')::boolean, false)
            and coalesce((a->>'agreed_treat_team_like_our_own')::boolean, false)
            and coalesce((a->>'agreed_provide_clear_brief')::boolean, false)
            and coalesce((a->>'agreed_rate_honestly')::boolean, false)) then
      raise exception 'Agree to all four to continue.';
    end if;
  end if;

  -- Approved straight away at launch. An insert doesn't fire the approval
  -- trigger, so no 'approved' notice is sent and no admin action is logged.
  insert into public.members (user_id, side, approved, approved_at, created_at, updated_at)
  values (v_uid, p_side, true, t, t, t)
  returning id into v_member;

  select string_agg(format(', %I', key), ''), string_agg(format(', r.%I', key), '')
    into v_cols, v_rcols
    from jsonb_object_keys(a) as key;

  begin
    execute format(
      'insert into public.%I (member_id, onboarding_completed_at, created_at, updated_at%s)
       select $1, $2, $2, $2%s from jsonb_populate_record(null::public.%I, $3) r',
      case p_side when 'talent' then 'talents' else 'venues' end,
      coalesce(v_cols, ''), coalesce(v_rcols, ''),
      case p_side when 'talent' then 'talents' else 'venues' end)
    using v_member, t, a;
  exception
    when check_violation then raise exception 'Choose from the list.';
    when data_exception then raise exception 'Check your answers and try again.';
  end;

  if p_side = 'talent' then
    select positions into v_positions from public.talents where member_id = v_member;
  end if;

  -- Documents already uploaded into the login's own folder.
  if p_files is not null and jsonb_typeof(p_files) <> 'null' then
    if jsonb_typeof(p_files) <> 'array' or jsonb_array_length(p_files) > 10 then
      raise exception 'Check your answers and try again.';
    end if;
    for f in select * from jsonb_array_elements(p_files) loop
      if jsonb_typeof(f) <> 'object' then raise exception 'Check your answers and try again.'; end if;
      v_kind := f->>'kind';
      v_path := f->>'storage_path';
      v_name := nullif(btrim(coalesce(f->>'original_filename', '')), '');
      select s.size_bytes, s.mimetype into v_size, v_mime from private.own_stored_file('member-documents', v_path) s;
      if not found then
        raise exception 'That upload didn’t finish. Add the file again.';
      end if;
      if not private.doc_type_suits(v_kind, p_side, v_positions) then
        raise exception 'Choose one of the listed documents.';
      end if;
      if v_mime is null or v_mime not in ('image/jpeg','image/png','application/pdf')
         or v_size is null or v_size < 1 or v_size > 10485760 then
        raise exception 'Upload a photo or PDF up to 10 MB.';
      end if;
      if exists (select 1 from public.documents d
                 where d.storage_path = v_path or (d.member_id = v_member and d.doc_type = v_kind)) then
        raise exception 'Check your answers and try again.';
      end if;
      insert into public.documents (member_id, doc_type, storage_path, original_filename, content_type,
                                    size_bytes, status, uploaded_at)
      values (v_member, v_kind, v_path,
              left(coalesce(v_name, regexp_replace(v_path, '^.*/', '')), 255),
              v_mime, v_size, 'review', t);
    end loop;
  end if;

  -- Availability (talent only; past dates are skipped).
  if p_availability is not null and jsonb_typeof(p_availability) <> 'null' then
    if jsonb_typeof(p_availability) <> 'array' or jsonb_array_length(p_availability) > 120 then
      raise exception 'Check your answers and try again.';
    end if;
    if p_side <> 'talent' and jsonb_array_length(p_availability) > 0 then
      raise exception 'Only talent set availability.';
    end if;
    for f in select * from jsonb_array_elements(p_availability) loop
      begin
        v_date := (f->>'day_date')::date;
        v_akind := f->>'kind';
        v_start := nullif(f->>'start_time', '')::time;
        v_end := nullif(f->>'end_time', '')::time;
      exception when data_exception then
        raise exception 'Check your answers and try again.';
      end;
      if v_date is null then raise exception 'Check your answers and try again.'; end if;
      if v_date > v_today + 55 then
        raise exception 'Choose dates in the next 8 weeks.';
      end if;
      if v_date >= v_today then
        perform private.save_availability_day(v_member, v_date, v_akind, v_start, v_end, t);
      end if;
    end loop;
  end if;

  return jsonb_build_object('member_id', v_member, 'side', p_side, 'approved', true);
end $$;
