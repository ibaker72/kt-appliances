import "server-only";

import { sendSms, type SmsMessage, type SmsResult } from "@/lib/sms/client";
import { getOwnerNotificationPhone } from "@/lib/sms/config";
import { logSafePhone } from "@/lib/sms/phone";
import {
  APPOINTMENT_EVENT_AUDIENCE,
  APPOINTMENT_MESSAGE_BUILDERS,
  type AppointmentEventType,
  type AppointmentMessageContext,
} from "./messages";
import {
  claimAppointmentNotification,
  recordNotificationResult,
  type NotificationRecipientType,
} from "./notification-log";

/**
 * Appointment notifications.
 *
 * The one place that decides whether an appointment message is sent, to whom,
 * and what happens when it is not. Raw Twilio calls never appear in a route, an
 * action or a component — they go through `@/lib/sms/client`, which this module
 * is the only appointment-side caller of.
 *
 * ---------------------------------------------------------------------------
 * THE CONTRACT
 * ---------------------------------------------------------------------------
 * Nothing here throws, and nothing here is allowed to matter to the booking.
 * The appointment is committed before any of this runs; a Twilio outage, a
 * missing owner number or a withheld consent must all end with the customer
 * seeing a successful booking. Every outcome is returned as a value and written
 * to the notification ledger, never raised.
 *
 * ---------------------------------------------------------------------------
 * ADDING THE REMINDER WORKFLOWS
 * ---------------------------------------------------------------------------
 * `sendAppointmentNotification` is generic over the event type, and the message
 * bodies for reminders, reschedules, cancellations and follow-ups already exist
 * in `messages.ts`. Adding the 24-hour reminder is therefore:
 *
 *   1. Something that finds due appointments (`scheduled_for` between 23h and
 *      25h out, `status in ('confirmed','rescheduled')`, consent true).
 *   2. `sendAppointmentNotification("reminder_24h", appointment)` for each.
 *
 * The unique constraint behind the claim means step 2 is safe to run on an
 * overlapping schedule — a cron that fires twice sends once.
 *
 * There is no scheduler in this project today (no Vercel Cron, no queue, no
 * Inngest), and adding one is out of scope here. On Vercel the natural home is a
 * `vercel.json` cron hitting an authenticated route handler; anywhere else, any
 * scheduler that can make an authenticated HTTP request will do. Deliberately
 * not built on speculation — see the follow-ups in the report.
 */

export interface AppointmentNotificationTarget extends AppointmentMessageContext {
  /**
   * Whether this customer agreed to be texted. Read from the stored appointment,
   * never re-derived from the presence of a phone number.
   */
  smsConsent: boolean;
}

export type AppointmentNotificationStatus = "sent" | "skipped" | "failed" | "duplicate";

export interface AppointmentNotificationOutcome {
  event: AppointmentEventType;
  status: AppointmentNotificationStatus;
  /** Machine-readable cause for anything other than `sent`. */
  reason?: string;
  sid?: string;
}

/**
 * Seam for tests. Production always uses the defaults; the suite substitutes a
 * fake transport and ledger so no test can reach Twilio even by accident.
 */
export interface AppointmentNotificationDeps {
  sendSms: (message: SmsMessage) => Promise<SmsResult>;
  claim: typeof claimAppointmentNotification;
  record: typeof recordNotificationResult;
  ownerPhone: () => string;
}

const defaultDeps: AppointmentNotificationDeps = {
  sendSms,
  claim: claimAppointmentNotification,
  record: recordNotificationResult,
  ownerPhone: getOwnerNotificationPhone,
};

/**
 * Sends one appointment message of one type.
 *
 * Ordering of the guards is the design:
 *
 *   consent / recipient  →  claim  →  send  →  record
 *
 * Consent is checked *before* claiming so that a withheld consent is recorded
 * once as a skip rather than burning the retryable claim. The claim comes before
 * the send so a crash mid-flight leaves a `pending` row — visible evidence —
 * rather than an untracked message that may or may not have gone out.
 */
