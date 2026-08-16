import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { sendCustomerConfirmation, sendInternalLeadNotification } from "./notifications";
import { dispatchLeadSms } from "./sms";
import type { LeadData } from "./schema";

/**
 * Persists a lead, then notifies.
 *
 * Ordering matters: the database write happens first and its result decides what
 * the visitor sees. Notifications run afterwards and can fail without affecting
 * the submission — an email outage must never look like a failed form to a
 * customer who already gave us their number.
 */
export async function recordLead(lead: LeadData): Promise<{ ok: boolean; id: string | null }> {
  const client = getSupabaseAdminClient();
  let id: string | null = null;

  if (client) {
    const { data, error } = await client
      .from("leads")
      .insert({
        name: lead.name,
        phone: lead.phone,
        email: lead.email || null,
        zip: lead.zip || null,
        appliance_id: lead.applianceId || null,
        appliance_label: lead.applianceLabel || null,
        inquiry_type: lead.inquiryType,
        message: lead.message || null,
        source: lead.source || null,
        utm_source: lead.utmSource || null,
        utm_medium: lead.utmMedium || null,
        utm_campaign: lead.utmCampaign || null,
        utm_content: lead.utmContent || null,
        utm_term: lead.utmTerm || null,
        landing_page: lead.landingPage || null,
        referrer: lead.referrer || null,
        form_location: lead.formLocation || null,
        status: "new",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[leads] insert failed:", error.message);
    } else {
      id = (data?.id as string) ?? null;
    }
  } else {
    // No database configured yet. Log enough to recover the lead by hand so a
    // submission is never silently dropped during initial setup.
    console.warn(
      "[leads] no database configured — lead captured in logs only:",
      JSON.stringify({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        zip: lead.zip,
        inquiryType: lead.inquiryType,
        appliance: lead.applianceLabel,
        source: lead.source,
        campaign: lead.utmCampaign,
        landingPage: lead.landingPage,
      }),
    );
  }

  // Fire and await together; each helper swallows its own errors.
  await Promise.allSettled([
    sendInternalLeadNotification(lead),
    sendCustomerConfirmation(lead),
    dispatchLeadSms(lead),
  ]);

  return { ok: true, id };
}
