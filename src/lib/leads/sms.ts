import "server-only";

import type { LeadData } from "./schema";

/**
 * Outbound SMS — architected, intentionally disabled.
 *
 * Twilio requires a provisioned number and, for anything resembling marketing,
 * A2P 10DLC registration. Until that is in place `SMS_SENDING_ENABLED` stays
 * false and every call here is a logged no-op, so the lead pipeline is complete
 * and testable without sending anything.
 *
 * To enable: register the campaign, set the Twilio env vars, flip
 * `SMS_SENDING_ENABLED=true`, and implement `deliver()` against the Twilio REST
 * API. Nothing else in the codebase needs to change — `dispatchLeadSms` is
 * already called from the lead pipeline.
 */

export const SMS_ENABLED =
  process.env.SMS_SENDING_ENABLED === "true" &&
  Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()) &&
  Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()) &&
  Boolean(
    process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() || process.env.TWILIO_FROM_NUMBER?.trim(),
  );

export type SmsKind =
  | "lead-confirmation"
  | "internal-alert"
  | "delivery-reminder"
  | "appointment-reminder"
  | "review-request"
  | "inventory-alert";

export interface SmsMessage {
  kind: SmsKind;
  to: string;
  body: string;
}

async function deliver(message: SmsMessage): Promise<void> {
  if (!SMS_ENABLED) {
    console.info(`[sms] skipped (disabled) kind=${message.kind} to=***${message.to.slice(-4)}`);
    return;
  }
  // Intentionally unimplemented until 10DLC registration is complete.
  console.warn(`[sms] enabled but no transport implemented — kind=${message.kind}`);
}

/**
 * Fan-out point for lead-triggered messages. Called from the lead pipeline today
 * so that enabling SMS later is a configuration change, not a code change.
 */
export async function dispatchLeadSms(lead: LeadData): Promise<void> {
  if (!SMS_ENABLED) return;

  await deliver({
    kind: "lead-confirmation",
    to: `+1${lead.phone}`,
    body: `Thanks for contacting KT Appliances. We received your request${
      lead.applianceLabel ? ` about the ${lead.applianceLabel}` : ""
    } and will follow up shortly.`,
  });
}
