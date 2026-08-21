import {
  APPOINTMENT_SERVICE_LABELS,
  type AppointmentServiceType,
} from "./schema";
import type { InquiryType } from "@/lib/leads/schema";

/**
 * What a visitor can book, in the words they would use.
 *
 * `appointment_service_type` in Postgres is the operational classification — six
 * values the warehouse actually schedules around, and the thing the owner's
 * alerts and the admin filter on. It is deliberately coarse. A shopper reading
 * a chat panel is choosing between "come see this fridge" and "talk about
 * financing", which are both `warehouse-visit` and `other` respectively, and
 * neither label means anything to them.
 *
 * So the menu lives here, once, as data: each entry maps a customer-facing
 * purpose onto the service type that files it correctly, and carries the label
 * that goes on the appointment record and into the owner's email. Adding or
 * renaming a purpose is an edit to this array — not a change to an enum, a
 * migration, or a switch statement in a component.
 *
 * Pure module: the chat panel renders these and the server validates against
 * them, so both sides read the same list.
 */

export const APPOINTMENT_PURPOSES = [
  {
    id: "view-appliance",
    label: "View an appliance",
    /** Shown when the visitor is already looking at a listing. */
    contextualLabel: "See this appliance",
    description: "We'll pull the unit to the front and have it powered up.",
    serviceType: "warehouse-visit",
    inquiryType: "appliance",
  },
  {
    id: "warehouse-visit",
    label: "Visit the warehouse",
    description: "Browse what's on the floor with someone to walk you through it.",
    serviceType: "warehouse-visit",
    inquiryType: "general",
  },
  {
    id: "pickup",
    label: "Pick up an appliance",
    description: "Bring a truck or trailer — we'll have it ready and help you load.",
    serviceType: "pickup",
    inquiryType: "general",
  },
  {
    id: "delivery-consult",
    label: "Talk about delivery",
    description: "Work out timing and cost for your address.",
    serviceType: "delivery",
    inquiryType: "delivery",
  },
  {
    id: "financing",
    label: "Talk about financing",
    description: "Go through the options for the purchase you have in mind.",
    serviceType: "other",
    inquiryType: "financing",
  },
  {
    id: "installation",
    label: "Talk about installation",
    description: "Hook-up, fitting and haul-away of the old unit.",
    serviceType: "installation",
    inquiryType: "installation",
  },
  {
    id: "other",
    label: "Something else",
    description: "Tell us what you need and we'll set the time aside.",
    serviceType: "other",
    inquiryType: "general",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  contextualLabel?: string;
  description: string;
  serviceType: AppointmentServiceType;
  inquiryType: InquiryType;
}>;

export type AppointmentPurposeId = (typeof APPOINTMENT_PURPOSES)[number]["id"];

export type AppointmentPurpose = (typeof APPOINTMENT_PURPOSES)[number];

export const APPOINTMENT_PURPOSE_IDS = APPOINTMENT_PURPOSES.map(
  (purpose) => purpose.id,
) as AppointmentPurposeId[];

export function isAppointmentPurposeId(value: string): value is AppointmentPurposeId {
  return (APPOINTMENT_PURPOSE_IDS as readonly string[]).includes(value);
}

export function appointmentPurpose(id: AppointmentPurposeId): AppointmentPurpose {
  // Non-null by construction — `id` is the union of the array's own ids.
  return APPOINTMENT_PURPOSES.find((purpose) => purpose.id === id) as AppointmentPurpose;
}

/**
 * The label to show for a purpose, given what the visitor is looking at.
 *
 * On an appliance page "See this appliance" is unambiguous and needs no further
 * search; everywhere else the same option has to name the thing generically.
 */
export function appointmentPurposeLabel(
  purpose: AppointmentPurpose,
  hasApplianceContext: boolean,
): string {
  if (hasApplianceContext && "contextualLabel" in purpose && purpose.contextualLabel) {
    return purpose.contextualLabel;
  }
  return purpose.label;
}

/**
 * Human-readable description of a stored appointment's reason.
 *
 * `purpose` is nullable on the table — every booking made through the website
 * form before this column existed has none — so this falls back to the service
 * type rather than rendering a blank cell in the admin.
 */
export function describeAppointmentPurpose(
  purposeId: string | null,
  serviceType: AppointmentServiceType,
): string {
  if (purposeId && isAppointmentPurposeId(purposeId)) {
    return appointmentPurpose(purposeId).label;
  }
  return APPOINTMENT_SERVICE_LABELS[serviceType];
}
