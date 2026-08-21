-- =============================================================================
-- KT Appliances — appointment slot locking, booking purpose, chat attribution
--
-- Run against a Supabase project:
--   supabase db push
-- or paste into the SQL editor. Safe to run more than once.
--
-- WHY THIS EXISTS
--
-- 0003 created `appointments` and made a *submission* idempotent: the same form
-- posted twice resolves to one booking. It said nothing about two different
-- customers choosing the same slot, because until now the only way to book was a
-- form that showed every slot as bookable and let the owner sort it out.
--
-- The website chat assistant books directly from a slot picker, which turns that
-- into a real race: two visitors can both be shown 1:30 PM as free and both
-- submit. Checking "is this slot taken" in application code before inserting
-- does not fix it — both checks pass before either insert lands. The only place
-- the answer can be authoritative is the database.
--
-- So this migration adds:
--
--   1. A partial unique index on `scheduled_for` over the statuses that actually
--      occupy the warehouse. One active booking per slot; a canceled or no-show
--      appointment releases its slot for someone else.
--   2. `purpose`, a free-text refinement of `service_type`. The chat offers a
--      finer menu than the six service-type enum values ("financing discussion",
--      "view this appliance"), and a text column carries that without an enum
--      change — `ALTER TYPE ... ADD VALUE` has transaction rules that make it a
--      poor fit for a migration file, and the value is descriptive, not
--      something a query branches on.
--   3. `appliance_slug`, so an appointment booked against a listing can be
--      linked back to it after the appliance row is gone. `appliance_id` already
--      exists and is a real foreign key; the slug is the denormalised copy, the
--      same trade-off `appliance_label` already makes.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------

alter table public.appointments
  add column if not exists purpose text;

alter table public.appointments
  add column if not exists appliance_slug text;

comment on column public.appointments.purpose is
  'Finer-grained booking reason chosen in the chat assistant, e.g. "view-appliance". Descriptive only; service_type remains the operational classification.';

-- ---------------------------------------------------------------------------
-- 2. One active booking per slot
--
-- `confirmed` and `rescheduled` are the statuses that mean somebody is expected
-- at the warehouse. `completed` is deliberately included: a completed visit
-- occupied that slot, and while a past slot is unbookable anyway (the schema
-- rejects times in the past), leaving it out would let a back-dated correction
-- collide with history.
--
-- `canceled` and `no-show` are excluded, which is the whole point of a partial
-- index here: cancelling an appointment has to hand the slot back.
-- ---------------------------------------------------------------------------

-- Fail loudly, and usefully, if the table already holds a collision. Creating
-- the index would fail anyway; this says *which* slots so the owner can fix them
-- in the admin rather than reading a constraint name.
do $$
declare
  v_conflicts text;
begin
  select string_agg(to_char(scheduled_for at time zone 'America/New_York',
                            'YYYY-MM-DD HH24:MI') || ' (' || n || ' bookings)', ', ')
    into v_conflicts
  from (
    select scheduled_for, count(*) as n
    from public.appointments
    where status in ('confirmed', 'rescheduled', 'completed')
    group by scheduled_for
    having count(*) > 1
  ) duplicates;

  if v_conflicts is not null then
    raise exception
      'Cannot enforce one appointment per slot: these slots already hold more than one active booking — %. Cancel or reschedule the extras in /admin/appointments, then re-run this migration.',
      v_conflicts;
  end if;
end $$;

create unique index if not exists appointments_active_slot_idx
  on public.appointments (scheduled_for)
  where status in ('confirmed', 'rescheduled', 'completed');

comment on index public.appointments_active_slot_idx is
  'Prevents double booking. Partial so a canceled or no-show appointment releases its slot.';

-- Availability lookups scan one day at a time and only care about live bookings.
create index if not exists appointments_slot_lookup_idx
  on public.appointments (scheduled_for)
  where status in ('confirmed', 'rescheduled');

-- ---------------------------------------------------------------------------
-- 3. Verification
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'appointments_active_slot_idx'
  ) then
    raise exception 'appointments_active_slot_idx is missing — double bookings would be possible';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments' and column_name = 'purpose'
  ) then
    raise exception 'appointments.purpose is missing';
  end if;

  -- The privilege model from 0003 must survive: these columns carry customer
  -- intent, and the table is still service-role only.
  if has_table_privilege('anon', 'public.appointments', 'select') then
    raise exception 'anon can select public.appointments — customer data would be exposed';
  end if;
end $$;
