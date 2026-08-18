import { z } from "zod";

import {
  APPLIANCE_CATEGORIES,
  APPLIANCE_CONDITIONS,
  APPLIANCE_STATUSES,
  FUEL_TYPES,
} from "@/lib/inventory/types";

/**
 * Validation for the admin appliance form.
 *
 * Only five fields are genuinely required — title, brand, category, price and
 * condition. Everything else is optional so a unit can be photographed and
 * listed from a phone in the warehouse in under a minute, then filled in later.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .default("")
    .transform((value) => value || "");

/** Accepts "1,299", "$1299" or "1299"; empty string becomes null. */
const money = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((value) => value.replace(/[^0-9]/g, ""))
  .transform((digits) => (digits === "" ? null : Number.parseInt(digits, 10)))
  .refine((value) => value === null || (Number.isFinite(value) && value >= 0), "Enter a valid price");

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal(""), z.undefined()])
  .transform((value) => value === "on" || value === "true");

export const applianceFormSchema = z
  .object({
    id: optionalText(64),
    slug: optionalText(160),
    sku: optionalText(64),

    title: z.string().trim().min(3, "Enter a product name").max(200),
    brand: z.string().trim().min(1, "Enter the brand").max(80),
    modelNumber: optionalText(80),
    category: z.enum(APPLIANCE_CATEGORIES, { message: "Choose a category" }),
    subcategory: optionalText(80),
    description: optionalText(4000),

    condition: z.enum(APPLIANCE_CONDITIONS).default("scratch-and-dent"),
    cosmeticNotes: optionalText(2000),
    functionalNotes: optionalText(2000),

    price: z
      .string()
      .trim()
      .min(1, "Enter a price")
      .transform((value) => value.replace(/[^0-9]/g, ""))
      .refine((digits) => digits.length > 0, "Enter a price")
      .transform((digits) => Number.parseInt(digits, 10))
      .refine((value) => Number.isFinite(value) && value >= 0, "Enter a valid price"),
    compareAtPrice: money,

    quantity: z
      .string()
      .trim()
      .optional()
      .default("1")
      .transform((value) => {
        const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
        return Number.isFinite(parsed) ? parsed : 1;
      }),

    status: z.enum(APPLIANCE_STATUSES).default("available"),

    color: optionalText(60),
    finish: optionalText(80),
    dimensions: optionalText(160),
    capacity: optionalText(80),
    fuelType: z
      .union([z.enum(FUEL_TYPES), z.literal("")])
      .optional()
      .default(""),

    warrantyAvailable: checkbox,
    deliveryAvailable: checkbox,
    installationAvailable: checkbox,
    haulAwayAvailable: checkbox,
    featured: checkbox,
    published: checkbox,
  })
  .refine(
    (data) => data.compareAtPrice === null || data.compareAtPrice > data.price,
    {
      message: "A retail comparison must be higher than the KT price. Leave it blank if you don't have a verified one.",
      path: ["compareAtPrice"],
    },
  );

export type ApplianceFormInput = z.input<typeof applianceFormSchema>;
export type ApplianceFormData = z.output<typeof applianceFormSchema>;

export interface AdminFormState {
  status: "idle" | "success" | "error";
  message: string;
  errors?: Record<string, string>;
  /** Set on successful create so the UI can link to the new record. */
  applianceId?: string;
}

export const initialAdminFormState: AdminFormState = { status: "idle", message: "" };

/* -------------------------------------------------------------------------- */
/* Damage spots                                                                */
/* -------------------------------------------------------------------------- */

/** Enough for any honest unit; more than this reads as noise, not disclosure. */
export const MAX_DAMAGE_SPOTS = 12;

/**
 * One damage location, as saved from the admin editor. Coordinates are 0–1
 * fractions of the primary photo's own box; `imageId` optionally names the
 * close-up image of the spot.
 */
export const damageSpotSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  label: z
    .string()
    .trim()
    .min(3, "Describe the spot — e.g. \"Dent, lower left door — 2 inches\".")
    .max(160),
  imageId: z
    .string()
    .trim()
    .max(64)
    .nullish()
    .transform((value) => value || null),
});

export const damageSpotsSchema = z
  .array(damageSpotSchema)
  .max(MAX_DAMAGE_SPOTS, `Keep it to ${MAX_DAMAGE_SPOTS} spots — group nearby marks into one.`);

/* -------------------------------------------------------------------------- */
/* Image uploads                                                               */
/* -------------------------------------------------------------------------- */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB — matches the storage bucket limit
export const MAX_IMAGES_PER_UPLOAD = 8;

/** Rejects anything that is not a plausible image before it reaches storage. */
export function validateImageFile(file: File): string | null {
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name} is larger than 10 MB. Photos taken on a phone are usually fine — try again, or reduce the size.`;
  }
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name} is not a supported image (JPEG, PNG, WebP or AVIF).`;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Login form state                                                            */
/* -------------------------------------------------------------------------- */

export interface LoginState {
  status: "idle" | "error";
  message: string;
}

export const initialLoginState: LoginState = { status: "idle", message: "" };
