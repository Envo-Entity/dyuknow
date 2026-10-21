-- Dyuknow app backend, step 32 (Agent B): am_i_admin, admin_review_document
-- and the four admin lists. Specified in 05-booking-engine.md → Admin and
-- 02-who-can-see-what.md → Functions that only read.

-- ---------------------------------------------------------------------------
-- am_i_admin
-- ---------------------------------------------------------------------------
create function public.am_i_admin()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('is_admin', coalesce(private.is_admin(), false));
$$;

-- ---------------------------------------------------------------------------
-- admin_review_document
-- ---------------------------------------------------------------------------
create function public.admin_review_document(p_document_id uuid, p_verdict text, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  d public.documents;
  dt public.document_types;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  t timestamptz;
begin
  if not private.is_admin() then
    raise exception 'Only Dyuknow can do this.';
  end if;
  select * into d from public.documents where id = p_document_id for update;
  if not found then
    raise exception 'That document can’t be found.';
  end if;
  if p_verdict is null or p_verdict not in ('verified','rejected') then
    raise exception 'Check your answers and try again.';
  end if;
  if p_verdict = 'rejected' and v_reason is null then
    raise exception 'Add a reason.';
  end if;
  if p_verdict = 'rejected' and char_length(v_reason) > 500 then
    raise exception 'Check your answers and try again.';
  end if;
  t := clock_timestamp();

  if d.status = p_verdict and (p_verdict = 'verified' or d.reject_reason is not distinct from v_reason) then
    return '{}'::jsonb;
  end if;

  update public.documents
     set status = p_verdict, reviewed_at = t, reviewed_by = auth.uid(),
         reject_reason = case when p_verdict = 'rejected' then v_reason end
   where id = d.id;

  insert into public.admin_actions (admin_user_id, action, member_id, document_id, note, created_at)
  values (auth.uid(), case p_verdict when 'verified' then 'verify-document' else 'reject-document' end,
          d.member_id, d.id, case when p_verdict = 'rejected' then v_reason end, t);

  select * into dt from public.document_types where code = d.doc_type;
  if p_verdict = 'verified' then
    perform private.notify(d.member_id, 'document-verified', dt.label || ' verified',
      case when dt.public_tick then 'It now shows on your profile.' else 'Dyuknow has checked it.' end,
      'account');
  else
    perform private.notify(d.member_id, 'document-rejected', dt.label || ' not accepted',
      regexp_replace(v_reason, '\.+$', '') || '. Upload a new one.',
      'account');
  end if;
  return '{}'::jsonb;
end $$;

-- ---------------------------------------------------------------------------
-- admin_list_members(status: waiting, approved, deletion-requested or all)
-- ---------------------------------------------------------------------------
create function public.admin_list_members(p_status text default 'all')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_status text := coalesce(p_status, 'all');
  v jsonb;
begin
  if not private.is_admin() then
    raise exception 'Only Dyuknow can do this.';
  end if;
  if v_status not in ('waiting','approved','deletion-requested','all') then
    raise exception 'Check your answers and try again.';
  end if;
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.sort_key), '[]'::jsonb) into v
  from (
    select m.id as member_id, m.side,
           coalesce(t.full_name, vn.display_name) as name,
           u.email,
           m.approved,
           private.profile_missing_fields(m.id) as missing,
           m.created_at, m.approved_at, m.deletion_requested_at, m.deleted_at,
           case when v_status = 'waiting' then extract(epoch from m.created_at)
                else -extract(epoch from m.created_at) end as sort_key
    from public.members m
    left join auth.users u on u.id = m.user_id
    left join public.talents t on t.member_id = m.id
    left join public.venues vn on vn.member_id = m.id
    where case v_status
            when 'waiting' then not m.approved and m.deleted_at is null
            when 'approved' then m.approved and m.deleted_at is null
            when 'deletion-requested' then m.deletion_requested_at is not null and m.deleted_at is null
            else true end
    order by sort_key
    limit 200
  ) x;
  return (select coalesce(jsonb_agg(e - 'sort_key'), '[]'::jsonb) from jsonb_array_elements(v) e);
