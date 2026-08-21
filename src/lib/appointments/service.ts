import "server-only";

import { getSupabaseAdminClient, isSupabaseWritable } from "@/lib/supabase/client";
import {
  sendAppointmentEmails,
  type AppointmentEmailContext,
  type AppointmentEmailOutcomes,
} from "./email";
import {
  sendAppointmentBookedNotifications,
  type AppointmentBookedNotifications,
  type AppointmentNotificationTarget,
} from "./notifications";
import {
  SMS_CONSENT_SOURCE,
  SMS_CONSENT_TEXT,
  type AppointmentData,
} from "./schema";

/**
 * Booking an appointment.
 *
 * The ordering is the whole point, and it matches `recordLead`:
 *
 *   1. persist
 *   2. commit
 *   3. notify
 *   4. log notification outcomes
 *   5. return success
 *
 * No message is composed, let alone sent, until the appointment exists. The
 * reverse — texting "your appointment is confirmed" and then failing the insert —
 * is the single worst outcome this flow can produce, so it is made structurally
 * impossible rather than merely avoided.
 *
 * The converse is equally deliberate: once step 2 succeeds the booking is real,
 * and nothing in steps 3-4 can undo it. Notifications are best effort.
 */

export class AppointmentPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppointmentPersistenceError";
  }
}

/**
 * Somebody else took the slot.
 *
 * A distinct type because it is the one insert failure that is not a fault: the
 * booking is valid, the warehouse simply cannot be in two places at 1:30 PM. It
 * needs different copy ("pick another time") and a different UI outcome (reopen
 * the slot picker) from a database that is actually broken.
 *
 * Raised only from the partial unique index in migration 0007 — never inferred
 * from an application-level availability check, which cannot see a concurrent
 * insert.
 */
export class AppointmentSlotTakenError extends Error {
  constructor(message = "That time was just booked by someone else.") {
    super(message);
    this.name = "AppointmentSlotTakenError";
  }
}

/**
 * Name of the partial unique index that enforces one active booking per slot.
 * Postgres reports it in the error detail, which is how a slot collision is told
 * apart from a repeated submission token.
 */
const SLOT_INDEX = "appointments_active_slot_idx";

export interface PersistedAppointment {
  id: string | null;
  /**
   * True when this submission token had already produced an appointment — a
   * double-click, a refreshed POST or a retried action. The booking is valid;
   * it just is not a new one, and the notification claims will see that.
   */
  duplicate: boolean;
}

export interface BookAppointmentResult {
  ok: boolean;
  id: string | null;
  duplicate: boolean;
  notifications: AppointmentBookedNotifications;
  emails: AppointmentEmailOutcomes;
}

/** Test seam. Production uses the defaults. */
export interface BookAppointmentDeps {
  persist: (appointment: AppointmentData) => Promise<PersistedAppointment>;
  notify: (input: {
    appointment: AppointmentNotificationTarget;
  }) => Promise<AppointmentBookedNotifications>;
  email: (appointment: AppointmentEmailContext) => Promise<AppointmentEmailOutcomes>;
}

/**
 * Postgres unique-violation. Two constraints on this table can raise it — the
 * submission token and the active-slot index — and they mean opposite things,
 * so the constraint name decides which.
 */
const UNIQUE_VIOLATION = "23505";

/** True when a 23505 came from the one-booking-per-slot index. */
function conflictIsSlot(error: { message?: string; details?: string | null }): boolean {
  const haystack = `${error.message ?? ""} ${error.details ?? ""}`;
  return haystack.includes(SLOT_INDEX);
}

