import { siteConfig } from "@/lib/site-config";
import { formatPhoneNumber } from "@/lib/utils";
import {
  APPOINTMENT_SERVICE_LABELS,
  type AppointmentServiceType,
} from "./schema";
import {
  BUSINESS_TIME_ZONE,
  formatAppointmentDateTime,
  formatAppointmentShort,
  formatAppointmentTime,
} from "./time";

/**
 * Every appointment SMS body, in one place.
 *
 * Pure functions over a plain object — no database, no Twilio, no environment
 * beyond the site URL. That is what makes the copy testable: the suite asserts
 * on branding, on STOP/HELP language and on the rendered date without touching
 * a provider.
 *
 * ---------------------------------------------------------------------------
 * TWO RULES THAT ARE NOT STYLE PREFERENCES
 * ---------------------------------------------------------------------------
 * 1. GSM-7 only. An em dash, a curly apostrophe or an ellipsis character forces
 *    the whole message into UCS-2, which cuts the segment size from 160
 *    characters to 70 and roughly triples the cost of a message that looked
 *    fine in a code review. Plain hyphens and straight quotes throughout.
 *
 * 2. Customer-facing bodies carry opt-out language. Twilio's Advanced Opt-Out
 *    handles the STOP/HELP *replies* on the Messaging Service, but the carriers
 *    check that the message itself tells the recipient how to leave.
 */

export type AppointmentEventType =
  | "customer_confirmation"
  | "owner_notification"
  | "reminder_24h"
  | "reminder_2h"
  | "rescheduled"
  | "canceled"
  | "followup"
  | "review_request";

/** The fields any appointment message may need. Deliberately not the DB row. */
export interface AppointmentMessageContext {
  id: string;
  name: string;
  /** Ten digits, as stored. */
  phone: string;
  serviceType: AppointmentServiceType;
  scheduledFor: Date | string;
  timeZone?: string;
  notes?: string | null;
  applianceLabel?: string | null;
}

const OPT_OUT = "Reply STOP to opt out.";
const HELP_AND_OPT_OUT = "Reply HELP for help or STOP to opt out.";

/** Longest run of customer-typed text allowed into the owner's alert. */
const NOTES_LIMIT = 140;

function zoneOf(appointment: AppointmentMessageContext): string {
  return appointment.timeZone || BUSINESS_TIME_ZONE;
}

/**
 * "your warehouse visit appointment" / "your appointment".
 *
 * `other` gets the generic phrasing: "Your something else appointment is
 * confirmed" is worse than saying nothing.
 */
function serviceClause(serviceType: AppointmentServiceType): string {
  if (serviceType === "other") return "Your appointment";
  return `Your ${APPOINTMENT_SERVICE_LABELS[serviceType].toLowerCase()} appointment`;
}

/**
 * Collapses newlines and clips length.
 *
 * The owner's alert is a single scannable block, so a note with hard line breaks
 * in it would forge the "Field: value" structure the rest of the message uses.
 */
function oneLine(value: string | null | undefined, limit = NOTES_LIMIT): string {
  if (!value) return "";
  const flattened = value.replace(/\s+/g, " ").trim();
  if (flattened.length <= limit) return flattened;
  return `${flattened.slice(0, limit - 1).trimEnd()}...`;
}

/**
 * Deep link to the booking in the admin, or "" when no canonical domain is
 * configured. Never emits a localhost URL into a real text message: an owner
 * tapping a dead link is worse than no link.
 */
function adminAppointmentsUrl(): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!origin || !/^https?:\/\//.test(origin) || origin.includes("localhost")) return "";
  return `${origin}/admin/appointments`;
}

/* -------------------------------------------------------------------------- */
/* Live today                                                                  */
/* -------------------------------------------------------------------------- */

export function customerConfirmationBody(appointment: AppointmentMessageContext): string {
  const when = formatAppointmentDateTime(appointment.scheduledFor, zoneOf(appointment));
  return [
    `${siteConfig.name}: ${serviceClause(appointment.serviceType)} is confirmed for ${when}.`,
    "We'll contact you if anything changes.",
    HELP_AND_OPT_OUT,
  ].join(" ");
}

