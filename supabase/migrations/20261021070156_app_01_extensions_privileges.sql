-- Dyuknow app backend, step 1: extensions, default rights and the private schema.
-- The onboarding archive (talent_profiles, venue_profiles, their buckets and
-- functions) is not touched by this or any later app migration.

create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_cron;

-- New tables and functions start closed. Each app migration grants exactly
-- what it needs. Existing objects keep their current rights.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
alter default privileges for role postgres
  revoke execute on functions from public;

-- Internal steps live here; the API never exposes this schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
