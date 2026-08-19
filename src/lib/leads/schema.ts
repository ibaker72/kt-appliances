import { z } from "zod";

export const INQUIRY_TYPES = [
  "appliance",
  "delivery",
  "financing",
  "installation",
  "after-hours",
  "general",
] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number];

export const LEAD_STATUSES = ["new", "contacted", "quoted", "won", "lost", "spam"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const INQUIRY_LABELS: Record<InquiryType, string> = {
  appliance: "Appliance inquiry",
  delivery: "Delivery request",
  financing: "Financing question",
  installation: "Installation request",
  "after-hours": "After-hours appointment",
  general: "General question",
};

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
 * Server-side validation for every inquiry form.
 *
 * `website` is a honeypot: it is visually hidden and never filled by a human, so
 * any submission carrying a value is dropped as spam.
 */
export const leadSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  phone: phoneSchema,
  email: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value.length === 0 || z.email().safeParse(value).success, "Enter a valid email")
    .optional()
    .default(""),
  zip: zipSchema.optional().default(""),
  message: z.string().trim().max(2000).optional().default(""),
  inquiryType: z.enum(INQUIRY_TYPES).default("general"),

  // Context attached by the form, not typed by the visitor.
  applianceId: z.string().trim().max(64).optional().default(""),
  applianceSlug: z.string().trim().max(160).optional().default(""),
  applianceLabel: z.string().trim().max(240).optional().default(""),

  // Attribution.
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
   * `gclid` / `fbclid` from the inbound ad click.
   *
   * Not decoration: importing offline conversions back into Google Ads is keyed
   * on the `gclid`, so without it the platform can never learn that a click
   * became a sale. Captured alongside the UTMs and stored on the lead.
   */
  clickId: z.string().trim().max(255).optional().default(""),

  website: z.string().max(200).optional().default(""),
});

export type LeadInput = z.input<typeof leadSchema>;
export type LeadData = z.output<typeof leadSchema>;

export interface LeadFormState {
  status: "idle" | "success" | "error";
  message: string;
  /** Field-level messages keyed by input name. */
  errors?: Record<string, string>;
  /**
   * What the visitor typed, echoed back so a rejected submission does not empty
   * the form.
   *
   * React resets an uncontrolled form after a form action completes, so without
   * this a customer who mistypes one digit of their phone number loses their
   * name, ZIP, email and message along with it — on the single most valuable
   * path on the site. Only the fields a person actually types are echoed; the
   * honeypot and the attribution fields deliberately are not.
   */
  values?: Record<string, string>;
}

export const initialLeadFormState: LeadFormState = { status: "idle", message: "" };
