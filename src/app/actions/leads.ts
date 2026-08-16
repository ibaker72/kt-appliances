"use server";

import { headers } from "next/headers";

import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { recordLead } from "@/lib/leads/service";
import { leadSchema, type LeadFormState } from "@/lib/leads/schema";

const SUCCESS_MESSAGE =
  "Thanks — we got your request. Someone from the warehouse will follow up shortly. Need an answer now? Call or text us.";

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
    };
  }

  try {
    await recordLead(parsed.data);
  } catch (error) {
    console.error("[leads] submission failed:", error);
    return {
      status: "error",
      message: "Something went wrong on our end. Please call or text us and we'll take care of it.",
    };
  }

  return { status: "success", message: SUCCESS_MESSAGE };
}
