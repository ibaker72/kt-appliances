import "server-only";

/**
 * Outbound SMS configuration and feature gating.
 *
 * Every value is read at call time rather than at module load. That is not
 * ceremony: a module-scope `const` freezes the flag into the serverless bundle
 * at first import, so flipping `SMS_SENDING_ENABLED` in the hosting dashboard
 * would need a redeploy to take effect — exactly the "code change after A2P
 * approval" this is supposed to avoid.
 *
 * ---------------------------------------------------------------------------
 * THE A2P GATE
 * ---------------------------------------------------------------------------
 * KT Appliances' A2P 10DLC brand is approved; the campaign is still under
 * carrier review. Until it clears, unregistered traffic is filtered or blocked
 * by the carriers regardless of what this application does, and sending it
 * counts against the registration.
 *
 * So `SMS_SENDING_ENABLED` stays `false` and every outbound message — customer
 * and internal alike — is skipped with a log line. After the campaign is
 * approved, setting `SMS_SENDING_ENABLED=true` is the only change required.
 *
 * `SMS_CUSTOMER_SENDING_ENABLED` is a narrower second valve, and it defaults to
 * following the master switch, so it does not have to be set at all. Its only
 * purpose is the awkward middle state: if the owner decides to accept the risk
 * on internal alerts to their own handset before the campaign clears, setting it
 * to `false` keeps customer-facing A2P traffic off while the master is on.
 */

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  /**
   * Preferred sender. A Messaging Service carries the A2P campaign
   * registration, sticky sender and opt-out handling; a bare `From` number
   * carries none of it.
   */
  messagingServiceSid: string;
  fromNumber: string;
}

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getTwilioCredentials(): TwilioCredentials {
  return {
    accountSid: env("TWILIO_ACCOUNT_SID"),
    authToken: env("TWILIO_AUTH_TOKEN"),
    messagingServiceSid: env("TWILIO_MESSAGING_SERVICE_SID"),
    fromNumber: env("TWILIO_FROM_NUMBER"),
  };
}

/** True when Twilio is fully configured, regardless of the feature flag. */
export function isTwilioConfigured(): boolean {
  const { accountSid, authToken, messagingServiceSid, fromNumber } = getTwilioCredentials();
  return Boolean(accountSid && authToken && (messagingServiceSid || fromNumber));
}

/**
 * The master switch. False here means nothing is sent to anyone, which is the
 * correct state while the A2P campaign is under review.
 */
export function isSmsEnabled(): boolean {
  return env("SMS_SENDING_ENABLED") === "true" && isTwilioConfigured();
}

/**
 * Customer-facing (A2P) sending. Inherits the master switch unless explicitly
 * set to `false`, so enabling SMS after campaign approval stays a one-variable
 * change.
 */
export function isCustomerSmsEnabled(): boolean {
  if (!isSmsEnabled()) return false;
  return env("SMS_CUSTOMER_SENDING_ENABLED") !== "false";
}

/**
 * The Twilio number this account owns — `(570) 750-0622` in production.
 *
 * Read on its own rather than through `getTwilioCredentials()` so a caller that
 * only needs to *show* which number customers are texted from never has the
 * account SID and auth token in scope alongside it.
 *
 * Note what this is not: it is not the number the site tells customers to ring.
 * See `siteConfig.phone` for that. When a Messaging Service SID is configured
 * this value is not sent to Twilio at all — the service picks the sender from
 * its registered pool — so treat it as documentation of the owned sender rather
 * than proof of which number a given message went out from.
 */
export function getSmsSenderNumber(): string {
  return env("TWILIO_FROM_NUMBER");
}

/**
 * The number internal booking alerts go to. Server-only, and rendered to the
 * admin only through `maskPhoneNumber`.
 *
 * Configured to the published business line, so bookings reach the owner on the
 * number the shop already runs on. It stays a separate variable rather than
 * defaulting to `siteConfig.phone` for two reasons: the destination is an
 * operational choice that may move to a private handset without changing what
 * the website publishes, and an unset value must mean "skip the alert" rather
 * than "text the shop", so a deployment that has not configured it does not
 * start texting a number nobody chose.
 *
 * This is a delivery destination, so it has to be able to RECEIVE SMS. A
 * landline or a non-SMS VoIP line here produces Twilio 21614/30006 and every
 * alert is recorded `failed` in `appointment_notifications` — the booking and
 * the customer's confirmation are unaffected. See `.env.example`.
 */
export function getOwnerNotificationPhone(): string {
  return env("APPOINTMENT_NOTIFICATION_PHONE");
}

/**
 * Why SMS is not sending, or null when it is. Mirrors
 * `adminClientConfigProblem()`: the admin needs to distinguish "deliberately
 * off while A2P is pending" from "misconfigured", because only one of those is
 * a problem. Never returns any part of a credential.
 */
export function smsConfigProblem(): string | null {
  const { accountSid, authToken, messagingServiceSid, fromNumber } = getTwilioCredentials();

  if (env("SMS_SENDING_ENABLED") !== "true") {
    return "SMS_SENDING_ENABLED is not \"true\" — outbound texts are disabled while the A2P campaign is under review.";
  }
  if (!accountSid) return "TWILIO_ACCOUNT_SID is not set.";
  if (!authToken) return "TWILIO_AUTH_TOKEN is not set.";
  if (!messagingServiceSid && !fromNumber) {
    return "Neither TWILIO_MESSAGING_SERVICE_SID nor TWILIO_FROM_NUMBER is set.";
  }
  if (!messagingServiceSid) {
    return "TWILIO_MESSAGING_SERVICE_SID is not set — sending from a bare number bypasses the A2P campaign registration.";
  }
  return null;
}
