-- =============================================================================
-- KT Appliances — explicit API role grants
--
-- Run against a Supabase project:
--   supabase db push
-- or paste into the SQL editor. Safe to run more than once.
--
-- WHY THIS EXISTS
--
-- 0001 enabled Row Level Security and wrote the row policies, but issued no
-- GRANT statements — it relied on the default privileges Supabase normally
-- applies to tables created in `public`. When those defaults are not in effect
-- (tables created by a role outside the default-privileges setup, a restored or
-- branched project, or privileges revoked at some point), PostgreSQL rejects the
-- query before RLS is ever consulted and PostgREST surfaces:
--
--   permission denied for table appliances
--   permission denied for table leads
--
-- That is a *table privilege* failure, not a policy failure: RLS with no
-- matching policy returns zero rows, it does not raise. Granting explicitly here
-- makes the schema self-sufficient instead of dependent on project defaults.
--
-- THIS DOES NOT WIDEN ACCESS
--
-- The grants below restate exactly the model 0001 documented, and RLS still
-- decides which rows each role sees:
--   * anon / authenticated  — SELECT on appliances and appliance_images only,
--     still filtered by the 0001 policies to published, non-draft rows.
--   * anon / authenticated  — no access whatsoever to leads.
--   * service_role          — full DML, used only by server-only code holding
--     SUPABASE_SERVICE_ROLE_KEY.
-- =============================================================================

-- Schema access. Without USAGE the role cannot reach any object in the schema,
-- whatever table grants it holds.
grant usage on schema public to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Public catalogue: readable, row-filtered by the policies in 0001.
-- ---------------------------------------------------------------------------
grant select on public.appliances       to anon, authenticated;
grant select on public.appliance_images to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Customer data: closed to the browser-facing roles.
--
-- 0001 left `leads` with RLS on and no policies, which already yields zero rows.
-- Revoking the table privileges as well means a future policy added by mistake
-- cannot silently open customer contact details to a leaked anon key.
-- ---------------------------------------------------------------------------
revoke all on public.leads from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Trusted server role. Bypasses RLS by design; reachable only from server-only
-- code holding the service-role secret.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.appliances       to service_role;
grant select, insert, update, delete on public.appliance_images to service_role;
grant select, insert, update, delete on public.leads            to service_role;

-- ---------------------------------------------------------------------------
-- Keep future tables consistent, so a later migration cannot reintroduce the
-- same failure. Applies to objects created by `postgres`, which is the role the
-- SQL editor and `supabase db push` run as.
-- ---------------------------------------------------------------------------
alter default privileges in schema public
  grant select on tables to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

-- ---------------------------------------------------------------------------
-- Verification. Raises if the catalogue is still unreadable by the public role
-- or if leads is reachable by it, so a bad run fails loudly instead of leaving
-- the site broken in the same way that produced this migration.
-- ---------------------------------------------------------------------------
do $$
begin
  if not has_table_privilege('anon', 'public.appliances', 'select') then
    raise exception 'anon still cannot select public.appliances';
  end if;

  if not has_table_privilege('service_role', 'public.leads', 'select') then
    raise exception 'service_role still cannot select public.leads';
  end if;

  if has_table_privilege('anon', 'public.leads', 'select') then
    raise exception 'anon can select public.leads — customer data would be exposed';
  end if;
end $$;
