-- profile-photos: talent + venue profile photos, shown throughout the browsing UI.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
);

-- verification-documents: Right to Work, Food Safety Certificate, CV.
-- Private — no public read. No storage.objects policies added yet since
-- there's no auth to scope them to; access goes through the app/service
-- role until real accounts exist.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-documents',
  'verification-documents',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'application/pdf']
);
