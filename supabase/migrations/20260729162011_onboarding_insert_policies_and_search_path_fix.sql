-- Fix flagged advisor warning: mutable search_path on the trigger function.
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- There's still no auth. These policies let the onboarding form submit a
-- new row with the public/anon key, but grant nothing else — no reading,
-- editing, or deleting existing rows via the client key. That's a
-- deliberate one-way "submit" shape, not a relaxation of the earlier
-- deny-all default.
create policy "anyone can submit a talent onboarding entry"
  on talent_profiles for insert
  to anon, authenticated
  with check (user_id is null);

create policy "anyone can submit a venue onboarding entry"
  on venue_profiles for insert
  to anon, authenticated
  with check (user_id is null);

-- Same reasoning for the two storage buckets: uploads allowed from the
-- public key, no read/list/delete policy added.
create policy "anyone can upload a profile photo"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'profile-photos');

create policy "anyone can upload a verification document"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'verification-documents');
