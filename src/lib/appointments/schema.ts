import { z } from "zod";

import {
  BUSINESS_TIME_ZONE,
  MAX_DAYS_AHEAD,
  MIN_LEAD_TIME_MINUTES,
  wallTimeToUtc,
} from "./time";

/**
 * Appointment booking — server-side validation.
 *
 * Modelled directly on `src/lib/leads/schema.ts`: same phone normalisation, same
 * honeypot field, same `FormState` shape, so both forms behave identically and
 * the admin renders both from the same primitives.
 */

export const APPOINTMENT_SERVICE_TYPES = [
  "warehouse-visit",
  "after-hours-visit",
  "delivery",
  "installation",
  "pickup",
  "other",
] as const;

export type AppointmentServiceType = (typeof APPOINTMENT_SERVICE_TYPES)[number];

export const APPOINTMENT_SERVICE_LABELS: Record<AppointmentServiceType, string> = {
  "warehouse-visit": "Warehouse visit",
  "after-hours-visit": "After-hours visit",
  delivery: "Delivery",
  installation: "Installation",
  pickup: "Pickup",
  other: "Something else",
};

export const APPOINTMENT_STATUSES = [
  "confirmed",
  "rescheduled",
  "completed",
  "canceled",
  "no-show",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  completed: "Completed",
  canceled: "Canceled",
  "no-show": "No-show",
};

/**
 * The exact disclosure shown next to the consent checkbox.
 *
 * Exported as a constant, and stored verbatim on every consenting appointment,
 * because the compliance question is never "was a boolean true" — it is "what
 * were they told they were agreeing to". If this wording is ever revised, older
 * records keep the wording that was actually on screen when they were captured.
 */
export const SMS_CONSENT_TEXT =
  "I agree to receive text messages from KT Appliances regarding my appointment, order, " +
  "delivery, customer service, and occasional offers. Message frequency varies. Message and " +
  "data rates may apply. Reply STOP to opt out or HELP for help. Consent is not required to " +
  "make a purchase.";

/** Where a consent record came from. Recorded so a future channel is distinguishable. */
export const SMS_CONSENT_SOURCE = "appointment_web_form";

/**
 * Bookable start times, 30 minutes apart.
 *
 * The warehouse opens at 10:00 and after-hours visits run to 21:00, so the last
 * start is 20:30 — booking a 21:00 slot would schedule someone's arrival for the
 * moment the doors lock. Hours come from `siteConfig`; the slot grid is derived
 * here rather than duplicated in the form.
 */
export const APPOINTMENT_SLOTS: readonly string[] = Array.from({ length: 22 }, (_, index) => {
  const minutesFromOpen = index * 30;
  const hour = 10 + Math.floor(minutesFromOpen / 60);
  const minute = minutesFromOpen % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

/** Slots at or after 17:00 are the after-hours window, which the form labels. */
export const AFTER_HOURS_FROM = "17:00";

/** US phone: exactly 10 digits after stripping formatting and an optional +1. */
const phoneSchema = z
  .string()
  .trim()
  .min(1, "Enter a phone number so we can reach you")
  .transform((value) => value.replace(/\D/g, ""))
  .transform((digits) => (digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits))
  .refine((digits) => digits.length === 10, "Enter a valid 10-digit phone number");

const zipSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, "").slice(0, 5))
  .refine((value) => value.length === 0 || value.length === 5, "Enter a 5-digit ZIP code");

/**
 * An HTML checkbox posts `"on"` when ticked and nothing at all when not, so
 * absence is the default and no visitor can be opted in by omission.
 *
 * A crafted request can of course post `smsConsent=on` directly. That is not a
 * hole worth closing here and it is not what "do not trust the client" means in
 * this context: consent only ever unlocks a message to the number supplied in
 * the same request, so the worst an attacker achieves is texting themselves —
 * which the per-IP rate limit already bounds. What matters is that a *real*
 * submission cannot record consent the customer did not give, and that the
 * disclosure and timestamp are written server-side, below.
 */
const consentSchema = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((value) => value === true || value === "on" || value === "true");

export const appointmentSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(120),
    phone: phoneSchema,
    email: z
      .string()
      .trim()
      .max(200)
      .refine(
        (value) => value.length === 0 || z.email().safeParse(value).success,
        "Enter a valid email",
      )
      .optional()
      .default(""),
    zip: zipSchema.optional().default(""),

    serviceType: z.enum(APPOINTMENT_SERVICE_TYPES).default("warehouse-visit"),
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    time: z
      .string()
      .trim()
      .refine((value) => APPOINTMENT_SLOTS.includes(value), "Choose an available time"),

    notes: z.string().trim().max(2000).optional().default(""),

    smsConsent: consentSchema,

    // Context attached by the form, not typed by the visitor.
    applianceId: z.string().trim().max(64).optional().default(""),
    applianceSlug: z.string().trim().max(160).optional().default(""),
    applianceLabel: z.string().trim().max(240).optional().default(""),

    // Attribution — same set the lead form carries.
    source: z.string().trim().max(120).optional().default(""),
    utmSource: z.string().trim().max(120).optional().default(""),
    utmMedium: z.string().trim().max(120).optional().default(""),
    utmCampaign: z.string().trim().max(160).optional().default(""),
    utmContent: z.string().trim().max(160).optional().default(""),
    utmTerm: z.string().trim().max(160).optional().default(""),
    landingPage: z.string().trim().max(500).optional().default(""),
    referrer: z.string().trim().max(500).optional().default(""),
    formLocation: z.string().trim().max(120).optional().default(""),

    /**
     * Minted once per form mount. Carried through every retry of the same
     * submission so the database can collapse duplicates onto one appointment.
     */
    submissionToken: z.string().trim().max(64).optional().default(""),

    website: z.string().max(200).optional().default(""),
  })
  // Date and time are validated as a pair, because neither is meaningful alone:
  // a valid date with a valid time can still be in the past.
  .superRefine((value, ctx) => {
    const scheduledFor = wallTimeToUtc(value.date, value.time, BUSINESS_TIME_ZONE);

    if (!scheduledFor) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Choose a valid date" });
      return;
    }

    const earliest = Date.now() + MIN_LEAD_TIME_MINUTES * 60_000;
    if (scheduledFor.getTime() < earliest) {
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: `Choose a time at least ${MIN_LEAD_TIME_MINUTES} minutes from now`,
      });
    }

    if (scheduledFor.getTime() > Date.now() + MAX_DAYS_AHEAD * 86_400_000) {
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: `Choose a date within the next ${MAX_DAYS_AHEAD} days`,
      });
    }
  })
  .transform((value) => ({
    ...value,
    // Non-null by construction: `superRefine` above short-circuits when the
    // pair does not resolve, so the transform only runs on a valid combination.
    scheduledFor: wallTimeToUtc(value.date, value.time, BUSINESS_TIME_ZONE) as Date,
    timeZone: BUSINESS_TIME_ZONE,
  }));

export type AppointmentInput = z.input<typeof appointmentSchema>;
export type AppointmentData = z.output<typeof appointmentSchema>;

export interface AppointmentFormState {
  status: "idle" | "success" | "error";
  message: string;
  errors?: Record<string, string>;
  /**
   * What the confirmation screen is allowed to claim. Set from the actual
   * notification outcome, never assumed — telling someone a text is on its way
   * when SMS is disabled is the one failure mode this whole flow must not have.
   */
  confirmation?: {
    scheduledForLabel: string;
    smsConfirmationSent: boolean;
    maskedPhone: string;
  };
}

export const initialAppointmentFormState: AppointmentFormState = { status: "idle", message: "" };
