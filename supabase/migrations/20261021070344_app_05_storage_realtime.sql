-- Dyuknow app backend, step 5: the app's own buckets, live updates.
-- The onboarding buckets (profile-photos, verification-documents) are untouched.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('member-photos', 'member-photos', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('member-documents', 'member-documents', false, 10485760, array['image/jpeg','image/png','application/pdf']);

-- How many files a login already has in its folder of a bucket.
create function private.folder_file_count(p_bucket text, p_user uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from storage.objects
  where bucket_id = p_bucket and (storage.foldername(name))[1] = p_user::text;
$$;
-- Whether a path is in use by a profile photo or a document row.
create function private.storage_path_in_use(p_bucket text, p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case p_bucket
    when 'member-photos' then exists (select 1 from public.talents where photo_path = p_path)
                           or exists (select 1 from public.venues where photo_path = p_path)
    when 'member-documents' then exists (select 1 from public.documents where storage_path = p_path)
    else false end;
$$;
create function private.caller_has_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where user_id = auth.uid() and deleted_at is null);
$$;
revoke all on function private.folder_file_count(text, uuid), private.storage_path_in_use(text, text),
  private.caller_has_member() from public, anon;
grant execute on function private.folder_file_count(text, uuid), private.storage_path_in_use(text, text),
  private.caller_has_member() to authenticated;

-- member-photos (public to view by exact link; nobody can list others')
create policy member_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'member-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.caller_has_member())
    and private.folder_file_count('member-photos', (select auth.uid())) < 2);
create policy member_photos_select_own on storage.objects for select to authenticated
  using (bucket_id = 'member-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy member_photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'member-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
    and not private.storage_path_in_use('member-photos', name));

-- member-documents (private: owner and admins only)
create policy member_documents_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'member-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.folder_file_count('member-documents', (select auth.uid())) < 10);
create policy member_documents_select on storage.objects for select to authenticated
  using (bucket_id = 'member-documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin())));
create policy member_documents_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'member-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
    and not private.storage_path_in_use('member-documents', name));

-- Live updates: inserts and updates only, never deletes.
alter publication supabase_realtime add table public.notifications, public.messages, public.conversation_reads;
alter publication supabase_realtime set (publish = 'insert, update');