export async function sendAppointmentNotification(
  event: AppointmentEventType,
  appointment: AppointmentNotificationTarget,
  overrides: Partial<AppointmentNotificationDeps> = {},
): Promise<AppointmentNotificationOutcome> {
  const deps = { ...defaultDeps, ...overrides };
  const audience = APPOINTMENT_EVENT_AUDIENCE[event];
  const recipientType: NotificationRecipientType = audience === "owner" ? "owner" : "customer";

  try {
    const recipient = audience === "owner" ? deps.ownerPhone() : appointment.phone;

    // --- Reasons not to send that are worth recording -----------------------
    if (audience === "customer" && !appointment.smsConsent) {
      console.info(
        `[appointments] customer SMS skipped: no SMS consent on this booking (appointment=${appointment.id})`,
      );
      return recordSkip(deps, appointment.id, event, recipientType, recipient, "consent-withheld");
    }

    if (!recipient) {
      const reason = audience === "owner" ? "no-owner-number" : "missing-recipient";
      if (audience === "owner") {
        // Not an error: a deployment that has not set the owner's number yet is
        // a configuration state, and the booking is unaffected.
        console.warn(
          "[appointments] owner alert skipped: APPOINTMENT_NOTIFICATION_PHONE is not set",
        );
      }
      return recordSkip(deps, appointment.id, event, recipientType, null, reason);
    }

    // --- Claim --------------------------------------------------------------
    const claim = await deps.claim(appointment.id, event, recipientType, recipient);
    if (!claim.claimed) {
      console.info(
        `[appointments] ${recipientType} ${event} not sent: ${claim.reason} (appointment=${appointment.id})`,
      );
      return {
        event,
        status: claim.reason === "already-handled" ? "duplicate" : "skipped",
        reason: claim.reason,
      };
    }

    // --- Send ---------------------------------------------------------------
    const result = await deps.sendSms({
      kind: smsKindFor(event),
      audience: audience === "owner" ? "internal" : "customer",
      to: recipient,
      body: APPOINTMENT_MESSAGE_BUILDERS[event](appointment),
    });

    await deps.record(claim.id, result);

    if (result.status === "sent") {
      console.info(
        `[appointments] ${recipientType} ${event} sent (appointment=${appointment.id} to=${logSafePhone(recipient)})`,
      );
      return { event, status: "sent", sid: result.sid };
    }

    if (result.status === "skipped") {
      // The line the brief asks for, and the one an operator will grep while
      // wondering why a booking produced no text.
      console.info(`[appointments] ${recipientType} SMS skipped: ${result.detail}`);
      return { event, status: "skipped", reason: result.reason };
    }

    console.error(`[appointments] ${recipientType} ${event} SMS failed`, {
      appointmentId: appointment.id,
      errorCode: result.errorCode,
      // Twilio's own message. No credentials, no request body, and it never
      // reaches the browser — the action returns fixed copy.
      error: result.errorMessage,
    });
    return { event, status: "failed", reason: result.errorCode ?? "unknown" };
  } catch (error) {
    // The backstop. Reaching here means a bug rather than a handled condition,
    // and it still must not disturb a committed booking.
    console.error(`[appointments] ${event} notification threw`, {
      appointmentId: appointment.id,
      error,
    });
    return { event, status: "failed", reason: "exception" };
  }
}

/** Claims a row purely so the skip is visible in the admin, then records it. */
async function recordSkip(
  deps: AppointmentNotificationDeps,
  appointmentId: string,
  event: AppointmentEventType,
  recipientType: NotificationRecipientType,
  recipient: string | null,
  reason: string,
): Promise<AppointmentNotificationOutcome> {
  const claim = await deps.claim(appointmentId, event, recipientType, recipient);
  if (claim.claimed) {
    await deps.record(claim.id, { status: "skipped", reason });
  }
  return { event, status: "skipped", reason };
}

function smsKindFor(event: AppointmentEventType) {
  switch (event) {
    case "owner_notification":
      return "internal-alert" as const;
    case "customer_confirmation":
      return "appointment-confirmation" as const;
    case "reminder_24h":
    case "reminder_2h":
      return "appointment-reminder" as const;
    case "review_request":
      return "review-request" as const;
    default:
      return "appointment-update" as const;
  }
}

/* -------------------------------------------------------------------------- */
/* Named entry points                                                          */
/* -------------------------------------------------------------------------- */

export async function sendCustomerAppointmentConfirmation(
  appointment: AppointmentNotificationTarget,
  overrides: Partial<AppointmentNotificationDeps> = {},
): Promise<AppointmentNotificationOutcome> {
  return sendAppointmentNotification("customer_confirmation", appointment, overrides);
}

export async function sendOwnerAppointmentNotification(
  appointment: AppointmentNotificationTarget,
  overrides: Partial<AppointmentNotificationDeps> = {},
): Promise<AppointmentNotificationOutcome> {
  return sendAppointmentNotification("owner_notification", appointment, overrides);
}

export interface AppointmentBookedNotifications {
  customer: AppointmentNotificationOutcome;
  owner: AppointmentNotificationOutcome;
}

/**
 * Everything that happens when a booking succeeds.
 *
 * Sequential rather than parallel: two sends against one appointment produce far
 * more legible logs in order, the volume is one booking at a time, and the
 * customer's confirmation is the message that matters most if an instance is
 * about to be cut short.
 */
export async function sendAppointmentBookedNotifications(
  { appointment }: { appointment: AppointmentNotificationTarget },
  overrides: Partial<AppointmentNotificationDeps> = {},
): Promise<AppointmentBookedNotifications> {
  const customer = await sendCustomerAppointmentConfirmation(appointment, overrides);
  const owner = await sendOwnerAppointmentNotification(appointment, overrides);
  return { customer, owner };
}
