ALTER TABLE public.venue_profiles
  ADD COLUMN average_team_vacancies_per_week integer CHECK (average_team_vacancies_per_week >= 0);