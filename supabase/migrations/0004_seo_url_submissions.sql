-- =============================================================================
-- KT Appliances — search-engine submission ledger
--
-- Run against a Supabase project:
--   supabase db push
-- or paste into the SQL editor. Safe to run more than once.
--
-- WHY THIS EXISTS
--
-- `/api/cron/search-indexing` announces changed URLs to IndexNow (Bing, Yandex,
-- Seznam, Naver — not Google, which does not use the protocol). "Changed since
-- the last run" needs somewhere to keep what was last announced and with which
-- content timestamp, and the two alternatives are both wrong:
--
--   * resubmit the whole sitemap every run — the artificial churn the whole
--     freshness design is built to avoid, and a good way to get throttled;
--   * keep the cursor in process memory — lost on every cold start, which on
--     serverless means most runs.
--
-- So it is persisted here, one row per URL, upserted when a submission is
-- accepted. A failed submission writes nothing, which is what makes the retry
-- behaviour fall out for free: the URL simply stays pending.
--
-- ADDITIVE AND IDEMPOTENT. It creates one table and touches nothing that already
-- exists. Dropping it costs only the submission history — the cron detects the
-- missing ledger and reports `persisted: false` rather than failing.
--
-- SECURITY MODEL matches `leads` and `appointments` exactly: RLS enabled with no
-- policies, table privileges revoked from the browser-facing roles, and all
-- access through the service-role key from `server-only` modules. There is
-- nothing sensitive in here — it is a list of public URLs — but a table the anon
-- key can write to is a table that can be filled with junk, and consistency in
-- the security model is worth more than an exception for a low-value table.
-- =============================================================================

create table if not exists public.seo_url_submissions (
  -- The URL is the identity. One row per URL, upserted on re-announcement, so
  -- the table stays the size of the site rather than growing per run.
  url                text primary key,

  -- The content timestamp that was current when this URL was submitted. The
  -- comparison against a candidate's current stamp is the entire "has this
  -- actually changed?" decision.
  content_updated_at timestamptz not null,

  submitted_at       timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

-- Supports "what did we announce recently", which is how a human answers
-- "why hasn't Bing picked this up" without reading the whole table.
create index if not exists seo_url_submissions_submitted_idx
  on public.seo_url_submissions (submitted_at desc);

-- ---------------------------------------------------------------------------
-- Security
-- ---------------------------------------------------------------------------

alter table public.seo_url_submissions enable row level security;

-- RLS is on with no policies, so anon and authenticated can do nothing at all;
-- the grants below are the belt to that braces. service_role bypasses RLS, which
-- is how the cron reaches it.
revoke all on public.seo_url_submissions from anon, authenticated;
grant select, insert, update, delete on public.seo_url_submissions to service_role;
