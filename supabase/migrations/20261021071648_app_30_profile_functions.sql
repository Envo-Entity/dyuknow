-- Dyuknow app backend, step 30 (Agent B): profile, availability, documents,
-- settings and account functions. Specified in 05-booking-engine.md under
-- "Availability, profile and account".

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

-- A stored file in one of the app buckets, but only when it sits in the
-- caller's own folder ("<login id>/..."). No row means "not there".
create function private.own_stored_file(p_bucket text, p_path text)
returns table (size_bytes bigint, mimetype text)
language sql stable security definer set search_path = '' as $$
  select case when (o.metadata->>'size') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint end,
         lower(o.metadata->>'mimetype')
  from storage.objects o
  where auth.uid() is not null
    and p_path is not null
    and o.bucket_id = p_bucket
    and o.name = p_path
    and split_part(p_path, '/', 1) = auth.uid()::text
    and char_length(p_path) > char_length(auth.uid()::text) + 1;
$$;

-- Whether a document type suits a member's side and (talent) positions.
create function private.doc_type_suits(p_doc_type text, p_side text, p_positions text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.document_types d
    where d.code = p_doc_type and d.side = p_side
      and (d.applies_to = 'everyone'
           or (p_side = 'talent' and (
                 (d.applies_to = 'kitchen') = exists (
                   select 1 from public.positions p
                   where p.name = any (coalesce(p_positions, '{}')) and p.team in ('Kitchen','Pastry'))))));
$$;

-- A talent's or venue's display name, as it reads in refusals.
create function private.member_display_name(p_member uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select t.full_name from public.talents t where t.member_id = p_member),
    (select v.display_name from public.venues v where v.member_id = p_member),
    'This member');
$$;

-- What a profile still lacks before it can be approved (empty when complete).
create function private.profile_missing_fields(p_member uuid)
returns text[] language plpgsql stable security definer set search_path = '' as $$
declare
  v_side text;
  t public.talents;
  v public.venues;
  missing text[] := '{}';
begin
  select side into v_side from public.members where id = p_member;
  if v_side = 'talent' then
    select * into t from public.talents where member_id = p_member;
    if nullif(btrim(t.full_name), '') is null then missing := missing || 'full name'; end if;
    if nullif(btrim(t.home_postcode), '') is null then missing := missing || 'home postcode'; end if;
    if coalesce(cardinality(t.positions), 0) = 0 then missing := missing || 'a position'; end if;
    if nullif(btrim(t.mobile_number), '') is null then missing := missing || 'mobile number'; end if;
    if not (coalesce(t.agreed_turn_up_on_time, false) and coalesce(t.agreed_treat_venues_with_respect, false)
            and coalesce(t.agreed_give_notice_if_cancelling, false) and coalesce(t.agreed_represent_professionally, false)) then
      missing := missing || 'the four agreements';
    end if;
  elsif v_side = 'venue' then
    select * into v from public.venues where member_id = p_member;
    if nullif(btrim(v.display_name), '') is null then missing := missing || 'name'; end if;
    if nullif(btrim(v.street_address), '') is null then missing := missing || 'street address'; end if;
    if nullif(btrim(v.postcode), '') is null then missing := missing || 'postcode'; end if;
    if nullif(btrim(v.contact_name), '') is null then missing := missing || 'contact name'; end if;
    if nullif(btrim(v.contact_phone), '') is null then missing := missing || 'contact phone'; end if;
    if not (coalesce(v.agreed_pay_fairly, false) and coalesce(v.agreed_treat_team_like_our_own, false)
            and coalesce(v.agreed_provide_clear_brief, false) and coalesce(v.agreed_rate_honestly, false)) then
      missing := missing || 'the four agreements';
    end if;
  end if;
  return missing;
end $$;

