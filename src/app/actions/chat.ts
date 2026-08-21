"use server";

import { headers } from "next/headers";

import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import {
  appointmentSchema,
  type AppointmentServiceType,
} from "@/lib/appointments/schema";
import {
  appointmentPurpose,
  isAppointmentPurposeId,
  type AppointmentPurposeId,
} from "@/lib/appointments/purposes";
import {
  AppointmentPersistenceError,
  AppointmentSlotTakenError,
  bookAppointment,
} from "@/lib/appointments/service";
import { formatAppointmentDateTime } from "@/lib/appointments/time";
import { applianceLabelFor, getChatAppliance } from "@/lib/chat/inventory-tools";
import { CHAT_LEAD_FLOWS, type ChatLeadFlow } from "@/lib/chat/types";
import { leadSchema, type InquiryType } from "@/lib/leads/schema";
import { recordLead } from "@/lib/leads/service";
import { maskPhoneNumber } from "@/lib/sms/phone";
import { siteConfig } from "@/lib/site-config";

/**
 * The two things the assistant can write.
 *
 * Server actions rather than route handlers, because that is what the rest of
 * this codebase uses for a form submission and it means the chat panel goes
 * through exactly the same validation, rate limiting and persistence as
 * `/schedule` and every lead form on the site — `appointmentSchema` →
 * `bookAppointment`, and `leadSchema` → `recordLead`. There is no second booking
 * path and no second lead pipeline to keep in step.
 *
 * Both are reachable by a crafted request, like any server action, so both carry
 * the same three gates the existing actions do: honeypot, per-IP rate limit,
 * schema. Neither trusts a single fact the panel sends about an appliance — the
 * unit is re-read from the database by id here, and only what the database
 * returns is written onto the record.
 */

/* -------------------------------------------------------------------------- */
/* Shared                                                                      */
/* -------------------------------------------------------------------------- */

/** Attribution the panel captures from the same helper the site's forms use. */
export interface ChatAttribution {
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPage?: string;
  referrer?: string;
}

function attributionFields(attribution: ChatAttribution | undefined) {
  return {
    source: attribution?.source ?? "website_chat",
    utmSource: attribution?.utmSource ?? "",
    utmMedium: attribution?.utmMedium ?? "",
    utmCampaign: attribution?.utmCampaign ?? "",
    utmContent: attribution?.utmContent ?? "",
    utmTerm: attribution?.utmTerm ?? "",
    landingPage: attribution?.landingPage ?? "",
    referrer: attribution?.referrer ?? "",
  };
}

/**
 * Resolves the appliance the panel claims to be about.
 *
 * Returns the label and the id *from the database row*, or nothing. A panel
 * that sends an id for a draft, an unpublished unit or something that never
 * existed gets a booking with no appliance attached rather than a booking
 * carrying a fabricated one.
 */
async function resolveAppliance(applianceId: string | undefined) {
  if (!applianceId) return { id: "", slug: "", label: "" };
  const resolved = await getChatAppliance({ id: applianceId });
  if (!resolved) return { id: "", slug: "", label: "" };
  return {
    id: resolved.product.id,
    slug: resolved.product.slug,
    label: applianceLabelFor(resolved.product),
  };
}

/* -------------------------------------------------------------------------- */
/* Appointments                                                                */
/* -------------------------------------------------------------------------- */

export interface ChatAppointmentInput {
  name: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  purpose: string;
  notes?: string;
  smsConsent?: boolean;
  applianceId?: string;
  /** Minted once per form mount, so a retry collapses onto one booking. */
  submissionToken: string;
  pathname?: string;
  attribution?: ChatAttribution;
  /** Honeypot. Hidden from humans. */
  website?: string;
}

export type ChatAppointmentResult =
  | {
      status: "success";
      whenLabel: string;
      purposeLabel: string;
      applianceLabel: string | null;
      name: string;
      smsConfirmationSent: boolean;
      maskedPhone: string;
    }
  | {
      status: "error";
      message: string;
      /** Field-level messages keyed by input name. */
      errors?: Record<string, string>;
      /** Set when the slot went — the panel reopens the picker rather than the form. */
      slotTaken?: boolean;
    };

/** Bookings are rare events. Five in five minutes is generous for a person. */
const APPOINTMENT_LIMIT = { max: 5, windowMs: 5 * 60_000 };

