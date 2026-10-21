create policy "temp cleanup select profile photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'profile-photos');