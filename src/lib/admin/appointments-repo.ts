import "server-only";

import { adminClientConfigProblem, getSupabaseAdminClient } from "@/lib/supabase/client";
import { adminQueryError } from "@/lib/admin/inventory-repo";
import type { AppointmentServiceType, AppointmentStatus } from "@/lib/appointments/schema";
import type { AppointmentEventType } from "@/lib/appointments/messages";

/**
 * Admin reads for appointments and their notification ledger.
 *
 * Same posture as `leads-repo`: service-role only, RLS blocks anon entirely, and
 * a query failure is reported rather than rendered as an empty list — "no
 * appointments" and "the database refused the query" look identical otherwise,
 * and one of them means the owner is standing in a warehouse with no idea
 * someone is coming.
 */

export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";

export interface AppointmentNotificationRecord {
  eventType: AppointmentEventType;
  recipientType: "customer" | "owner";
  status: NotificationStatus;
  skipReason: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  providerMessageSid: string | null;
  sentAt: string | null;
  failedAt: string | null;
}

export interface AdminAppointment {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  zip: string | null;
  serviceType: AppointmentServiceType;
  /** Customer-facing booking reason, when one was chosen. Null on older rows. */
  purpose: string | null;
  scheduledFor: string;
  timezone: string;
  notes: string | null;
  applianceLabel: string | null;
  applianceSlug: string | null;
  smsConsent: boolean;
  smsConsentAt: string | null;
  status: AppointmentStatus;
  source: string | null;
  utmCampaign: string | null;
  formLocation: string | null;
  createdAt: string;
  notifications: AppointmentNotificationRecord[];
}

type Row = Record<string, unknown>;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableStr(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function mapNotification(row: Row): AppointmentNotificationRecord {
  return {
    eventType: (str(row.event_type) || "customer_confirmation") as AppointmentEventType,
    recipientType: str(row.recipient_type) === "owner" ? "owner" : "customer",
    status: (str(row.status) || "pending") as NotificationStatus,
    skipReason: nullableStr(row.skip_reason),
    errorCode: nullableStr(row.error_code),
    errorMessage: nullableStr(row.error_message),
    providerMessageSid: nullableStr(row.provider_message_sid),
    sentAt: nullableStr(row.sent_at),
    failedAt: nullableStr(row.failed_at),
  };
}

function mapAppointment(row: Row): AdminAppointment {
  const notifications = Array.isArray(row.appointment_notifications)
    ? (row.appointment_notifications as Row[]).map(mapNotification)
    : [];

  return {
    id: str(row.id),
    name: str(row.name),
    phone: str(row.phone),
    email: nullableStr(row.email),
    zip: nullableStr(row.zip),
    serviceType: (str(row.service_type) || "warehouse-visit") as AppointmentServiceType,
    purpose: nullableStr(row.purpose),
    scheduledFor: str(row.scheduled_for),
    timezone: str(row.timezone) || "America/New_York",
    notes: nullableStr(row.notes),
    applianceLabel: nullableStr(row.appliance_label),
    applianceSlug: nullableStr(row.appliance_slug),
    smsConsent: row.sms_consent === true,
    smsConsentAt: nullableStr(row.sms_consent_at),
    status: (str(row.status) || "confirmed") as AppointmentStatus,
    source: nullableStr(row.source),
    utmCampaign: nullableStr(row.utm_campaign),
    formLocation: nullableStr(row.form_location),
    createdAt: str(row.created_at),
    notifications,
  };
}

export interface ListAppointmentsOptions {
  status?: AppointmentStatus | "all";
  /** `upcoming` hides anything already in the past. */
  window?: "upcoming" | "all";
  limit?: number;
}

export async function listAppointments(options: ListAppointmentsOptions = {}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      items: [] as AdminAppointment[],
      total: 0,
      configured: false,
      problem: adminClientConfigProblem(),
    };
  }

  const upcoming = options.window !== "all";

  let builder = supabase
    .from("appointments")
    // One round trip for the appointment and its notification ledger: the admin
    // renders SMS status inline on every row, and a per-row query would be an
    // N+1 against a table the owner refreshes on a phone.
    .select("*, appointment_notifications(*)", { count: "exact" })
    .order("scheduled_for", { ascending: upcoming })
    .limit(options.limit ?? 100);

  if (options.status && options.status !== "all") builder = builder.eq("status", options.status);
  if (upcoming) {
    // A small grace window, so an appointment does not vanish from the list the
    // minute it starts — that is exactly when the owner is looking for it.
    builder = builder.gte("scheduled_for", new Date(Date.now() - 2 * 3_600_000).toISOString());
  }

  const { data, error, count } = await builder;
  if (error) {
    console.error("[admin] appointment list failed:", error.message);
    return {
      items: [] as AdminAppointment[],
      total: 0,
      configured: true,
      problem: adminQueryError(error).message,
    };
  }

  const items = (data ?? []).map((row) => mapAppointment(row as Row));
  return { items, total: count ?? items.length, configured: true, problem: null };
}

export async function setAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error(
      adminClientConfigProblem() ?? "Supabase service-role credentials are not configured.",
    );
  }
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) throw adminQueryError(error);
}

/** Count of upcoming appointments, for the dashboard tile. */
export async function countUpcomingAppointments(): Promise<number> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .in("status", ["confirmed", "rescheduled"])
    .gte("scheduled_for", new Date().toISOString());

  if (error) {
    console.error("[admin] upcoming appointment count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}
