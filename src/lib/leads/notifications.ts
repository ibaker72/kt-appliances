import "server-only";

import { Resend } from "resend";
import { absoluteUrl, siteConfig } from "@/lib/site-config";
import { INQUIRY_LABELS, type LeadData } from "./schema";
import { formatPhoneNumber } from "@/lib/utils";

/**
 * Lead notifications.
 *
 * Everything here is best effort in the sense that a failure is logged and
 * swallowed rather than thrown — a transient provider outage must not surface as
 * a form error to someone who already typed their number in. But each sender
 * reports back whether the message actually went out, because when the database
 * write also failed that is the difference between a lead the business has and
 * one it does not. See `recordLead`.
 */

const resendKey = process.env.RESEND_API_KEY?.trim();
const notificationEmail = process.env.LEADS_NOTIFICATION_EMAIL?.trim() || siteConfig.email;

/**
 * Resend refuses any `from` on a domain the account has not verified, so a
 * placeholder here would fail every send with a 403 that only shows up in the
 * server log. `onboarding@resend.dev` is the one address Resend accepts without
 * a verified domain — it can only deliver to the account owner's own address,
 * which is exactly the shape of an owner alert, so an unconfigured deployment
 * still gets its leads instead of silently dropping them.
 */
const fromEmail = process.env.LEADS_FROM_EMAIL?.trim() || "onboarding@resend.dev";

export const isEmailConfigured = Boolean(resendKey);

/** New York wall time, which is the only clock the warehouse runs on. */
function timestamp(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

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
  return `<tr><td style="padding:6px 14px 6px 0;color:#6b737d;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(
    label,
  )}</td><td style="padding:6px 0;color:#121417;font-size:14px;font-weight:600">${escapeHtml(
    value,
  )}</td></tr>`;
}

/** Link back to the listing the customer was looking at, when there is one. */
function applianceLink(lead: LeadData): string | null {
  if (!lead.applianceSlug) return null;
  return absoluteUrl(`/inventory/${lead.applianceSlug}`);
}

/**
 * Internal alert with everything needed to call the customer back immediately.
 *
 * Returns whether the provider accepted the message — the caller uses that to
 * decide if the lead reached the business at all.
 */
