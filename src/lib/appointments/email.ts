import "server-only";

import { Resend } from "resend";

import { absoluteUrl, directionsHref, siteConfig } from "@/lib/site-config";
import { formatPhoneNumber } from "@/lib/utils";
import { APPOINTMENT_SERVICE_LABELS } from "./schema";
import { describeAppointmentPurpose } from "./purposes";
import {
  BUSINESS_TIME_ZONE,
  formatAppointmentDay,
  formatAppointmentTime,
} from "./time";
import type { AppointmentNotificationTarget } from "./notifications";

/**
 * Appointment email.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS SEPARATELY FROM `notifications.ts`
 * ---------------------------------------------------------------------------
 * That module is the SMS pipeline, and its design centres on something email
 * does not need: a claim/ledger table that makes a *text* idempotent, because a
 * duplicate text costs money and annoys a customer who is being contacted on a
 * channel the carriers police. Email has no A2P gate, no consent requirement for
 * a transactional confirmation the customer asked for by booking, and no per-
 * message registration — so wiring it through the same claim machinery would
 * add a table write per email to solve a problem email does not have.
 *
 * What it does share is the contract: nothing here throws, nothing here can
 * affect a booking that is already committed, and every outcome is a returned
 * value. See `bookAppointment` — the appointment exists before this runs.
 *
 * The Resend setup is the one the lead pipeline already uses (same key, same
 * `from`, same fallback behaviour), read here rather than duplicated as new
 * environment variables.
 */

const resendKey = process.env.RESEND_API_KEY?.trim();

/** Same destination as lead alerts: the one inbox the owner actually reads. */
const notificationEmail = process.env.LEADS_NOTIFICATION_EMAIL?.trim() || siteConfig.email;

/** See `leads/notifications.ts` — `onboarding@resend.dev` is the no-verified-domain fallback. */
const fromEmail = process.env.LEADS_FROM_EMAIL?.trim() || "onboarding@resend.dev";

export const isAppointmentEmailConfigured = Boolean(resendKey);

let resend: Resend | null = null;
function getResend(): Resend | null {
  if (!resendKey) return null;
  resend ??= new Resend(resendKey);
  return resend;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `<tr><td style="padding:6px 14px 6px 0;color:#666e78;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(
    label,
  )}</td><td style="padding:6px 0;color:#121417;font-size:14px;font-weight:600">${escapeHtml(
    value,
  )}</td></tr>`;
}

const HEADER = `
  <div style="background:#0a0b0d;padding:18px 20px">
    <span style="background:#c8202b;color:#fff;font-weight:800;padding:5px 8px;font-size:14px">KT</span>
    <span style="color:#fff;font-weight:700;font-size:15px;margin-left:8px;letter-spacing:.5px">APPLIANCES</span>
  </div>`;

const ADDRESS_BLOCK = `
    <p style="margin:0;color:#666e78;font-size:13px;line-height:1.6">
      ${escapeHtml(siteConfig.address.street)}, ${escapeHtml(siteConfig.address.city)}, ${escapeHtml(
        siteConfig.address.state,
      )} ${escapeHtml(siteConfig.address.postalCode)}<br>
      Open daily ${escapeHtml(siteConfig.hours.regular.label)} · After-hours ${escapeHtml(
        siteConfig.hours.afterHours.label,
      )} by appointment
    </p>`;

/** What an appointment email needs. A superset of the SMS context, plus email. */
export interface AppointmentEmailContext extends AppointmentNotificationTarget {
  email?: string | null;
  zip?: string | null;
  purpose?: string | null;
  applianceSlug?: string | null;
  source?: string | null;
  utmCampaign?: string | null;
  formLocation?: string | null;
}

export type AppointmentEmailStatus = "sent" | "skipped" | "failed";

export interface AppointmentEmailOutcome {
  status: AppointmentEmailStatus;
  /** Machine-readable cause for anything other than `sent`. Never a provider secret. */
  reason?: string;
}

function whenParts(appointment: AppointmentEmailContext) {
  const zone = appointment.timeZone || BUSINESS_TIME_ZONE;
  return {
    day: formatAppointmentDay(appointment.scheduledFor, zone),
    time: formatAppointmentTime(appointment.scheduledFor, zone),
  };
}

