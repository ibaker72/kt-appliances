"use server";

import { headers } from "next/headers";

import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { recordLead } from "@/lib/leads/service";
import { leadSchema, type LeadFormState } from "@/lib/leads/schema";
import { siteConfig } from "@/lib/site-config";

const SUCCESS_MESSAGE =
  "Thanks — we got your request. Someone from the warehouse will follow up shortly. Need an answer now? Call or text us.";

/**
 * Shown when the submission reached nothing durable. It names the phone number
 * rather than asking the visitor to try again, because a retry hits the same
 * broken path and the point is to keep the customer, not the form.
 */
const FAILURE_MESSAGE = `We couldn't save your request — something is wrong at our end, not yours. Please call or text us at ${siteConfig.phone.display} and we'll take care of it right away.`;

/** The fields a visitor types. Never the honeypot, never the attribution. */
const ECHOED_FIELDS = ["name", "phone", "zip", "email", "message"] as const;

function typedValues(raw: Record<string, FormDataEntryValue>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of ECHOED_FIELDS) {
    const value = raw[field];
    if (typeof value === "string") values[field] = value;
  }
  return values;
}

/**
 * Single entry point for every inquiry form on the site.
 *
 * Defence in depth: honeypot field, per-IP rate limit, then schema validation.
 * Nothing reaches the database or an email provider until all three pass.
 */
export async function submitLead(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const raw = Object.fromEntries(formData.entries());

  // Honeypot — hidden from humans, irresistible to bots.
  if (typeof raw.website === "string" && raw.website.trim().length > 0) {
    // Report success so the bot has nothing to learn from the response.
    return { status: "success", message: SUCCESS_MESSAGE };
  }

  const requestHeaders = await headers();
  const limit = checkRateLimit(clientKey(requestHeaders, "lead"), 5, 60_000);
  if (!limit.ok) {
    return {
      status: "error",
      message: `Too many submissions. Try again in ${limit.retryAfter} seconds, or call us directly.`,
    };
  }

  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field]) errors[field] = issue.message;
    }
    return {
      status: "error",
      message: "Please check the highlighted fields and try again.",
      errors,
      values: typedValues(raw),
    };
  }

  try {
    const result = await recordLead(parsed.data);
    if (!result.ok) {
      // Neither the database nor the email alert took it. Saying "thanks, we'll
      // be in touch" here would send someone away believing the warehouse has
      // their number when nothing does.
      return { status: "error", message: FAILURE_MESSAGE };
    }
  } catch (error) {
    console.error("[leads] submission failed:", error);
    return { status: "error", message: FAILURE_MESSAGE };
  }

  return { status: "success", message: SUCCESS_MESSAGE };
}
