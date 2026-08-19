-- =============================================================================
-- KT Appliances — ad click attribution on leads, plus database hardening
--
-- Run against a Supabase project:
--   supabase db push
-- or paste into the SQL editor. Safe to run more than once.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- leads.click_id — the `gclid` / `fbclid` carried by an inbound ad click.
--
-- WHY IT IS A COLUMN AND NOT JUST A UTM
--
-- The UTM parameters say which campaign a visitor came from. The click id says
-- which *click* — and that is the only key Google Ads accepts when importing
-- offline conversions. Without it, the account can see that a campaign got
-- clicks and can see, separately, that the warehouse sold a refrigerator, but it
-- can never join the two, so smart bidding optimises against form fills it
-- cannot verify. This site is going to be advertised, so the join matters.
--
-- Captured client-side by `captureAttribution()` and written by `recordLead()`.
-- ---------------------------------------------------------------------------

alter table public.leads
  add column if not exists click_id text;

comment on column public.leads.click_id is
  'gclid / fbclid from the inbound ad click. Used to import offline conversions back into the ad platform.';

-- Only leads that actually came from a paid click carry one, so the index is
-- partial — it stays small and it answers the one question asked of it:
-- "which leads can I upload as conversions".
create index if not exists leads_click_id_idx
  on public.leads (created_at desc)
  where click_id is not null;

-- ---------------------------------------------------------------------------
-- Pin `search_path` on the trigger functions.
--
-- A `SECURITY DEFINER`-adjacent function with a mutable search_path can be made
-- to resolve an unqualified name against a schema the caller controls. These
-- three run on every write to `appliances`, `leads` and the notification ledger,
-- so they are exactly the functions worth pinning. Flagged by the Supabase
-- database linter (0011_function_search_path_mutable).
--
-- Bodies are unchanged from 0001 and 0003 — only the search_path is set.
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.sync_sold_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'sold' and (old.status is distinct from 'sold') then
    new.sold_at := coalesce(new.sold_at, now());
  elsif new.status <> 'sold' then
    new.sold_at := null;
  end if;
  return new;
end;
$$;

-- Looked up by name rather than by a written-out signature: its arguments are
-- enum types declared in 0003, so a hard-coded signature would drift the moment
-- one of them changed and silently skip the hardening.
do $$
declare
  target text;
begin
  for target in
    select format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'claim_appointment_notification'
  loop
    execute format('alter function %s set search_path = pg_catalog, public', target);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Take `rls_auto_enable()` off the public API surface.
--
-- It is an event-trigger helper, not an endpoint. PostgREST exposes anything in
-- `public` that the browser-facing roles can execute, which puts it on
-- `/rest/v1/rpc/rls_auto_enable` for anyone holding the anon key. Nothing good
-- comes of that being reachable; nothing in this application calls it.
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from anon, authenticated, public';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Verification. A silent no-op here would leave attribution broken in a way
-- nobody notices until the first month of ad spend is already gone.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leads' and column_name = 'click_id'
  ) then
    raise exception 'leads.click_id was not created';
  end if;

  if has_table_privilege('anon', 'public.leads', 'select') then
    raise exception 'anon can select public.leads — customer data would be exposed';
  end if;
end $$;
