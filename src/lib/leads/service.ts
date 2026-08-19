import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { sendCustomerConfirmation, sendInternalLeadNotification } from "./notifications";
import { dispatchLeadSms } from "./sms";
import type { LeadData } from "./schema";

export interface RecordedLead {
  /** The lead reached somewhere the business can retrieve it from. */
  ok: boolean;
  id: string | null;
  /** A row exists in `leads`. */
  persisted: boolean;
  /** The owner alert was accepted by the email provider. */
  notified: boolean;
}

/**
 * Persists a lead, then notifies.
 *
 * Ordering matters: the database write happens first and its result decides what
 * the visitor sees. Notifications run afterwards and can fail without affecting
 * the submission — an email outage must never look like a failed form to a
 * customer who already gave us their number.
 *
 * WHAT `ok` ACTUALLY MEANS
 *
 * It is not "nothing threw". It is "at least one durable copy of this lead
 * exists": a row in `leads`, or an owner alert the email provider accepted. If
 * both routes fail the lead is gone, and the visitor has to be told so — they
 * are standing there believing the warehouse has their number. Reporting success
 * in that state is the single most expensive lie this form can tell, because the
 * customer stops trying.
 */
export async function recordLead(lead: LeadData): Promise<RecordedLead> {
  const client = getSupabaseAdminClient();
  let id: string | null = null;
  let persisted = false;

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
        click_id: lead.clickId || null,
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
      persisted = true;
    }
  }

  if (!persisted) {
    // Nothing is in the database. Log the whole lead so it is at least
    // recoverable by hand from the hosting platform's logs, then let the email
    // path decide whether the visitor sees success.
    console.warn(
      "[leads] not persisted — recoverable from this log line only:",
      JSON.stringify({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        zip: lead.zip,
        inquiryType: lead.inquiryType,
        appliance: lead.applianceLabel,
        message: lead.message,
        source: lead.source,
        campaign: lead.utmCampaign,
        clickId: lead.clickId,
        landingPage: lead.landingPage,
      }),
    );
  }

  // Fire and await together; each helper swallows its own errors and reports
  // back whether the message actually went out.
  const [notification] = await Promise.allSettled([
    sendInternalLeadNotification(lead),
    sendCustomerConfirmation(lead),
    dispatchLeadSms(lead),
  ]);

  const notified = notification.status === "fulfilled" && notification.value;

  return { ok: persisted || notified, id, persisted, notified };
}
