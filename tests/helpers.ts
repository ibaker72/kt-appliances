import type { SmsMessage, SmsResult } from "@/lib/sms/client";
import type { AppointmentNotificationTarget } from "@/lib/appointments/notifications";
import type { ClaimOutcome, RecordableOutcome } from "@/lib/appointments/notification-log";
import type { AppointmentEventType } from "@/lib/appointments/messages";
import { wallTimeToUtc } from "@/lib/appointments/time";

/**
 * Shared fakes.
 *
 * The transport fake is the important one: every notification test injects it,
 * so the suite physically cannot reach Twilio. `tests/register.mjs` clears the
 * credentials as a second line of defence.
 */

export interface SmsSpy {
  sent: SmsMessage[];
  send: (message: SmsMessage) => Promise<SmsResult>;
}

/** A transport that always succeeds and records what it was asked to send. */
export function smsSpy(result?: Partial<Extract<SmsResult, { status: "sent" }>>): SmsSpy {
  const sent: SmsMessage[] = [];
  return {
    sent,
    async send(message) {
      sent.push(message);
      return { status: "sent", sid: result?.sid ?? "SM_test_sid", to: result?.to ?? message.to };
    },
  };
}

/** A transport that always fails, the way Twilio does on a rejected request. */
export function failingSmsSpy(
  errorCode = "21610",
  errorMessage = "The message could not be sent",
): SmsSpy {
  const sent: SmsMessage[] = [];
  return {
    sent,
    async send(message) {
      sent.push(message);
      return { status: "failed", errorCode, errorMessage };
    },
  };
}

export interface LedgerSpy {
  claims: Array<{ appointmentId: string | null; event: AppointmentEventType }>;
  records: Array<{ id: string | null; outcome: RecordableOutcome }>;
  claim: (
    appointmentId: string | null,
    event: AppointmentEventType,
    recipientType: "customer" | "owner",
    recipientPhone: string | null,
  ) => Promise<ClaimOutcome>;
  record: (id: string | null, outcome: RecordableOutcome) => Promise<void>;
}

/**
 * In-memory stand-in for the notification ledger, with the same "one claim wins"
 * semantics the unique index gives us in Postgres. Good enough to prove the
 * service honours the contract; the constraint itself is the database's job.
 */
export function ledgerSpy(): LedgerSpy {
  const claimed = new Set<string>();
  const claims: LedgerSpy["claims"] = [];
  const records: LedgerSpy["records"] = [];
  let counter = 0;

  return {
    claims,
    records,
    async claim(appointmentId, event) {
      claims.push({ appointmentId, event });
      const key = `${appointmentId}:${event}`;
      if (claimed.has(key)) return { claimed: false, reason: "already-handled" };
      claimed.add(key);
      counter += 1;
      return { claimed: true, id: `notification-${counter}` };
    },
    async record(id, outcome) {
      records.push({ id, outcome });
    },
  };
}

/** A booking two weeks out, in the middle of a weekday afternoon. */
export function testAppointment(
  overrides: Partial<AppointmentNotificationTarget> = {},
): AppointmentNotificationTarget {
  return {
    id: "appointment-1",
    name: "John Smith",
    phone: "9735551234",
    serviceType: "warehouse-visit",
    scheduledFor: wallTimeToUtc("2026-08-24", "14:30") as Date,
    timeZone: "America/New_York",
    notes: "Not cooling",
    applianceLabel: null,
    smsConsent: true,
    ...overrides,
  };
}

/** `YYYY-MM-DD` a given number of days from now, in the business timezone. */
export function daysFromNow(days: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + days * 86_400_000));
}