end $$;

-- ---------------------------------------------------------------------------
-- admin_get_member
-- ---------------------------------------------------------------------------
create function public.admin_get_member(p_member_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  m public.members;
begin
  if not private.is_admin() then
    raise exception 'Only Dyuknow can do this.';
  end if;
  select * into m from public.members where id = p_member_id;
  if not found then
    raise exception 'That member can’t be found.';
  end if;
  return jsonb_build_object(
    'member', to_jsonb(m),
    'email', (select u.email from auth.users u where u.id = m.user_id),
    'profile', case m.side
                 when 'talent' then (select to_jsonb(t) from public.talents t where t.member_id = m.id)
                 else (select to_jsonb(v) from public.venues v where v.member_id = m.id) end,
    'missing', to_jsonb(private.profile_missing_fields(m.id)),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
               'document_id', d.id, 'doc_type', d.doc_type, 'label', dt.label,
               'storage_path', d.storage_path, 'original_filename', d.original_filename,
               'content_type', d.content_type, 'size_bytes', d.size_bytes, 'status', d.status,
               'uploaded_at', d.uploaded_at, 'reviewed_at', d.reviewed_at, 'reject_reason', d.reject_reason)
             order by dt.sort_order)
      from public.documents d join public.document_types dt on dt.code = d.doc_type
      where d.member_id = m.id), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------
-- admin_list_documents(status: review (default), verified, rejected or all)
-- ---------------------------------------------------------------------------
create function public.admin_list_documents(p_status text default 'review')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_status text := coalesce(p_status, 'review');
begin
  if not private.is_admin() then
    raise exception 'Only Dyuknow can do this.';
  end if;
  if v_status not in ('review','verified','rejected','all') then
    raise exception 'Check your answers and try again.';
  end if;
  return (
    select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.uploaded_at, x.document_id), '[]'::jsonb)
    from (
      select d.id as document_id, d.member_id, m.side,
             coalesce(t.full_name, vn.display_name) as member_name,
             d.doc_type, dt.label, d.original_filename, d.storage_path, d.content_type, d.size_bytes,
             d.status, d.uploaded_at, d.reject_reason
      from public.documents d
      join public.document_types dt on dt.code = d.doc_type
      join public.members m on m.id = d.member_id
      left join public.talents t on t.member_id = m.id
      left join public.venues vn on vn.member_id = m.id
      where v_status = 'all' or d.status = v_status
      order by d.uploaded_at, d.id
      limit 200
    ) x);
end $$;

-- ---------------------------------------------------------------------------
-- admin_list_stale_logins: logins with no members row, older than N days.
-- Admin logins are left out.
-- ---------------------------------------------------------------------------
create function public.admin_list_stale_logins(p_older_than_days int default 7)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_days integer := coalesce(p_older_than_days, 7);
begin
  if not private.is_admin() then
    raise exception 'Only Dyuknow can do this.';
  end if;
  if v_days < 0 or v_days > 3650 then
    raise exception 'Check your answers and try again.';
  end if;
  return (
    select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.created_at, x.user_id), '[]'::jsonb)
    from (
      select u.id as user_id, u.email, u.created_at, u.last_sign_in_at
      from auth.users u
      where u.created_at < clock_timestamp() - make_interval(days => v_days)
        and not exists (select 1 from public.members m where m.user_id = u.id)
        and not exists (select 1 from public.admins a where a.user_id = u.id)
      order by u.created_at, u.id
      limit 200
    ) x);
end $$;

revoke all on function public.am_i_admin(), public.admin_review_document(uuid, text, text),
  public.admin_list_members(text), public.admin_get_member(uuid), public.admin_list_documents(text),
  public.admin_list_stale_logins(int)
  from public, anon, authenticated;
grant execute on function public.am_i_admin(), public.admin_review_document(uuid, text, text),
  public.admin_list_members(text), public.admin_get_member(uuid), public.admin_list_documents(text),
  public.admin_list_stale_logins(int)
  to authenticated;
