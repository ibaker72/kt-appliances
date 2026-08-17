-- =============================================================================
-- KT Appliances — appointments and appointment SMS notifications
--
-- Run against a Supabase project:
--   supabase db push
-- or paste into the SQL editor. Safe to run more than once.
--
-- WHY THIS EXISTS
--
-- Until now every website enquiry was a `lead`: a request for a callback with no
-- time attached. Booking a warehouse visit, a delivery window or an after-hours
-- appointment was done by texting the owner, so nothing was recorded and nothing
-- could be automated.
--
-- This migration adds the two tables the appointment SMS automation needs:
--
--   appointments               — the booking itself, including SMS consent and
--                                enough of a record to prove that consent later.
--   appointment_notifications  — one row per (appointment, event) message, which
--                                is what makes the automation idempotent: a
--                                unique constraint, not application memory, is
--                                what stops a double-submitted form or a retried
--                                server action from texting a customer twice.
--
-- Security model matches `leads` exactly: RLS on with no policies, table
-- privileges revoked from the browser-facing roles, and all access through the
-- service-role key from `server-only` modules. Customer phone numbers and
-- consent records are never reachable with a leaked anon key.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type appointment_service_type as enum (
    'warehouse-visit', 'after-hours-visit', 'delivery', 'installation',
    'pickup', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum (
    'confirmed', 'rescheduled', 'completed', 'canceled', 'no-show'
  );
exception when duplicate_object then null; end $$;

-- One value per message the automation can send. `customer_confirmation` and
-- `owner_notification` fire today; the rest are the future workflows the
-- notification service is already structured for, and exist here so adding a
-- reminder later is a scheduler change rather than another migration.
do $$ begin
  create type appointment_notification_event as enum (
    'customer_confirmation', 'owner_notification',
    'reminder_24h', 'reminder_2h',
    'rescheduled', 'canceled', 'followup', 'review_request'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_notification_recipient as enum ('customer', 'owner');
exception when duplicate_object then null; end $$;

-- `skipped` is a first-class outcome, not an error: consent withheld, SMS
-- disabled while A2P is pending, or no owner number configured all land here,
-- and the admin needs to tell them apart from a genuine delivery failure.
do $$ begin
  create type appointment_notification_status as enum (
    'pending', 'sent', 'failed', 'skipped'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------

create table if not exists public.appointments (
  id             uuid primary key default gen_random_uuid(),

  name           text not null,
  -- Ten digits, no formatting — the same shape `leads.phone` stores, so both
  -- tables render and dial identically.
  phone          text not null,
  email          text,
  zip            text,

  service_type   appointment_service_type not null default 'warehouse-visit',
  -- The instant the appointment starts. Stored as timestamptz (UTC on the wire)
  -- with the wall-clock zone kept alongside it, so a message can always be
  -- rendered in the time the customer actually agreed to.
  scheduled_for  timestamptz not null,
  timezone       text not null default 'America/New_York',
  notes          text,

  appliance_id   uuid references public.appliances (id) on delete set null,
  -- Denormalised so an appointment stays readable after the appliance is gone.
  appliance_label text,

  -- --- SMS consent -------------------------------------------------------
  -- Captured by an unchecked checkbox on the booking form. Never inferred from
  -- the presence of a phone number: a customer gives us a number so we can call
  -- about this appointment, which is not consent to be texted.
  --
  -- `sms_consent_text` stores the exact disclosure that was on screen when the
  -- box was ticked. Carriers ask what the customer agreed to, not whether a
  -- boolean was true.
  sms_consent        boolean not null default false,
  sms_consent_at     timestamptz,
  sms_consent_source text,
  sms_consent_text   text,

  status         appointment_status not null default 'confirmed',

  -- Attribution, matching `leads` so both funnels report the same way.
  source         text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  utm_term       text,
  landing_page   text,
  referrer       text,
  form_location  text,

  -- Per-submission idempotency key minted by the browser when the form mounts.
  -- A double-click, a refreshed POST or a retried server action all carry the
  -- same token, so they resolve to the one appointment instead of creating a
  -- second booking (and a second pair of texts).
  submission_token text unique,

  notes_internal text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint appointments_phone_is_ten_digits check (phone ~ '^[0-9]{10}$'),
  -- Consent must carry its timestamp, so a `true` with no provenance cannot be
  -- written by a future caller that forgot.
  constraint appointments_consent_has_timestamp
    check (sms_consent = false or sms_consent_at is not null)
);

create index if not exists appointments_scheduled_idx
  on public.appointments (scheduled_for);

-- Drives the admin's default view: what is coming up, soonest first.
create index if not exists appointments_upcoming_idx
  on public.appointments (scheduled_for)
  where status in ('confirmed', 'rescheduled');

create index if not exists appointments_created_idx
  on public.appointments (created_at desc);
create index if not exists appointments_status_idx
  on public.appointments (status, scheduled_for);
create index if not exists appointments_appliance_idx
  on public.appointments (appliance_id);

-- ---------------------------------------------------------------------------
-- appointment_notifications
--
-- The idempotency ledger and the delivery log in one table. Every outbound
-- appointment message claims its row *before* the provider is called, so a
-- crash between "claimed" and "sent" leaves evidence rather than a silent gap.
-- ---------------------------------------------------------------------------

create table if not exists public.appointment_notifications (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,

  event_type     appointment_notification_event not null,
  recipient_type appointment_notification_recipient not null,
  -- E.164. Kept because a delivery investigation needs to know the number that
  -- was actually dialled, which may differ from the number on the appointment
  -- today if it was later corrected.
  recipient_phone text,

  status         appointment_notification_status not null default 'pending',
  -- Twilio's message SID. Never any part of the credentials used to send.
  provider_message_sid text,
  provider       text not null default 'twilio',

  -- Why a message was skipped: 'consent-withheld', 'sms-disabled',
  -- 'no-owner-number', 'invalid-phone'. Plain text so a new reason does not
  -- need a migration.
  skip_reason    text,
  error_code     text,
  error_message  text,

  attempts       integer not null default 1,
  sent_at        timestamptz,
  failed_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- THE duplicate-protection guarantee. One message of each kind per appointment,
-- enforced by the database so it holds across concurrent requests, retries and
-- server instances — none of which share application memory.
create unique index if not exists appointment_notifications_once_idx
  on public.appointment_notifications (appointment_id, event_type);

create index if not exists appointment_notifications_appointment_idx
  on public.appointment_notifications (appointment_id, created_at);

create index if not exists appointment_notifications_failed_idx
  on public.appointment_notifications (status, created_at desc)
  where status = 'failed';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- `public.touch_updated_at()` is created by 0001.
drop trigger if exists appointments_touch_updated_at on public.appointments;
create trigger appointments_touch_updated_at
  before update on public.appointments
  for each row execute function public.touch_updated_at();

drop trigger if exists appointment_notifications_touch_updated_at
  on public.appointment_notifications;
create trigger appointment_notifications_touch_updated_at
  before update on public.appointment_notifications
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- claim_appointment_notification
--
-- Atomically reserves the right to send one message. Returns the row id when the
-- caller owns the send, or NULL when another request already owns it — which is
-- the whole duplicate-SMS defence, expressed as a single statement so two
-- concurrent bookings cannot both win.
--
-- A row previously left in `failed` is re-claimable: Twilio rejecting a request
-- means nothing was delivered, so retrying is safe. `pending`, `sent` and
-- `skipped` are not re-claimable — `pending` because a send may be in flight.
-- ---------------------------------------------------------------------------

create or replace function public.claim_appointment_notification(
  p_appointment_id  uuid,
  p_event_type      appointment_notification_event,
  p_recipient_type  appointment_notification_recipient,
  p_recipient_phone text
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.appointment_notifications as n
    (appointment_id, event_type, recipient_type, recipient_phone, status)
  values
    (p_appointment_id, p_event_type, p_recipient_type, p_recipient_phone, 'pending')
  on conflict (appointment_id, event_type) do update
    set status          = 'pending',
        recipient_type  = excluded.recipient_type,
        recipient_phone = excluded.recipient_phone,
        skip_reason     = null,
        error_code      = null,
        error_message   = null,
        failed_at       = null,
        attempts        = n.attempts + 1
    where n.status = 'failed'
  returning n.id into v_id;

  return v_id;
end;
$$;

comment on function public.claim_appointment_notification is
  'Reserves one appointment notification for sending. Returns NULL when the message was already sent, skipped, or is in flight.';

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Same posture as `leads`: RLS enabled with no policies at all, so anon and
-- authenticated get zero rows and zero writes. The service role bypasses RLS.
-- ---------------------------------------------------------------------------

alter table public.appointments               enable row level security;
alter table public.appointment_notifications  enable row level security;

-- ---------------------------------------------------------------------------
-- Grants — restating the model 0002 established for `leads`.
-- ---------------------------------------------------------------------------

revoke all on public.appointments              from anon, authenticated;
revoke all on public.appointment_notifications from anon, authenticated;

grant select, insert, update, delete on public.appointments              to service_role;
grant select, insert, update, delete on public.appointment_notifications to service_role;

-- The claim function must not be callable by the browser-facing roles: it
-- writes, and PostgREST exposes every function in `public` by default.
revoke all on function public.claim_appointment_notification(
  uuid, appointment_notification_event, appointment_notification_recipient, text
) from public, anon, authenticated;

grant execute on function public.claim_appointment_notification(
  uuid, appointment_notification_event, appointment_notification_recipient, text
) to service_role;

-- ---------------------------------------------------------------------------
-- Verification. Fails loudly rather than leaving customer data exposed or the
-- automation unable to write.
-- ---------------------------------------------------------------------------

do $$
begin
  if has_table_privilege('anon', 'public.appointments', 'select') then
    raise exception 'anon can select public.appointments — customer data would be exposed';
  end if;

  if has_table_privilege('anon', 'public.appointment_notifications', 'select') then
    raise exception 'anon can select public.appointment_notifications — customer phone numbers would be exposed';
  end if;

  if not has_table_privilege('service_role', 'public.appointments', 'insert') then
    raise exception 'service_role cannot insert public.appointments — bookings would fail';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.claim_appointment_notification(uuid, appointment_notification_event, appointment_notification_recipient, text)',
    'execute'
  ) then
    raise exception 'service_role cannot execute claim_appointment_notification — duplicate SMS protection would fail open';
  end if;
end $$;
