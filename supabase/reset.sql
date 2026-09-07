-- Wipes the legacy Bodega schema so 0001_schema.sql can be applied to the
-- existing Supabase project. Run once in the SQL editor, then `supabase db push`.
-- This destroys all data in the public schema.

drop schema public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant all on sequences to postgres, service_role;
alter default privileges in schema public grant all on functions to postgres, service_role;
