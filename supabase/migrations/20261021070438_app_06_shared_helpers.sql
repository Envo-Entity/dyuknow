-- Dyuknow app backend, step 6: helpers shared by every database function.

-- A London date and clock time as an exact instant. Refuses clock-change times.
create function private.london_instant(p_date date, p_time time)
returns timestamptz language plpgsql stable set search_path = '' as $$
declare x timestamptz := (p_date + p_time) at time zone 'Europe/London';
begin
  if (x at time zone 'Europe/London') <> (p_date + p_time) then
    raise exception 'That time doesn’t exist when the clocks go forward. Choose another.';
  end if;
  if ((x - interval '1 hour') at time zone 'Europe/London') = (p_date + p_time)
     or ((x + interval '1 hour') at time zone 'Europe/London') = (p_date + p_time) then
    raise exception 'That time happens twice when the clocks go back. Choose another.';
  end if;
  return x;
end $$;

-- London calendar date of an instant.
create function private.london_date(p timestamptz)
returns date language sql stable set search_path = '' as $$
  select (p at time zone 'Europe/London')::date;
$$;

-- The caller's members row, or a plain refusal. Used at the top of every function.
create function private.require_member()
returns public.members language plpgsql stable security definer set search_path = '' as $$
declare m public.members;
begin
  if auth.uid() is null then
    raise exception 'Sign in to continue.';
  end if;
  select * into m from public.members where user_id = auth.uid();
  if not found then
    raise exception 'Create your profile first.';
  end if;
  if m.deleted_at is not null then
    raise exception 'Sign in to continue.';
  end if;
  return m;
end $$;

-- Call receipts: a repeated tap returns the first result instead of acting twice.
-- receipt_begin returns the stored result when this tap already ran, or null
-- when the caller should go ahead. A concurrent tap with the same client_ref
-- waits on the primary key until the first finishes.
create function private.receipt_begin(p_member uuid, p_ref uuid, p_fn text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.call_receipts;
begin
  if p_ref is null then
    raise exception 'Couldn’t save. Try again.';
  end if;
  insert into public.call_receipts (member_id, client_ref, function_name)
  values (p_member, p_ref, p_fn)
  on conflict (member_id, client_ref) do nothing;
  if found then
    return null;
  end if;
  select * into r from public.call_receipts where member_id = p_member and client_ref = p_ref;
  if r.function_name <> p_fn then
    raise exception 'Couldn’t save. Try again.';
  end if;
  return coalesce(r.result, 'null'::jsonb);
end $$;

create function private.receipt_end(p_member uuid, p_ref uuid, p_result jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  update public.call_receipts set result = p_result where member_id = p_member and client_ref = p_ref;
  return p_result;
end $$;

revoke all on function private.london_instant(date, time), private.london_date(timestamptz),
  private.require_member(), private.receipt_begin(uuid, uuid, text), private.receipt_end(uuid, uuid, jsonb)
  from public, anon, authenticated;