export async function persistAppointment(
  appointment: AppointmentData,
): Promise<PersistedAppointment> {
  const client = getSupabaseAdminClient();

  if (!client) {
    // No database configured — local development before Supabase is connected.
    // Log enough to recover the booking by hand, exactly as the lead pipeline
    // does, so a submission is never silently dropped during setup.
    console.warn(
      "[appointments] no database configured - appointment captured in logs only:",
      JSON.stringify({
        name: appointment.name,
        phone: appointment.phone,
        email: appointment.email,
        serviceType: appointment.serviceType,
        scheduledFor: appointment.scheduledFor.toISOString(),
        smsConsent: appointment.smsConsent,
        notes: appointment.notes,
      }),
    );
    return { id: null, duplicate: false };
  }

  const row = {
    name: appointment.name,
    phone: appointment.phone,
    email: appointment.email || null,
    zip: appointment.zip || null,

    service_type: appointment.serviceType,
    scheduled_for: appointment.scheduledFor.toISOString(),
    timezone: appointment.timeZone,
    notes: appointment.notes || null,

    purpose: appointment.purpose || null,
    appliance_id: appointment.applianceId || null,
    appliance_slug: appointment.applianceSlug || null,
    appliance_label: appointment.applianceLabel || null,

    // Consent provenance is written here and nowhere else. The timestamp and the
    // disclosure text come from the server at the moment of the booking — the
    // client only ever contributes the checkbox itself.
    sms_consent: appointment.smsConsent,
    sms_consent_at: appointment.smsConsent ? new Date().toISOString() : null,
    sms_consent_source: appointment.smsConsent ? SMS_CONSENT_SOURCE : null,
    sms_consent_text: appointment.smsConsent ? SMS_CONSENT_TEXT : null,

    source: appointment.source || null,
    utm_source: appointment.utmSource || null,
    utm_medium: appointment.utmMedium || null,
    utm_campaign: appointment.utmCampaign || null,
    utm_content: appointment.utmContent || null,
    utm_term: appointment.utmTerm || null,
    landing_page: appointment.landingPage || null,
    referrer: appointment.referrer || null,
    form_location: appointment.formLocation || null,

    submission_token: appointment.submissionToken || null,
    status: "confirmed",
  };

  const { data, error } = await client.from("appointments").insert(row).select("id").single();

  if (!error) return { id: (data?.id as string) ?? null, duplicate: false };

  if (error.code === UNIQUE_VIOLATION && conflictIsSlot(error)) {
    // The slot went while this visitor was typing. Not an error in the booking
    // and not something a retry of the same request can fix — the caller has to
    // put them back in front of the slot picker.
    console.info("[appointments] slot already taken", {
      scheduledFor: appointment.scheduledFor.toISOString(),
    });
    throw new AppointmentSlotTakenError();
  }

  if (error.code === UNIQUE_VIOLATION && appointment.submissionToken) {
    // The same submission arriving twice. Resolve to the appointment that
    // already exists rather than creating a second one; the notification claims
    // will then find their rows already handled and send nothing further.
    const { data: existing } = await client
      .from("appointments")
      .select("id")
      .eq("submission_token", appointment.submissionToken)
      .maybeSingle();

    console.info("[appointments] duplicate submission collapsed onto existing appointment", {
      appointmentId: (existing?.id as string) ?? null,
    });
    return { id: (existing?.id as string) ?? null, duplicate: true };
  }

  console.error("[appointments] insert failed:", error.message);
  // Deliberately fatal, unlike a lead. A lead that fails to save is a lost
  // enquiry; an appointment that fails to save but reports success is a customer
  // arriving at a warehouse nobody is expecting them at.
  throw new AppointmentPersistenceError(error.message);
}

const defaultDeps: BookAppointmentDeps = {
  persist: persistAppointment,
  notify: sendAppointmentBookedNotifications,
  email: sendAppointmentEmails,
};

const NO_EMAILS: AppointmentEmailOutcomes = {
  owner: { status: "failed", reason: "exception" },
  customer: { status: "failed", reason: "exception" },
};

export async function bookAppointment(
  appointment: AppointmentData,
  overrides: Partial<BookAppointmentDeps> = {},
): Promise<BookAppointmentResult> {
  const deps = { ...defaultDeps, ...overrides };

  // Step 1-2. Throws on a real persistence failure, which the caller turns into
  // an error for the visitor. Nothing below runs in that case.
  const { id, duplicate } = await deps.persist(appointment);

  // Step 3-4. Every failure inside is caught and logged by the notification
  // service; the outer guard is for the unforeseen.
  const target: AppointmentNotificationTarget = {
    id: id ?? "",
    name: appointment.name,
    phone: appointment.phone,
    serviceType: appointment.serviceType,
    scheduledFor: appointment.scheduledFor,
    timeZone: appointment.timeZone,
    notes: appointment.notes,
    applianceLabel: appointment.applianceLabel,
    smsConsent: appointment.smsConsent,
  };

  let notifications: AppointmentBookedNotifications;
  try {
    notifications = await deps.notify({ appointment: target });
  } catch (error) {
    console.error("[appointments] notification dispatch threw - booking is unaffected", {
      appointmentId: id,
      error,
    });
    notifications = {
      customer: { event: "customer_confirmation", status: "failed", reason: "exception" },
      owner: { event: "owner_notification", status: "failed", reason: "exception" },
    };
  }

  // Email, on the same terms as SMS: after the commit, failures swallowed. A
  // resubmitted booking is not re-announced — the appointment already exists and
  // the owner has already been told about it.
  let emails: AppointmentEmailOutcomes;
  if (duplicate) {
    emails = {
      owner: { status: "skipped", reason: "duplicate-submission" },
      customer: { status: "skipped", reason: "duplicate-submission" },
    };
  } else {
    try {
      emails = await deps.email({
        ...target,
        email: appointment.email,
        zip: appointment.zip,
        purpose: appointment.purpose,
        applianceSlug: appointment.applianceSlug,
        source: appointment.source,
        utmCampaign: appointment.utmCampaign,
        formLocation: appointment.formLocation,
      });
    } catch (error) {
      console.error("[appointments] email dispatch threw - booking is unaffected", {
        appointmentId: id,
        error,
      });
      emails = NO_EMAILS;
    }
  }

  return { ok: true, id, duplicate, notifications, emails };
}

/** Surfaced by the admin so "no database" and "SMS off" read differently. */
export const appointmentsPersistenceConfigured = () => isSupabaseWritable;
