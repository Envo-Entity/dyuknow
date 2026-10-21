-- Restrict talent category to Chef / Front of House only
ALTER TABLE public.talent_profiles DROP CONSTRAINT talent_profiles_category_check;
ALTER TABLE public.talent_profiles ADD CONSTRAINT talent_profiles_category_check
  CHECK (category = ANY (ARRAY['Chef'::text, 'Front of House'::text]));

-- Position becomes multi-select: rename position -> positions, text -> text[]
ALTER TABLE public.talent_profiles RENAME COLUMN position TO positions;
ALTER TABLE public.talent_profiles
  ALTER COLUMN positions TYPE text[]
  USING (CASE WHEN positions IS NULL THEN NULL ELSE ARRAY[positions] END);

ALTER TABLE public.talent_profiles ADD CONSTRAINT talent_profiles_positions_check
  CHECK (positions <@ ARRAY[
    'Demi CDP'::text, 'CDP'::text, 'Senior CDP'::text, 'Junior Sous'::text,
    'Sous Chef'::text, 'Head Chef'::text, 'Executive Chef'::text, 'Pastry Chef'::text,
    'Waiter'::text, 'Section Waiter'::text, 'Supervisor'::text, 'Restaurant Manager'::text,
    'Bartender'::text, 'Host'::text, 'Mixologist'::text
  ]);