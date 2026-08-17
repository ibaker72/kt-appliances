import "server-only";

import { isCustomerSmsEnabled, isSmsEnabled } from "@/lib/sms/config";
import type { LeadData } from "./schema";

/**
 * Lead-triggered SMS.
 *
 * The transport that used to be stubbed here now lives in `@/lib/sms/client` and
 * is fully implemented, because the appointment automation needs it. This module
 * is what remains: the lead pipeline's fan-out point.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS STILL SENDS NOTHING
 * ---------------------------------------------------------------------------
 * A working transport is not permission to use it. The inquiry forms collect a
 * phone number under an explicit promise — "We use your number to respond to
 * this request only. No marketing texts" — and they carry no SMS consent
 * checkbox, so no lead in the database has agreed to be texted. Sending an
 * automated confirmation to that number would break both the promise on the form
 * and the consent requirements of the A2P campaign.
 *
 * So this stays a logged no-op, exactly as it behaved before the transport
 * existed. It is deliberately *not* wired to `SMS_SENDING_ENABLED`: flipping
 * that flag after A2P approval must not silently start texting people who never
 * opted in.
 *
 * To enable lead confirmations later, capture consent on the inquiry forms the
 * way `/schedule` does (`SmsConsentField` in `src/components/forms/form-fields.tsx`),
 * store it on the lead, and send through `sendSms` from `@/lib/sms/client` with
 * `audience: "customer"`. The appointment notification service in
 * `src/lib/appointments/notifications.ts` is the worked example.
 */

/** Retained for callers and diagnostics; the appointment path uses the config module directly. */
export const smsTransportReady = { isSmsEnabled, isCustomerSmsEnabled };

export async function dispatchLeadSms(lead: LeadData): Promise<void> {
  if (!lead.phone) return;
  console.info(
    "[leads] customer SMS skipped: inquiry forms do not capture SMS consent (see src/lib/leads/sms.ts)",
  );
}
