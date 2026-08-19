import "server-only";

import { adminClientConfigProblem, getSupabaseAdminClient } from "@/lib/supabase/client";
import { adminQueryError } from "@/lib/admin/inventory-repo";
import type { InquiryType, LeadStatus } from "@/lib/leads/schema";

export interface AdminLead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  zip: string | null;
  applianceId: string | null;
  applianceLabel: string | null;
  inquiryType: InquiryType;
  message: string | null;
  source: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  /** gclid / fbclid from the ad click, for offline conversion import. */
  clickId: string | null;
  landingPage: string | null;
  formLocation: string | null;
  status: LeadStatus;
  createdAt: string;
}

type Row = Record<string, unknown>;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableStr(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function mapLead(row: Row): AdminLead {
  return {
    id: str(row.id),
    name: str(row.name),
    phone: str(row.phone),
    email: nullableStr(row.email),
    zip: nullableStr(row.zip),
    applianceId: nullableStr(row.appliance_id),
    applianceLabel: nullableStr(row.appliance_label),
    inquiryType: (str(row.inquiry_type) || "general") as InquiryType,
    message: nullableStr(row.message),
    source: nullableStr(row.source),
    utmSource: nullableStr(row.utm_source),
    utmMedium: nullableStr(row.utm_medium),
    utmCampaign: nullableStr(row.utm_campaign),
    utmContent: nullableStr(row.utm_content),
    utmTerm: nullableStr(row.utm_term),
    clickId: nullableStr(row.click_id),
    landingPage: nullableStr(row.landing_page),
    formLocation: nullableStr(row.form_location),
    status: (str(row.status) || "new") as LeadStatus,
    createdAt: str(row.created_at),
  };
}

/** Leads are only ever read through the service role — RLS blocks anon entirely. */
export async function listLeads(options: { status?: LeadStatus | "all"; limit?: number } = {}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { items: [] as AdminLead[], total: 0, configured: false, problem: adminClientConfigProblem() };
  }

  let builder = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 100);

  if (options.status && options.status !== "all") builder = builder.eq("status", options.status);

  const { data, error, count } = await builder;
  if (error) {
    console.error("[admin] lead list failed:", error.message);
    // Reported rather than shown as an empty inbox: "no leads yet" and "the
    // database refused the query" look identical otherwise, and one of them
    // silently loses customer enquiries.
    return {
      items: [] as AdminLead[],
      total: 0,
      configured: true,
      problem: adminQueryError(error).message,
    };
  }

  const items = (data ?? []).map((row) => mapLead(row as Row));
  return { items, total: count ?? items.length, configured: true, problem: null };
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error(adminClientConfigProblem() ?? "Supabase service-role credentials are not configured.");
  const { error } = await supabase.from("leads").update({ status }).eq("id", id);
  if (error) throw adminQueryError(error);
}
