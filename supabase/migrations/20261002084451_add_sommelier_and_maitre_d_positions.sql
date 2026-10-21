-- Additive: allow Sommelier and Maître d’ alongside the existing 15 positions.
-- Must match lib/roles.ts exactly.
alter table public.talent_profiles drop constraint talent_profiles_positions_check;
alter table public.talent_profiles add constraint talent_profiles_positions_check check (
  positions <@ array[
    'Demi CDP', 'CDP', 'Senior CDP', 'Junior Sous', 'Sous Chef', 'Head Chef', 'Executive Chef',
    'Pastry Chef',
    'Bartender', 'Mixologist',
    'Sommelier',
    'Maître d’', 'Restaurant Manager', 'Supervisor', 'Section Waiter', 'Waiter', 'Host'
  ]::text[]
);