function reasonLabel(appointment: AppointmentEmailContext): string {
  return describeAppointmentPurpose(appointment.purpose ?? null, appointment.serviceType);
}

/**
 * The owner's alert.
 *
 * Everything needed to act without opening the admin: who, when, what for, and
 * one tap to ring them back. The admin link is included because there is an
 * admin — omit it and the owner has to remember the URL on a phone.
 */
export async function sendOwnerAppointmentEmail(
  appointment: AppointmentEmailContext,
): Promise<AppointmentEmailOutcome> {
  const client = getResend();
  if (!client) return { status: "skipped", reason: "email-not-configured" };

  const { day, time } = whenParts(appointment);
  const reason = reasonLabel(appointment);
  const listingUrl = appointment.applianceSlug
    ? absoluteUrl(`/inventory/${appointment.applianceSlug}`)
    : null;

  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:620px">
  <div style="background:#0a0b0d;padding:18px 20px">
    <span style="background:#c8202b;color:#fff;font-weight:800;padding:5px 8px;font-size:14px">KT</span>
    <span style="color:#fff;font-weight:700;font-size:15px;margin-left:8px;letter-spacing:.5px">NEW APPOINTMENT</span>
  </div>
  <div style="border:1px solid #e0ddd7;border-top:0;padding:22px 20px">
    <p style="margin:0 0 4px;color:#666e78;font-size:12px;text-transform:uppercase;letter-spacing:.1em">${escapeHtml(
      reason,
    )}</p>
    <h1 style="margin:0 0 6px;font-size:22px;color:#121417">${escapeHtml(appointment.name)}</h1>
    <p style="margin:0 0 18px;font-size:17px;font-weight:700;color:#c8202b">${escapeHtml(
      day,
    )} at ${escapeHtml(time)}</p>
    <table style="border-collapse:collapse;width:100%">
      ${row("Phone", formatPhoneNumber(appointment.phone))}
      ${row("Email", appointment.email)}
      ${row("ZIP", appointment.zip)}
      ${row("Appointment", reason)}
      ${row("Service type", APPOINTMENT_SERVICE_LABELS[appointment.serviceType])}
      ${row("Appliance", appointment.applianceLabel)}
      ${
        listingUrl
          ? `<tr><td style="padding:6px 14px 6px 0;color:#666e78;font-size:13px;white-space:nowrap;vertical-align:top">Listing</td><td style="padding:6px 0;font-size:14px"><a href="${escapeHtml(
              listingUrl,
            )}" style="color:#c8202b;font-weight:600">${escapeHtml(listingUrl)}</a></td></tr>`
          : ""
      }
      ${row("Texts allowed", appointment.smsConsent ? "Yes" : "No")}
      ${row("Source", appointment.source)}
      ${row("Campaign", appointment.utmCampaign)}
      ${row("Booked from", appointment.formLocation)}
    </table>
    ${
      appointment.notes
        ? `<div style="margin-top:18px;padding:14px;background:#f4f2ef;border-left:3px solid #c8202b">
             <p style="margin:0;color:#333940;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(
               appointment.notes,
             )}</p>
           </div>`
        : ""
    }
    <div style="margin-top:22px">
      <a href="tel:+1${escapeHtml(appointment.phone)}" style="display:inline-block;background:#c8202b;color:#fff;text-decoration:none;padding:12px 20px;font-weight:700;font-size:13px;letter-spacing:.06em">CALL ${escapeHtml(
        formatPhoneNumber(appointment.phone),
      )}</a>
      <a href="sms:+1${escapeHtml(
        appointment.phone,
      )}" style="display:inline-block;margin-left:8px;border:1px solid #121417;color:#121417;text-decoration:none;padding:11px 20px;font-weight:700;font-size:13px;letter-spacing:.06em">TEXT</a>
    </div>
    <p style="margin:18px 0 0;font-size:13px">
      <a href="${escapeHtml(
        absoluteUrl("/admin/appointments"),
      )}" style="color:#666e78">Open in the admin</a>
    </p>
  </div>
