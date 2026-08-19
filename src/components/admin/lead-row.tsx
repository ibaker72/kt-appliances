import { MessageSquareText, Phone } from "lucide-react";

import { updateLeadStatusAction } from "@/app/admin/actions";
import { INQUIRY_LABELS, LEAD_STATUSES } from "@/lib/leads/schema";
import type { AdminLead } from "@/lib/admin/leads-repo";
import { cn, formatPhoneNumber, relativeTime } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
};

/**
 * One lead, with everything needed to act on it: who they are, what they asked
 * about, which campaign produced them, and one-tap call/text.
 */
export function LeadRow({ lead }: { lead: AdminLead }) {
  const attribution = [
    lead.source,
    lead.utmCampaign,
    lead.utmMedium,
    lead.utmContent,
    lead.utmTerm,
  ].filter(Boolean);

  return (
    <li className="border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[17px] font-bold text-ink-950">{lead.name}</span>
            <span
              className={cn(
                "inline-block px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
                lead.status === "new" ? "bg-brand-500 text-white" : "bg-bone-200 text-ink-600",
              )}
            >
              {STATUS_LABELS[lead.status] ?? lead.status}
            </span>
            <span className="text-[12.5px] text-ink-500">
              {INQUIRY_LABELS[lead.inquiryType] ?? lead.inquiryType}
            </span>
          </p>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-ink-600">
            <span className="font-medium text-ink-900 tnum">{formatPhoneNumber(lead.phone)}</span>
            {lead.email ? <span className="break-all">{lead.email}</span> : null}
            {lead.zip ? <span>ZIP {lead.zip}</span> : null}
            <span className="text-ink-400">{relativeTime(lead.createdAt)}</span>
          </p>

          {lead.applianceLabel ? (
            <p className="mt-2 text-[13.5px] text-ink-700">
              <span className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-500">
                Appliance
              </span>{" "}
              {lead.applianceLabel}
            </p>
          ) : null}

          {lead.message ? (
            <p className="mt-2 border-l-[3px] border-line py-1 pl-3 text-[14px] leading-relaxed text-ink-700">
              {lead.message}
            </p>
          ) : null}

          {attribution.length > 0 || lead.landingPage ? (
            <p className="mt-2.5 flex flex-wrap gap-x-2 gap-y-1 text-[12px] text-ink-400">
              {attribution.map((entry) => (
                <span key={entry} className="border border-line px-1.5 py-0.5">
                  {entry}
                </span>
              ))}
              {lead.landingPage ? (
                <span className="truncate">Landed on {lead.landingPage}</span>
              ) : null}
              {/* The click id is what Google Ads matches an offline conversion
                  against, so it has to be copyable from here — that upload is
                  how the account learns which ads produced actual sales. */}
              {lead.clickId ? (
                <span className="break-all font-mono text-[11px] text-ink-500">
                  click {lead.clickId}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2">
          <a
            href={`tel:+1${lead.phone}`}
            aria-label={`Call ${lead.name}`}
            className="grid size-11 place-items-center border border-ink-900 bg-white text-ink-900 transition-colors hover:bg-ink-950 hover:text-white"
          >
            <Phone aria-hidden className="size-4" strokeWidth={2.5} />
          </a>
          <a
            href={`sms:+1${lead.phone}`}
            aria-label={`Text ${lead.name}`}
            className="grid size-11 place-items-center border border-brand-500 bg-brand-500 text-white transition-colors hover:bg-brand-600"
          >
            <MessageSquareText aria-hidden className="size-4" strokeWidth={2.5} />
          </a>
        </div>
      </div>

      <form action={updateLeadStatusAction} className="mt-4 flex items-center gap-2 border-t border-line pt-3">
        <input type="hidden" name="id" value={lead.id} />
        <label
          htmlFor={`lead-status-${lead.id}`}
          className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-500"
        >
          Status
        </label>
        <select
          id={`lead-status-${lead.id}`}
          name="status"
          defaultValue={lead.status}
          className="h-10 border border-line bg-white px-2 text-[13.5px] text-ink-800"
        >
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 border border-line bg-white px-3 text-[11.5px] font-semibold uppercase tracking-wide text-ink-700 transition-colors hover:border-ink-950 hover:text-ink-950"
        >
          Update
        </button>
      </form>
    </li>
  );
}