export async function sendInternalLeadNotification(lead: LeadData): Promise<boolean> {
  const client = getResend();
  if (!client) return false;

  const subjectParts = [INQUIRY_LABELS[lead.inquiryType], lead.name];
  if (lead.applianceLabel) subjectParts.push(lead.applianceLabel);

  const listingUrl = applianceLink(lead);
  const receivedAt = timestamp();

  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:620px">
  <div style="background:#0a0b0d;padding:18px 20px">
    <span style="background:#c8202b;color:#fff;font-weight:800;padding:5px 8px;font-size:14px">KT</span>
    <span style="color:#fff;font-weight:700;font-size:15px;margin-left:8px;letter-spacing:.5px">NEW WEBSITE LEAD</span>
  </div>
  <div style="border:1px solid #e0ddd7;border-top:0;padding:22px 20px">
    <p style="margin:0 0 4px;color:#6b737d;font-size:12px;text-transform:uppercase;letter-spacing:.1em">${escapeHtml(
      INQUIRY_LABELS[lead.inquiryType],
    )}</p>
    <h1 style="margin:0 0 18px;font-size:22px;color:#121417">${escapeHtml(lead.name)}</h1>
    <table style="border-collapse:collapse;width:100%">
      ${row("Received", receivedAt)}
      ${row("Phone", formatPhoneNumber(lead.phone))}
      ${row("Email", lead.email)}
      ${row("ZIP", lead.zip)}
      ${row("Appliance", lead.applianceLabel)}
      ${
        listingUrl
          ? `<tr><td style="padding:6px 14px 6px 0;color:#6b737d;font-size:13px;white-space:nowrap;vertical-align:top">Listing</td><td style="padding:6px 0;font-size:14px"><a href="${escapeHtml(
              listingUrl,
            )}" style="color:#c8202b;font-weight:600">${escapeHtml(listingUrl)}</a></td></tr>`
          : ""
      }
      ${row("Source", lead.source)}
      ${row("Campaign", lead.utmCampaign)}
      ${row("Medium", lead.utmMedium)}
      ${row("Ad content", lead.utmContent)}
      ${row("Search term", lead.utmTerm)}
      ${row("Click ID", lead.clickId)}
      ${row("Landing page", lead.landingPage)}
      ${row("Form", lead.formLocation)}
    </table>
    ${
      lead.message
        ? `<div style="margin-top:18px;padding:14px;background:#f4f2ef;border-left:3px solid #c8202b">
             <p style="margin:0;color:#333940;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(
               lead.message,
             )}</p>
           </div>`
        : ""
    }
    <div style="margin-top:22px">
      <a href="tel:+1${lead.phone}" style="display:inline-block;background:#c8202b;color:#fff;text-decoration:none;padding:12px 20px;font-weight:700;font-size:13px;letter-spacing:.06em">CALL ${escapeHtml(
        formatPhoneNumber(lead.phone),
      )}</a>
      <a href="sms:+1${lead.phone}" style="display:inline-block;margin-left:8px;border:1px solid #121417;color:#121417;text-decoration:none;padding:11px 20px;font-weight:700;font-size:13px;letter-spacing:.06em">TEXT</a>
    </div>
  </div>
</div>`;

  try {
    const { error } = await client.emails.send({
      from: `${siteConfig.name} Website <${fromEmail}>`,
      to: [notificationEmail],
      replyTo: lead.email || undefined,
      subject: `New lead: ${subjectParts.join(" — ")}`,
      html,
    });
    if (error) {
      // Resend reports a rejected send in the response body rather than by
      // throwing, so a `from` on an unverified domain looks like success unless
      // this is checked.
      console.error("[leads] internal notification rejected:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[leads] internal notification failed:", error);
    return false;
  }
}

/** Confirmation to the customer. Skipped silently when they left email blank. */
export async function sendCustomerConfirmation(lead: LeadData): Promise<void> {
  const client = getResend();
  if (!client || !lead.email) return;

  const subject = lead.applianceLabel
    ? `We received your request about the ${lead.applianceLabel}`
    : `We received your request — ${siteConfig.name}`;

  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px">
  <div style="background:#0a0b0d;padding:18px 20px">
    <span style="background:#c8202b;color:#fff;font-weight:800;padding:5px 8px;font-size:14px">KT</span>
    <span style="color:#fff;font-weight:700;font-size:15px;margin-left:8px;letter-spacing:.5px">APPLIANCES</span>
  </div>
  <div style="border:1px solid #e0ddd7;border-top:0;padding:24px 20px;color:#333940;font-size:15px;line-height:1.65">
    <p style="margin:0 0 14px">Thanks for contacting ${escapeHtml(siteConfig.name)}.</p>
    <p style="margin:0 0 14px">We received your request${
      lead.applianceLabel ? ` regarding the <strong>${escapeHtml(lead.applianceLabel)}</strong>` : ""
    }. Someone from the warehouse will follow up shortly.</p>
    <p style="margin:0 0 14px">If you need an answer faster, call or text us at
      <a href="tel:${siteConfig.phone.e164}" style="color:#c8202b;font-weight:700">${
        siteConfig.phone.display
      }</a>.</p>
    <hr style="border:0;border-top:1px solid #e0ddd7;margin:20px 0">
    <p style="margin:0;color:#6b737d;font-size:13px">
      ${escapeHtml(siteConfig.address.street)}, ${escapeHtml(siteConfig.address.city)}, ${escapeHtml(
        siteConfig.address.state,
      )}<br>
      Open daily ${escapeHtml(siteConfig.hours.regular.label)} · After-hours ${escapeHtml(
        siteConfig.hours.afterHours.label,
      )} by appointment
    </p>
  </div>
</div>`;

  try {
    await client.emails.send({
      from: `${siteConfig.name} <${fromEmail}>`,
      to: [lead.email],
      subject,
      html,
    });
  } catch (error) {
    console.error("[leads] customer confirmation failed:", error);
  }
}
