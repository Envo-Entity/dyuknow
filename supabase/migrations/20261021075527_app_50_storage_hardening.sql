-- Security review fixes for the app's two buckets.
-- 1. File-count caps hold even when many uploads arrive at once: a trigger
--    locks the login's folder, then counts.
-- 2. Storage helpers answer only about the caller, never an id passed in.

create function private.enforce_folder_cap()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_folder text := (storage.foldername(new.name))[1]; v_cap integer; v_count integer;
begin
  if new.bucket_id = 'member-photos' then v_cap := 2;
  elsif new.bucket_id = 'member-documents' then v_cap := 10;
  else return new;
  end if;
  if new.name like '%..%' then
    raise exception 'That upload didn’t finish. Add the file again.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.bucket_id || '/' || coalesce(v_folder, ''), 0));
  select count(*) into v_count from storage.objects
   where bucket_id = new.bucket_id and (storage.foldername(name))[1] = v_folder and name <> new.name;
  if v_count >= v_cap then
    raise exception 'You can keep at most % files here. Remove one first.', v_cap;
  end if;
  return new;
end $$;
revoke all on function private.enforce_folder_cap() from public, anon, authenticated;
create trigger app_bucket_folder_cap before insert on storage.objects
  for each row execute function private.enforce_folder_cap();

-- Caller-only versions of the storage helpers.
create function private.my_folder_file_count(p_bucket text)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from storage.objects
  where bucket_id = p_bucket and (storage.foldername(name))[1] = auth.uid()::text;
$$;
create function private.my_path_in_use(p_bucket text, p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (storage.foldername(p_path))[1] = auth.uid()::text and case p_bucket
    when 'member-photos' then exists (select 1 from public.talents where photo_path = p_path)
                           or exists (select 1 from public.venues where photo_path = p_path)
    when 'member-documents' then exists (select 1 from public.documents where storage_path = p_path)
    else false end;
$$;
revoke all on function private.my_folder_file_count(text), private.my_path_in_use(text, text) from public, anon;
grant execute on function private.my_folder_file_count(text), private.my_path_in_use(text, text) to authenticated;

drop policy member_photos_insert on storage.objects;
drop policy member_photos_delete_own on storage.objects;
drop policy member_documents_insert on storage.objects;
drop policy member_documents_delete_own on storage.objects;

create policy member_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'member-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.caller_has_member())
    and private.my_folder_file_count('member-photos') < 2);
create policy member_photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'member-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
    and not private.my_path_in_use('member-photos', name));
create policy member_documents_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'member-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.my_folder_file_count('member-documents') < 10);
create policy member_documents_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'member-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
    and not private.my_path_in_use('member-documents', name));

drop function private.folder_file_count(text, uuid);
drop function private.storage_path_in_use(text, text);
