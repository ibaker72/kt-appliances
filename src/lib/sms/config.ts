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
 * The number internal booking alerts go to. Server-only and never rendered to a
 * visitor: this is the owner's personal handset, not the published business
 * line, and it is deliberately not defaulted to `siteConfig.phone` — texting the
 * shop's own published number on every booking would be a surprise, not a
 * feature.
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