export async function bookChatAppointment(
  input: ChatAppointmentInput,
): Promise<ChatAppointmentResult> {
  if (typeof input.website === "string" && input.website.trim().length > 0) {
    // Report a plausible success so a bot learns nothing. Nothing was written.
    return {
      status: "success",
      whenLabel: "",
      purposeLabel: "",
      applianceLabel: null,
      name: input.name ?? "",
      smsConfirmationSent: false,
      maskedPhone: "",
    };
  }

  const requestHeaders = await headers();
  const limit = checkRateLimit(
    clientKey(requestHeaders, "chat-appointment"),
    APPOINTMENT_LIMIT.max,
    APPOINTMENT_LIMIT.windowMs,
  );
  if (!limit.ok) {
    return {
      status: "error",
      message: `Too many booking attempts. Try again shortly, or call ${siteConfig.phone.display}.`,
    };
  }

  const purposeId: AppointmentPurposeId = isAppointmentPurposeId(input.purpose)
    ? input.purpose
    : "warehouse-visit";
  const purpose = appointmentPurpose(purposeId);
  const serviceType: AppointmentServiceType = purpose.serviceType;

  const appliance = await resolveAppliance(input.applianceId);

  const parsed = appointmentSchema.safeParse({
    name: input.name,
    phone: input.phone,
    email: input.email ?? "",
    date: input.date,
    time: input.time,
    serviceType,
    purpose: purposeId,
    notes: input.notes ?? "",
    smsConsent: input.smsConsent === true,
    applianceId: appliance.id,
    applianceSlug: appliance.slug,
    applianceLabel: appliance.label,
    submissionToken: input.submissionToken,
    formLocation: "website_chat_appointment",
    ...attributionFields(input.attribution),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field]) errors[field] = issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", errors };
  }

  const appointment = parsed.data;

  try {
    const result = await bookAppointment(appointment);

    return {
      status: "success",
      name: appointment.name,
      whenLabel: formatAppointmentDateTime(appointment.scheduledFor, appointment.timeZone),
      purposeLabel: purpose.label,
      applianceLabel: appliance.label || null,
      // Claimed only when a text genuinely went out. A skipped send (no consent,
      // SMS off while A2P is pending) and a failed one both read false.
      smsConfirmationSent: result.notifications.customer.status === "sent",
      maskedPhone: maskPhoneNumber(appointment.phone),
    };
  } catch (error) {
    if (error instanceof AppointmentSlotTakenError) {
      return {
        status: "error",
        message: "That time was just booked by someone else. Pick another and we'll lock it in.",
        slotTaken: true,
      };
    }
    if (error instanceof AppointmentPersistenceError) {
      console.error("[chat] appointment failed to persist:", error.message);
      return {
        status: "error",
        message: `We couldn't complete the booking. Please call or text ${siteConfig.phone.display} and we'll book it for you.`,
      };
    }
    console.error("[chat] appointment submission failed:", error);
    return {
      status: "error",
      message: `Something went wrong on our end. Call or text ${siteConfig.phone.display} and we'll take care of it.`,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Leads                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Chat flows mapped onto the inquiry types the leads table and the owner's alert
 * already understand. No new lead category, no parallel table.
 */
const FLOW_INQUIRY: Record<ChatLeadFlow, InquiryType> = {
  "delivery-quote": "delivery",
  "availability-check": "appliance",
  financing: "financing",
  callback: "general",
};

/** Confirmation copy per flow, so the panel never says something generic. */
const FLOW_CONFIRMATION: Record<ChatLeadFlow, string> = {
  "delivery-quote":
    "Got it. We'll work out the delivery price for your ZIP and get back to you with a real number.",
  "availability-check":
    "Got it. We'll check the unit and let you know before you make the trip.",
  financing: "Got it. Someone will walk you through the financing options.",
  callback: "Got it. Someone from the warehouse will get back to you shortly.",
};

export interface ChatLeadInput {
  flow: string;
  name: string;
  phone: string;
  email?: string;
  zip?: string;
  message?: string;
  applianceId?: string;
  pathname?: string;
  attribution?: ChatAttribution;
  website?: string;
}

export type ChatLeadResult =
  | { status: "success"; text: string }
  | { status: "error"; message: string; errors?: Record<string, string> };

const LEAD_LIMIT = { max: 5, windowMs: 60_000 };

export async function submitChatLead(input: ChatLeadInput): Promise<ChatLeadResult> {
  const flow = CHAT_LEAD_FLOWS.find((entry) => entry === input.flow);
  if (!flow) {
    return { status: "error", message: "Something went wrong on our end." };
  }

  if (typeof input.website === "string" && input.website.trim().length > 0) {
    return { status: "success", text: FLOW_CONFIRMATION[flow] };
  }

  const requestHeaders = await headers();
  const limit = checkRateLimit(
    clientKey(requestHeaders, "chat-lead"),
    LEAD_LIMIT.max,
    LEAD_LIMIT.windowMs,
  );
  if (!limit.ok) {
    return {
      status: "error",
      message: `Too many submissions. Try again shortly, or call ${siteConfig.phone.display}.`,
    };
  }

  const appliance = await resolveAppliance(input.applianceId);

  const parsed = leadSchema.safeParse({
    name: input.name,
    phone: input.phone,
    email: input.email ?? "",
    zip: input.zip ?? "",
    message: input.message ?? "",
    inquiryType: FLOW_INQUIRY[flow],
    applianceId: appliance.id,
    applianceSlug: appliance.slug,
    applianceLabel: appliance.label,
    // `source` stays the campaign that produced the visit; where in the site the
    // lead came from is `form_location`, which is what the admin filters on.
    formLocation: `website_chat_${flow}`,
    ...attributionFields(input.attribution),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field]) errors[field] = issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", errors };
  }

  try {
    const result = await recordLead(parsed.data);
    if (!result.ok) {
      // Neither the database nor the email alert took it. Telling someone "we'll
      // be in touch" here sends them away believing the warehouse has their
      // number when nothing does.
      return {
        status: "error",
        message: `We couldn't save that — something is wrong at our end. Please call or text ${siteConfig.phone.display}.`,
      };
    }
  } catch (error) {
    console.error("[chat] lead submission failed:", error);
    return {
      status: "error",
      message: `We couldn't save that — something is wrong at our end. Please call or text ${siteConfig.phone.display}.`,
    };
  }

  return { status: "success", text: FLOW_CONFIRMATION[flow] };
}