-- Cleans profile answers for one side: refuses unknown keys, trims text,
-- turns blanks into null, numbers into numbers, and checks free-text sizes,
-- the bio length and the cuisines list. Column types come from the table.
create function private.clean_profile_answers(p_side text, p_answers jsonb, p_allowed text[])
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_table regclass := case p_side when 'talent' then 'public.talents'::regclass else 'public.venues'::regclass end;
  k text; val jsonb; typ text; s text; el jsonb;
  arr jsonb;
  v_out jsonb := '{}'::jsonb;
  cuisines constant text[] := array['British','Italian','French','Spanish','Seafood','Asian','Indian','Japanese',
    'Chinese','Middle Eastern','American','Mexican','Mediterranean','Modern European','Other'];
begin
  if p_answers is null then
    return v_out;
  end if;
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Check your answers and try again.';
  end if;
  for k, val in select * from jsonb_each(p_answers) loop
    if not (k = any (p_allowed)) then
      raise exception 'Check your answers and try again.';
    end if;
    select format_type(a.atttypid, a.atttypmod) into typ
      from pg_catalog.pg_attribute a
      where a.attrelid = v_table and a.attname = k and a.attnum > 0 and not a.attisdropped and a.attgenerated = '';
    if typ is null then
      raise exception 'Check your answers and try again.';
    end if;

    if jsonb_typeof(val) = 'null' then
      v_out := v_out || jsonb_build_object(k, case when typ = 'text[]' then '[]'::jsonb else 'null'::jsonb end);
      continue;
    end if;

    case typ
      when 'text', 'date' then
        if jsonb_typeof(val) <> 'string' then raise exception 'Check your answers and try again.'; end if;
        s := nullif(btrim(val #>> '{}'), '');
        if s is not null and k <> 'bio' and char_length(s) > 500 then
          raise exception 'Check your answers and try again.';
        end if;
        v_out := v_out || jsonb_build_object(k, s);
      when 'text[]' then
        if jsonb_typeof(val) <> 'array' or jsonb_array_length(val) > 50 then
          raise exception 'Check your answers and try again.';
        end if;
        arr := '[]'::jsonb;
        for el in select * from jsonb_array_elements(val) loop
          if jsonb_typeof(el) <> 'string' then raise exception 'Check your answers and try again.'; end if;
          s := nullif(btrim(el #>> '{}'), '');
          if s is not null then
            if char_length(s) > 80 then raise exception 'Check your answers and try again.'; end if;
            if not arr @> jsonb_build_array(s) then arr := arr || jsonb_build_array(s); end if;
          end if;
        end loop;
        v_out := v_out || jsonb_build_object(k, arr);
      when 'numeric', 'integer' then
        if jsonb_typeof(val) = 'number' then
          s := val #>> '{}';
        elsif jsonb_typeof(val) = 'string' then
          s := nullif(btrim(val #>> '{}'), '');
        else
          raise exception 'Check your answers and try again.';
        end if;
        if s is null then
          v_out := v_out || jsonb_build_object(k, null);
        else
          if (typ = 'integer' and s !~ '^[0-9]{1,6}$')
             or (typ = 'numeric' and s !~ '^[0-9]{1,6}(\.[0-9]{1,2})?$') then
            raise exception 'Check your answers and try again.';
          end if;
          v_out := v_out || jsonb_build_object(k, s::numeric);
        end if;
      when 'boolean' then
        if jsonb_typeof(val) <> 'boolean' then raise exception 'Check your answers and try again.'; end if;
        v_out := v_out || jsonb_build_object(k, val);
      when 'jsonb' then
        if jsonb_typeof(val) <> 'array' or jsonb_array_length(val) > 50 or char_length(val::text) > 20000 then
          raise exception 'Check your answers and try again.';
        end if;
        v_out := v_out || jsonb_build_object(k, val);
      else
        raise exception 'Check your answers and try again.';
    end case;
  end loop;

  if p_side = 'venue' and v_out ? 'cuisines'
     and exists (select 1 from jsonb_array_elements_text(v_out->'cuisines') c where not (c = any (cuisines))) then
    raise exception 'Choose from the list.';
  end if;
  if char_length(v_out->>'bio') > 250 then
    raise exception 'Keep your bio under 250 characters.';
  end if;
  return v_out;
end $$;

-- Saves one availability date for a member, as set_availability does.
-- The caller checks the date window first.
create function private.save_availability_day(
  p_member uuid, p_date date, p_kind text, p_start time, p_end time, p_t timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare v_starts timestamptz; v_ends timestamptz;
begin
  if p_kind = 'free' then
    if p_start is null or p_end is null then
      raise exception 'Check your answers and try again.';
    end if;
    if p_start = p_end and p_start <> '00:00' then
      raise exception 'Choose different start and end times.';
    end if;
    v_starts := private.london_instant(p_date, p_start);
    v_ends := private.london_instant(case when p_end <= p_start then p_date + 1 else p_date end, p_end);
    insert into public.availability (member_id, day_date, kind, start_time, end_time, starts_at, ends_at, updated_at)
    values (p_member, p_date, 'free', p_start, p_end, v_starts, v_ends, p_t)
    on conflict (member_id, day_date) do update
      set kind = excluded.kind, start_time = excluded.start_time, end_time = excluded.end_time,
          starts_at = excluded.starts_at, ends_at = excluded.ends_at, updated_at = excluded.updated_at;
  elsif p_kind = 'not-free' then
    insert into public.availability (member_id, day_date, kind, start_time, end_time, starts_at, ends_at, updated_at)
    values (p_member, p_date, 'not-free', '00:00', '00:00', null, null, p_t)
    on conflict (member_id, day_date) do update
      set kind = excluded.kind, start_time = excluded.start_time, end_time = excluded.end_time,
          starts_at = null, ends_at = null, updated_at = excluded.updated_at;
  else
    raise exception 'Check your answers and try again.';
  end if;
end $$;

revoke all on function private.own_stored_file(text, text), private.doc_type_suits(text, text, text[]),
  private.member_display_name(uuid), private.profile_missing_fields(uuid),
  private.clean_profile_answers(text, jsonb, text[]),
  private.save_availability_day(uuid, date, text, time, time, timestamptz)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- create_my_profile
-- ---------------------------------------------------------------------------
create function public.create_my_profile(p_side text, p_answers jsonb, p_files jsonb, p_availability jsonb)
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

  insert into public.members (user_id, side, approved, created_at, updated_at)
  values (v_uid, p_side, false, t, t)
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

  return jsonb_build_object('member_id', v_member, 'side', p_side, 'approved', false);
end $$;

-- ---------------------------------------------------------------------------
-- update_my_profile
-- ---------------------------------------------------------------------------
create function public.update_my_profile(p_changes jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me public.members := private.require_member();
  a jsonb;
  v_set text;
  tal public.talents;
  ven public.venues;
  talent_keys constant text[] := array['full_name','bio','home_postcode','positions','skills','custom_skills',
    'mobile_number','minimum_same_day_rate_gbp'];
  venue_keys constant text[] := array['name','bio','street_address','postcode','contact_name','contact_position',
    'contact_phone','venue_types','cuisines','instagram_handle'];
begin
  perform 1 from public.members where id = me.id for update;

  -- Venues edit "name", which is saved to trading_name; business_name keeps
  -- the onboarding answer.
  if me.side = 'venue' and p_changes is not null and jsonb_typeof(p_changes) = 'object' then
    if p_changes ? 'trading_name' then
      raise exception 'Check your answers and try again.';
    end if;
    if p_changes ? 'name' then
      p_changes := (p_changes - 'name') || jsonb_build_object('trading_name', p_changes->'name');
    end if;
  end if;

  a := private.clean_profile_answers(me.side, p_changes,
         case me.side when 'talent' then talent_keys
                      else array_remove(venue_keys, 'name') || 'trading_name'::text end);
  if a = '{}'::jsonb then
    return '{}'::jsonb;
  end if;

  select string_agg(format('%I = r.%I', key, key), ', ') into v_set from jsonb_object_keys(a) as key;

  begin
    execute format('update public.%I x set %s from jsonb_populate_record(null::public.%I, $1) r where x.member_id = $2',
      case me.side when 'talent' then 'talents' else 'venues' end, v_set,
      case me.side when 'talent' then 'talents' else 'venues' end)
    using a, me.id;
  exception
    when check_violation then raise exception 'Choose from the list.';
    when data_exception then raise exception 'Check your answers and try again.';
  end;

  -- A required field can't be emptied.
  if me.side = 'talent' then
    select * into tal from public.talents where member_id = me.id;
    if a ? 'full_name' and tal.full_name is null then raise exception 'Add a name.'; end if;
    if a ? 'home_postcode' and tal.home_postcode is null then raise exception 'Add a postcode.'; end if;
    if a ? 'positions' and cardinality(tal.positions) = 0 then raise exception 'Choose at least one position.'; end if;
    if a ? 'mobile_number' and tal.mobile_number is null then raise exception 'Add a mobile number.'; end if;
  else
    select * into ven from public.venues where member_id = me.id;
    if a ? 'trading_name' and ven.display_name is null then raise exception 'Add a name.'; end if;
    if a ? 'street_address' and ven.street_address is null then raise exception 'Add the street address.'; end if;
    if a ? 'postcode' and ven.postcode is null then raise exception 'Add a postcode.'; end if;
    if a ? 'contact_name' and ven.contact_name is null then raise exception 'Add the on-site contact’s name.'; end if;
    if a ? 'contact_phone' and ven.contact_phone is null then raise exception 'Add the on-site contact’s phone.'; end if;
  end if;

  return '{}'::jsonb;
end $$;

-- ---------------------------------------------------------------------------
-- set_my_photo
-- ---------------------------------------------------------------------------
create function public.set_my_photo(p_storage_path text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me public.members := private.require_member();
  v_size bigint; v_mime text; v_old text;
begin
  perform 1 from public.members where id = me.id for update;
  select s.size_bytes, s.mimetype into v_size, v_mime from private.own_stored_file('member-photos', p_storage_path) s;
  if not found then
    raise exception 'That upload didn’t finish. Add the file again.';
  end if;
  if v_mime is null or v_mime not in ('image/jpeg','image/png','image/webp')
     or v_size is null or v_size < 1 or v_size > 5242880 then
    raise exception 'Upload a photo up to 5 MB.';
  end if;
  if me.side = 'talent' then
    select photo_path into v_old from public.talents where member_id = me.id;
    update public.talents set photo_path = p_storage_path where member_id = me.id;
  else
    select photo_path into v_old from public.venues where member_id = me.id;
    update public.venues set photo_path = p_storage_path where member_id = me.id;
  end if;
  return jsonb_build_object('old_path', case when v_old is distinct from p_storage_path then v_old end);
end $$;

-- ---------------------------------------------------------------------------
-- update_my_settings
-- ---------------------------------------------------------------------------
create function public.update_my_settings(p_shift_alerts text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.members := private.require_member();
begin
  if me.side <> 'talent' or p_shift_alerts is null or p_shift_alerts not in ('all','soon','off') then
    raise exception 'Check your answers and try again.';
  end if;
  update public.talents set shift_alerts = p_shift_alerts where member_id = me.id;
  return '{}'::jsonb;
end $$;

-- ---------------------------------------------------------------------------
-- request_account_deletion and keep_my_account
-- ---------------------------------------------------------------------------
create function public.request_account_deletion()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.members := private.require_member(); v_at timestamptz;
begin
  select deletion_requested_at into v_at from public.members where id = me.id for update;
  if v_at is null then
    v_at := clock_timestamp();
    update public.members set deletion_requested_at = v_at where id = me.id;
  end if;
  return jsonb_build_object('requested_at', v_at);
end $$;

create function public.keep_my_account()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.members := private.require_member();
begin
  update public.members set deletion_requested_at = null
   where id = me.id and deletion_requested_at is not null;
  return '{}'::jsonb;
end $$;

-- ---------------------------------------------------------------------------
-- save_document
-- ---------------------------------------------------------------------------
create function public.save_document(p_doc_type text, p_storage_path text, p_original_filename text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me public.members := private.require_member();
  t timestamptz;
  v_positions text[];
  v_size bigint; v_mime text;
  old public.documents;
  v_id uuid;
  v_name text;
begin
  perform 1 from public.members where id = me.id for update;
  t := clock_timestamp();

  if me.side = 'talent' then
    select positions into v_positions from public.talents where member_id = me.id;
  end if;
  if not private.doc_type_suits(p_doc_type, me.side, v_positions) then
    raise exception 'Choose one of the listed documents.';
  end if;

  select s.size_bytes, s.mimetype into v_size, v_mime from private.own_stored_file('member-documents', p_storage_path) s;
  if not found then
    raise exception 'That upload didn’t finish. Add the file again.';
  end if;
  if v_mime is null or v_mime not in ('image/jpeg','image/png','application/pdf')
     or v_size is null or v_size < 1 or v_size > 10485760 then
    raise exception 'Upload a photo or PDF up to 10 MB.';
  end if;

  select * into old from public.documents where member_id = me.id and doc_type = p_doc_type for update;
  if exists (select 1 from public.documents d where d.storage_path = p_storage_path
             and d.id is distinct from old.id) then
    raise exception 'That upload didn’t finish. Add the file again.';
  end if;

  v_name := left(coalesce(nullif(btrim(p_original_filename), ''), regexp_replace(p_storage_path, '^.*/', '')), 255);

  if old.id is not null then
    update public.documents
       set storage_path = p_storage_path, original_filename = v_name, content_type = v_mime,
           size_bytes = v_size, status = 'review', uploaded_at = t,
           reviewed_at = null, reviewed_by = null, reject_reason = null
     where id = old.id;
    v_id := old.id;
  else
    insert into public.documents (member_id, doc_type, storage_path, original_filename, content_type,
                                  size_bytes, status, uploaded_at)
    values (me.id, p_doc_type, p_storage_path, v_name, v_mime, v_size, 'review', t)
    returning id into v_id;
  end if;

  return jsonb_build_object('document_id', v_id,
    'old_path', case when old.storage_path is distinct from p_storage_path then old.storage_path end);
end $$;

-- ---------------------------------------------------------------------------
-- set_availability
-- ---------------------------------------------------------------------------
create function public.set_availability(p_dates date[], p_kind text, p_start_time time, p_end_time time)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me public.members := private.require_member();
  t timestamptz;
  v_today date;
  v_dates date[];
  d date;
begin
  if me.side <> 'talent' then
    raise exception 'Only talent set availability.';
  end if;
  perform 1 from public.members where id = me.id for update;
  t := clock_timestamp();
  v_today := private.london_date(t);

  select coalesce(array_agg(distinct x order by x), '{}') into v_dates
    from unnest(coalesce(p_dates, '{}')) x where x is not null;
  if cardinality(v_dates) = 0 then
    raise exception 'Choose at least one date.';
  end if;
  if v_dates[1] < v_today or v_dates[cardinality(v_dates)] > v_today + 55 then
    raise exception 'Choose dates in the next 8 weeks.';
  end if;
  if p_kind is null or p_kind not in ('free','not-free') then
    raise exception 'Check your answers and try again.';
  end if;

  foreach d in array v_dates loop
    perform private.save_availability_day(me.id, d, p_kind, p_start_time, p_end_time, t);
  end loop;
  return jsonb_build_object('saved', cardinality(v_dates));
end $$;

-- ---------------------------------------------------------------------------
-- Rights
-- ---------------------------------------------------------------------------
revoke all on function public.create_my_profile(text, jsonb, jsonb, jsonb), public.update_my_profile(jsonb),
  public.set_my_photo(text), public.update_my_settings(text), public.request_account_deletion(),
  public.keep_my_account(), public.save_document(text, text, text),
  public.set_availability(date[], text, time, time)
  from public, anon, authenticated;
grant execute on function public.create_my_profile(text, jsonb, jsonb, jsonb), public.update_my_profile(jsonb),
  public.set_my_photo(text), public.update_my_settings(text), public.request_account_deletion(),
  public.keep_my_account(), public.save_document(text, text, text),
  public.set_availability(date[], text, time, time)
  to authenticated;
