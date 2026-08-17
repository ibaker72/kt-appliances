import "server-only";

import {
  getTwilioCredentials,
  isCustomerSmsEnabled,
  isSmsEnabled,
  smsConfigProblem,
} from "./config";
import { logSafePhone, toE164 } from "./phone";

/**
 * The single outbound SMS transport for the whole application.
 *
 * Implemented against Twilio's REST API with `fetch` rather than the `twilio`
 * npm package. One endpoint, form-encoded, Basic auth — the SDK would add
 * ~4 MB and a second HTTP stack to save about fifteen lines, and this runs in a
 * serverless function where bundle size is latency.
 *
 * Nothing here throws. Every failure becomes a typed result, because the callers
 * are notification paths hanging off a database write that has already been
 * committed: a provider outage must be recorded, not propagated back into a
 * booking the customer has already completed.
 */

export type SmsKind =
  | "lead-confirmation"
  | "internal-alert"
  | "delivery-reminder"
  | "appointment-confirmation"
  | "appointment-reminder"
  | "appointment-update"
  | "review-request"
  | "inventory-alert";

/**
 * Whether a message is application-to-person traffic covered by the A2P
 * campaign ("customer"), or an internal alert to staff ("internal"). They are
 * gated separately — see `src/lib/sms/config.ts`.
 */
export type SmsAudience = "customer" | "internal";

export interface SmsMessage {
  kind: SmsKind;
  audience: SmsAudience;
  /** Any US format; normalised to E.164 before sending. */
  to: string;
  body: string;
}

export type SmsSkipReason =
  | "sms-disabled"
  | "customer-sms-disabled"
  | "invalid-phone"
  | "missing-recipient";

export type SmsResult =
  | { status: "sent"; sid: string; to: string }
  | { status: "skipped"; reason: SmsSkipReason; detail: string }
  | { status: "failed"; errorCode: string | null; errorMessage: string };

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

/**
 * Ten seconds. Long enough for a healthy Twilio round trip, short enough that a
 * provider hang cannot hold a serverless invocation open until the platform
 * kills it — which would lose the notification log write in the `finally`.
 */
const REQUEST_TIMEOUT_MS = 10_000;

/** Twilio's code for "this handset replied STOP". Worth naming; see below. */
export const TWILIO_ERROR_UNSUBSCRIBED = "21610";

interface TwilioErrorBody {
  code?: number;
  message?: string;
}

interface TwilioMessageBody {
  sid?: string;
  status?: string;
}

/**
 * Sends one message.
 *
 * Order of the guards matters and is not arbitrary: audience gating comes before
 * recipient validation so that a disabled deployment reports "disabled" rather
 * than leaking which numbers would have been dialled into the logs.
 */
export async function sendSms(message: SmsMessage): Promise<SmsResult> {
  const enabled = message.audience === "customer" ? isCustomerSmsEnabled() : isSmsEnabled();

  if (!enabled) {
    const reason: SmsSkipReason =
      message.audience === "customer" && isSmsEnabled() ? "customer-sms-disabled" : "sms-disabled";
    const detail = smsConfigProblem() ?? "Customer SMS is disabled while A2P approval is pending.";
    console.info(`[sms] skipped (${reason}) kind=${message.kind}`);
    return { status: "skipped", reason, detail };
  }

  if (!message.to.trim()) {
    return { status: "skipped", reason: "missing-recipient", detail: "No recipient number." };
  }

  const to = toE164(message.to);
  if (!to) {
    // Not an error worth alerting on: a customer mistyping their number is an
    // everyday event, and the booking itself is unaffected.
    console.warn(`[sms] skipped (invalid-phone) kind=${message.kind} to=${logSafePhone(message.to)}`);
    return {
      status: "skipped",
      reason: "invalid-phone",
      detail: "Recipient is not a valid US phone number.",
    };
  }

  const { accountSid, authToken, messagingServiceSid, fromNumber } = getTwilioCredentials();

  const params = new URLSearchParams({ To: to, Body: message.body });
  // Messaging Service wins when both are present: it is what carries the A2P
  // campaign, the sender pool and Twilio's Advanced Opt-Out (STOP/HELP) handling.
  if (messagingServiceSid) params.set("MessagingServiceSid", messagingServiceSid);
  else params.set("From", fromNumber);

  try {
    const response = await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        // Basic auth over TLS, as Twilio specifies. Never logged, never returned.
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as TwilioErrorBody;
      const errorCode = error.code ? String(error.code) : String(response.status);
      const errorMessage = error.message ?? `Twilio responded ${response.status}`;

      // 21610 means the handset replied STOP. That is a compliance outcome, not
      // an outage: it must never be retried, and it is the one failure worth
      // flagging distinctly in the logs so the consent record can be corrected.
      if (errorCode === TWILIO_ERROR_UNSUBSCRIBED) {
        console.warn(
          `[sms] recipient has opted out kind=${message.kind} to=${logSafePhone(to)} — clear their SMS consent`,
        );
      } else {
        console.error(`[sms] send failed kind=${message.kind} code=${errorCode}`);
      }

      return { status: "failed", errorCode, errorMessage };
    }

    const body = (await response.json().catch(() => ({}))) as TwilioMessageBody;
    const sid = body.sid ?? "";
    console.info(`[sms] sent kind=${message.kind} to=${logSafePhone(to)} sid=${sid || "unknown"}`);
    return { status: "sent", sid, to };
  } catch (error) {
    // Network failure, DNS, TLS, or the abort above. `AbortSignal.timeout`
    // rejects with a TimeoutError, which is worth naming in the log because it
    // points at Twilio rather than at this code.
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    const errorMessage = timedOut
      ? `Twilio request timed out after ${REQUEST_TIMEOUT_MS}ms`
      : error instanceof Error
        ? error.message
        : "Unknown transport error";

    console.error(`[sms] transport error kind=${message.kind}: ${errorMessage}`);
    return { status: "failed", errorCode: timedOut ? "timeout" : null, errorMessage };
  }
}
