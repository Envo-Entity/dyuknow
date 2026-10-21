create policy "temp cleanup delete profile photos"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'profile-photos');