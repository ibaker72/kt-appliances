# Runbook — "Could not find the table 'public.appointments' in the schema cache"

Audit date: 2026-08-18. Target: Supabase project `kt-appliances` (`dsznxzuxtmmwaqocqcfv`).

## Diagnosis

Production is at migration **0002**. Migration **0003** was never applied, so
`public.appointments` and `public.appointment_notifications` do not exist.

`PGRST205 — Could not find the table … in the schema cache` is PostgREST saying
the table is absent from the database, not that its cache is stale. Reloading
the cache against a database that has no `appointments` table changes nothing.

Observed production state:

| Object | Source | Present |
|---|---|---|
| `pgcrypto`, 6 enums, `touch_updated_at()`, `sync_sold_at()` | 0001 | yes |
| `appliances`, `appliance_images`, `leads` (+ indexes, triggers, policies) | 0001 | yes |
| `appliance-images` storage bucket + read policy | 0001 | yes |
| Role grants, `alter default privileges` | 0002 | yes |
| 5 appointment enums, `appointments`, `appointment_notifications`, `claim_appointment_notification()` | 0003 | **no** |

`supabase_migrations.schema_migrations` does not exist, which is why the drift
went unnoticed: 0001 and 0002 were pasted into the SQL Editor, so the CLI has no
record that anything was ever applied.

## Fix

Run [`supabase/repair/2026-08-18_appointments_schema_repair.sql`](../../supabase/repair/2026-08-18_appointments_schema_repair.sql)
in the SQL Editor of project `dsznxzuxtmmwaqocqcfv`:

<https://supabase.com/dashboard/project/dsznxzuxtmmwaqocqcfv/sql/new>

Section 2 of that file is a verbatim copy of `supabase/migrations/0003_appointments.sql`.
Nothing in the script drops, deletes, truncates or alters an existing column.

## Do not run the CREATE TABLE half on its own

Migration 0002 left this in force, and it is live in production today:

```sql
alter default privileges in schema public grant select on tables to anon, authenticated;
```

Any new table created by `postgres` in `public` is therefore granted `SELECT` to
`anon` the instant it exists. Verified on a scratch database seeded from 0001+0002:

```
create table public.appointments_demo (...);
-- has_table_privilege('anon','public.appointments_demo','select') => true
```

The `REVOKE ALL … FROM anon, authenticated` statements in 0003 are what close
that hole. Without them, customer phone numbers, SMS consent flags and the stored
consent disclosure text are readable by anyone holding the publishable anon key.
Run the script whole.

## Verification performed

The script was applied to a throwaway PostgreSQL 16 instance seeded with the
Supabase roles (`anon`, `authenticated`, `service_role BYPASSRLS`) and migrations
0001 + 0002, reproducing production's privilege matrix exactly. Results:

- Runs clean; exit 0. Re-running twice more is a no-op (exit 0, no errors),
  both as one transaction and statement-by-statement.
- Final privileges: `appliances`/`appliance_images` → anon+authenticated `SELECT`;
  `leads`/`appointments`/`appointment_notifications` → anon+authenticated none;
  `service_role` → full CRUD on all five. RLS enabled on all five.
- `anon` is refused on `appointments`, `appointment_notifications` and
  `claim_appointment_notification()`, and still reads `appliances`.
- Behavioural checks: duplicate `submission_token` rejected (23505); the
  `^[0-9]{10}$` phone constraint and the consent-needs-a-timestamp constraint both
  fire; `claim_appointment_notification` returns an id on first call and `NULL` on
  the second (the duplicate-SMS guard); a row left `failed` is re-claimable and
  increments `attempts`.

## No redeploy required

The fix is entirely database-side; no application code changes. Supabase ships an
enabled `pgrst_ddl_watch` event trigger on `ddl_command_end`, which issues
`NOTIFY pgrst, 'reload schema'` — so PostgREST picks up the new tables within a
second or two of the script committing. Just reload `/admin/appointments`.

If the error somehow persists, nudge the cache directly rather than redeploying:

```sql
notify pgrst, 'reload schema';
```

**Do not "redeploy from `main`" to fix this.** `origin/main` contains only the
initial commit — the application, including the appointments feature, lives on
feature branches. Deploying `main` would take the site down rather than repair it.

## Optional: stop the drift recurring

Section 4 of the script creates `supabase_migrations.schema_migrations` and records
0001–0003 as applied, so a future `supabase db push` does not replay all three from
the top. Skip it if the database will continue to be managed only through the SQL
Editor.
