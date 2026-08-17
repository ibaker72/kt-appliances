import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/client";
import type { SmsResult } from "@/lib/sms/client";
import type { AppointmentEventType } from "./messages";

/**
 * The appointment notification ledger.
 *
 * Two jobs, and the first one is the important one:
 *
 * 1. **Idempotency.** Nothing is sent until a row is claimed for that
 *    (appointment, event) pair, and the claim is a single atomic statement in
 *    Postgres (`claim_appointment_notification`, migration 0003). A double
 *    click, a refreshed POST, a retried server action and two concurrent
 *    instances all converge on one winner. In-process guards cannot do this —
 *    serverless functions do not share memory, and the second request is
 *    frequently served by a different instance entirely.
 *
 * 2. **Delivery logging.** Message SID, status, error code and timing, so a
 *    "they never got the text" conversation has an answer.
 */

export type NotificationRecipientType = "customer" | "owner";

/**
 * What can be written to a claimed row.
 *
 * Wider than `SmsResult` on the skip case only: the transport knows about
 * reasons like `sms-disabled`, but the notification service also skips for
 * reasons the transport never sees — `consent-withheld`, `no-owner-number` — and
 * those are the two an admin most needs to read back.
 */
export type RecordableOutcome =
  | Extract<SmsResult, { status: "sent" }>
  | Extract<SmsResult, { status: "failed" }>
  | { status: "skipped"; reason: string; detail?: string };

export type ClaimOutcome =
  /** This caller owns the send. `id` is null only when no database is configured. */
  | { claimed: true; id: string | null }
  /** Someone already sent, skipped, or is currently sending this message. */
  | { claimed: false; reason: "already-handled" }
  /** The ledger itself failed. Treated as "do not send" — see below. */
  | { claimed: false; reason: "unavailable" };

/**
 * Reserves the right to send one message.
 *
 * On a database error this returns `unavailable`, which suppresses the send.
 * That is the deliberate direction to fail: without a working ledger there is no
 * duplicate protection, and sending a customer the same confirmation five times
 * because a retry loop could not read the log is worse than not sending it once.
 *
 * The exception is a deployment with no Supabase credentials at all — local
 * development before setup. There the whole pipeline runs in log-only mode
 * anyway, so the claim succeeds with a null id and the send proceeds
 * unguarded, exactly as the lead pipeline behaves without a database.
 */
export async function claimAppointmentNotification(
  appointmentId: string | null,
  eventType: AppointmentEventType,
  recipientType: NotificationRecipientType,
  recipientPhone: string | null,
): Promise<ClaimOutcome> {
  const supabase = getSupabaseAdminClient();
  if (!supabase || !appointmentId) return { claimed: true, id: null };

  try {
    const { data, error } = await supabase.rpc("claim_appointment_notification", {
      p_appointment_id: appointmentId,
      p_event_type: eventType,
      p_recipient_type: recipientType,
      p_recipient_phone: recipientPhone,
    });

    if (error) {
      console.error("[appointments] notification claim failed", {
        appointmentId,
        eventType,
        error: error.message,
      });
      return { claimed: false, reason: "unavailable" };
    }

    // The function returns NULL when the row exists and is not retryable.
    const id = typeof data === "string" && data.length > 0 ? data : null;
    if (!id) return { claimed: false, reason: "already-handled" };

    return { claimed: true, id };
  } catch (error) {
    console.error("[appointments] notification claim threw", { appointmentId, eventType, error });
    return { claimed: false, reason: "unavailable" };
  }
}

/**
 * Closes out a claimed row with what actually happened.
 *
 * Never throws: it is called from paths that must not disturb an appointment
 * that is already committed. A lost log line is a reporting gap, not an outage.
 */
export async function recordNotificationResult(
  notificationId: string | null,
  result: RecordableOutcome,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase || !notificationId) return;

  const now = new Date().toISOString();

  const patch =
    result.status === "sent"
      ? {
          status: "sent",
          provider_message_sid: result.sid || null,
          recipient_phone: result.to,
          sent_at: now,
        }
      : result.status === "skipped"
        ? { status: "skipped", skip_reason: result.reason }
        : {
            status: "failed",
            error_code: result.errorCode,
            // Twilio's message text, not the request that produced it — it never
            // contains credentials, and it is the only thing that explains a
            // carrier rejection after the fact.
            error_message: result.errorMessage.slice(0, 500),
            failed_at: now,
          };

  try {
    const { error } = await supabase
      .from("appointment_notifications")
      .update(patch)
      .eq("id", notificationId);

    if (error) {
      console.error("[appointments] notification log update failed", {
        notificationId,
        error: error.message,
      });
    }
  } catch (error) {
    console.error("[appointments] notification log update threw", { notificationId, error });
  }
}
