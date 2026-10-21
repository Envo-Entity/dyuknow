-- Dyuknow app backend, step 33 (Agent B): fix private.profile_missing_fields.
-- "text[] || 'literal'" read the literal as an array; use array_append.

create or replace function private.profile_missing_fields(p_member uuid)
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
    if nullif(btrim(t.full_name), '') is null then missing := array_append(missing, 'full name'); end if;
    if nullif(btrim(t.home_postcode), '') is null then missing := array_append(missing, 'home postcode'); end if;
    if coalesce(cardinality(t.positions), 0) = 0 then missing := array_append(missing, 'a position'); end if;
    if nullif(btrim(t.mobile_number), '') is null then missing := array_append(missing, 'mobile number'); end if;
    if not (coalesce(t.agreed_turn_up_on_time, false) and coalesce(t.agreed_treat_venues_with_respect, false)
            and coalesce(t.agreed_give_notice_if_cancelling, false) and coalesce(t.agreed_represent_professionally, false)) then
      missing := array_append(missing, 'the four agreements');
    end if;
  elsif v_side = 'venue' then
    select * into v from public.venues where member_id = p_member;
    if nullif(btrim(v.display_name), '') is null then missing := array_append(missing, 'name'); end if;
    if nullif(btrim(v.street_address), '') is null then missing := array_append(missing, 'street address'); end if;
    if nullif(btrim(v.postcode), '') is null then missing := array_append(missing, 'postcode'); end if;
    if nullif(btrim(v.contact_name), '') is null then missing := array_append(missing, 'contact name'); end if;
    if nullif(btrim(v.contact_phone), '') is null then missing := array_append(missing, 'contact phone'); end if;
    if not (coalesce(v.agreed_pay_fairly, false) and coalesce(v.agreed_treat_team_like_our_own, false)
            and coalesce(v.agreed_provide_clear_brief, false) and coalesce(v.agreed_rate_honestly, false)) then
      missing := array_append(missing, 'the four agreements');
    end if;
  end if;
  return missing;
end $$;
revoke all on function private.profile_missing_fields(uuid) from public, anon, authenticated;