</div>`;

  try {
    const { error } = await client.emails.send({
      from: `${siteConfig.name} Website <${fromEmail}>`,
      to: [notificationEmail],
      replyTo: appointment.email || undefined,
      subject: `New appointment: ${appointment.name} — ${day} at ${time}`,
      html,
    });
    if (error) {
      // Resend reports a rejected send in the body rather than by throwing, so
      // an unverified `from` looks like success unless this is checked.
      console.error("[appointments] owner email rejected:", error.message);
      return { status: "failed", reason: "provider-rejected" };
    }
    return { status: "sent" };
  } catch (error) {
    console.error("[appointments] owner email failed:", error);
    return { status: "failed", reason: "exception" };
  }
}

/**
 * The customer's confirmation.
 *
 * Skipped silently when they did not give an email — that is the majority of
 * warehouse bookings, and it is not a failure. Transactional: it confirms a
 * thing they just asked for, and subscribes them to nothing.
 */
export async function sendCustomerAppointmentEmail(
  appointment: AppointmentEmailContext,
): Promise<AppointmentEmailOutcome> {
  const client = getResend();
  if (!client) return { status: "skipped", reason: "email-not-configured" };
  if (!appointment.email) return { status: "skipped", reason: "no-email" };

  const { day, time } = whenParts(appointment);
  const reason = reasonLabel(appointment);

  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px">
  ${HEADER}
  <div style="border:1px solid #e0ddd7;border-top:0;padding:24px 20px;color:#333940;font-size:15px;line-height:1.65">
    <h1 style="margin:0 0 6px;font-size:21px;color:#121417">You're booked in</h1>
    <p style="margin:0 0 18px;font-size:18px;font-weight:700;color:#c8202b">${escapeHtml(
      day,
    )} at ${escapeHtml(time)}</p>

    <table style="border-collapse:collapse;width:100%;margin-bottom:18px">
      ${row("What for", reason)}
      ${row("Appliance", appointment.applianceLabel)}
      ${row("Where", `${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state} ${siteConfig.address.postalCode}`)}
    </table>

    <div>
      <a href="${escapeHtml(
        directionsHref,
      )}" style="display:inline-block;background:#c8202b;color:#fff;text-decoration:none;padding:12px 20px;font-weight:700;font-size:13px;letter-spacing:.06em">GET DIRECTIONS</a>
      <a href="tel:${escapeHtml(
        siteConfig.phone.e164,
      )}" style="display:inline-block;margin-left:8px;border:1px solid #121417;color:#121417;text-decoration:none;padding:11px 20px;font-weight:700;font-size:13px;letter-spacing:.06em">CALL ${escapeHtml(
        siteConfig.phone.display,
      )}</a>
    </div>

    <p style="margin:20px 0 0">Need to change or cancel? Call or text us at
      <a href="tel:${escapeHtml(siteConfig.phone.e164)}" style="color:#c8202b;font-weight:700">${escapeHtml(
        siteConfig.phone.display,
      )}</a> — there is no deposit and nothing to cancel online.</p>

    <hr style="border:0;border-top:1px solid #e0ddd7;margin:20px 0">
    ${ADDRESS_BLOCK}
  </div>
</div>`;

  try {
    const { error } = await client.emails.send({
      from: `${siteConfig.name} <${fromEmail}>`,
      to: [appointment.email],
      subject: `Your ${siteConfig.name} appointment is scheduled — ${day} at ${time}`,
      html,
    });
    if (error) {
      console.error("[appointments] customer email rejected:", error.message);
      return { status: "failed", reason: "provider-rejected" };
    }
    return { status: "sent" };
  } catch (error) {
    console.error("[appointments] customer email failed:", error);
    return { status: "failed", reason: "exception" };
  }
}

export interface AppointmentEmailOutcomes {
  owner: AppointmentEmailOutcome;
  customer: AppointmentEmailOutcome;
}

/**
 * Both appointment emails. Never throws; the owner's alert goes first because it
 * is the one that has to arrive if an instance is about to be cut short.
 */
export async function sendAppointmentEmails(
  appointment: AppointmentEmailContext,
): Promise<AppointmentEmailOutcomes> {
  const owner = await sendOwnerAppointmentEmail(appointment);
  const customer = await sendCustomerAppointmentEmail(appointment);
  return { owner, customer };
}