/**
 * The owner's alert. Multi-line on purpose: this is the one message read on a
 * phone while standing in a warehouse, and it has to answer "who, when, what"
 * without opening anything.
 *
 * No opt-out language: this is an internal alert to the business's own handset,
 * not application-to-person marketing traffic.
 */
export function ownerNotificationBody(appointment: AppointmentMessageContext): string {
  const lines = [
    `${siteConfig.name} - New appointment`,
    `Customer: ${oneLine(appointment.name, 60)}`,
    `Phone: ${formatPhoneNumber(appointment.phone)}`,
    `Date: ${formatAppointmentShort(appointment.scheduledFor, zoneOf(appointment))}`,
    `Service: ${APPOINTMENT_SERVICE_LABELS[appointment.serviceType]}`,
  ];

  const appliance = oneLine(appointment.applianceLabel, 60);
  if (appliance) lines.push(`Appliance: ${appliance}`);

  const notes = oneLine(appointment.notes);
  if (notes) lines.push(`Notes: ${notes}`);

  const url = adminAppointmentsUrl();
  if (url) lines.push(`View: ${url}`);

  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Structured for later — see STEP 10 of the brief and the notes in            */
/* `notifications.ts` on how to schedule these.                                */
/* -------------------------------------------------------------------------- */

export function reminder24hBody(appointment: AppointmentMessageContext): string {
  const when = formatAppointmentDateTime(appointment.scheduledFor, zoneOf(appointment));
  return `${siteConfig.name}: Reminder - your appointment is tomorrow, ${when}. Reply if you need assistance. ${OPT_OUT}`;
}

export function reminder2hBody(appointment: AppointmentMessageContext): string {
  const time = formatAppointmentTime(appointment.scheduledFor, zoneOf(appointment));
  return `${siteConfig.name}: Reminder - your appointment is scheduled for ${time} today. ${OPT_OUT}`;
}

export function rescheduledBody(appointment: AppointmentMessageContext): string {
  const when = formatAppointmentDateTime(appointment.scheduledFor, zoneOf(appointment));
  return `${siteConfig.name}: Your appointment has been rescheduled to ${when}. ${OPT_OUT}`;
}

export function canceledBody(appointment: AppointmentMessageContext): string {
  const when = formatAppointmentDateTime(appointment.scheduledFor, zoneOf(appointment));
  return `${siteConfig.name}: Your appointment for ${when} has been canceled. Contact us if you'd like to reschedule. ${OPT_OUT}`;
}

export function followupBody(): string {
  return `${siteConfig.name}: Thanks for choosing ${siteConfig.name}. If you need anything else, reply to this message and we'll be happy to help. ${OPT_OUT}`;
}

/**
 * Review requests are structured but not wired up: the site deliberately carries
 * no review automation and no fabricated social proof (see the content rules in
 * the README), so switching this on is a business decision, not a code one.
 */
export function reviewRequestBody(): string {
  return `${siteConfig.name}: Thanks again for your visit. If we did right by you, a quick review helps a small family business more than you'd think. ${OPT_OUT}`;
}

/**
 * Single dispatch point from event type to body.
 *
 * A `Record` rather than a switch so that adding an event to
 * `AppointmentEventType` is a type error here until the copy exists — the
 * failure surfaces at compile time instead of as a customer receiving "".
 */
export const APPOINTMENT_MESSAGE_BUILDERS: Record<
  AppointmentEventType,
  (appointment: AppointmentMessageContext) => string
> = {
  customer_confirmation: customerConfirmationBody,
  owner_notification: ownerNotificationBody,
  reminder_24h: reminder24hBody,
  reminder_2h: reminder2hBody,
  rescheduled: rescheduledBody,
  canceled: canceledBody,
  followup: () => followupBody(),
  review_request: () => reviewRequestBody(),
};

/** Which events go to the customer, and which to the shop. */
export const APPOINTMENT_EVENT_AUDIENCE: Record<AppointmentEventType, "customer" | "owner"> = {
  customer_confirmation: "customer",
  owner_notification: "owner",
  reminder_24h: "customer",
  reminder_2h: "customer",
  rescheduled: "customer",
  canceled: "customer",
  followup: "customer",
  review_request: "customer",
};
