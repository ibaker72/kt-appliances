import { CalendarClock, MessageSquareText, Phone } from "lucide-react";

import { updateAppointmentStatusAction } from "@/app/admin/actions";
import {
  APPOINTMENT_SERVICE_LABELS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/appointments/schema";
import { formatAppointmentDateTime } from "@/lib/appointments/time";
import type {
  AdminAppointment,
  AppointmentNotificationRecord,
} from "@/lib/admin/appointments-repo";
import { cn, formatPhoneNumber, relativeTime } from "@/lib/utils";

/**
 * One appointment, with the four things the owner needs to trust the automation:
 * whether the customer agreed to texts, whether the confirmation went out,
 * whether the owner alert went out, and why not when it did not.
 *
 * Notes and names are customer-typed and rendered as text nodes — React escapes
 * them, so a note containing markup is displayed, never interpreted.
 */

const SKIP_LABELS: Record<string, string> = {
  "consent-withheld": "no consent given",
  "sms-disabled": "SMS disabled",
  "customer-sms-disabled": "customer SMS disabled",
  "no-owner-number": "no owner number set",
  "invalid-phone": "invalid number",
  "missing-recipient": "no number",
};

function describe(record: AppointmentNotificationRecord | undefined, absent: string): string {
  if (!record) return absent;
  switch (record.status) {
    case "sent":
      return record.sentAt ? `Sent ${relativeTime(record.sentAt).toLowerCase()}` : "Sent";
    case "skipped":
      return `Skipped - ${SKIP_LABELS[record.skipReason ?? ""] ?? record.skipReason ?? "unknown"}`;
    case "failed":
      return `Failed${record.errorCode ? ` (${record.errorCode})` : ""}`;
    default:
      return "In flight";
  }
}

function toneFor(record: AppointmentNotificationRecord | undefined): string {
  if (!record) return "bg-bone-200 text-ink-600";
  if (record.status === "sent") return "bg-success-50 text-success-600";
  if (record.status === "failed") return "bg-brand-50 text-brand-600";
  return "bg-bone-200 text-ink-600";
}

function StatusChip({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 px-2 py-1 text-[11.5px]", tone)}>
      <span className="font-semibold uppercase tracking-wide">{label}</span>
      <span>{value}</span>
    </span>
  );
}

export function AppointmentRow({ appointment }: { appointment: AdminAppointment }) {
  const customer = appointment.notifications.find((n) => n.eventType === "customer_confirmation");
  const owner = appointment.notifications.find((n) => n.eventType === "owner_notification");

  return (
    <li className="border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[17px] font-bold text-ink-950">
              {appointment.name}
            </span>
            <span
              className={cn(
                "inline-block px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
                appointment.status === "confirmed" || appointment.status === "rescheduled"
                  ? "bg-brand-500 text-white"
                  : "bg-bone-200 text-ink-600",
              )}
            >
              {APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
            </span>
            <span className="text-[12.5px] text-ink-500">
              {APPOINTMENT_SERVICE_LABELS[appointment.serviceType] ?? appointment.serviceType}
            </span>
          </p>

          <p className="mt-1.5 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
            <CalendarClock aria-hidden className="size-4 text-brand-500" strokeWidth={2.25} />
            {formatAppointmentDateTime(appointment.scheduledFor, appointment.timezone)}
          </p>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-ink-600">
            <span className="font-medium text-ink-900 tnum">
              {formatPhoneNumber(appointment.phone)}
            </span>
            {appointment.email ? <span className="break-all">{appointment.email}</span> : null}
            {appointment.zip ? <span>ZIP {appointment.zip}</span> : null}
            <span className="text-ink-400">Booked {relativeTime(appointment.createdAt)}</span>
          </p>

          {appointment.applianceLabel ? (
            <p className="mt-2 text-[13.5px] text-ink-700">
              <span className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-500">
                Appliance
              </span>{" "}
              {appointment.applianceLabel}
            </p>
          ) : null}

          {appointment.notes ? (
            <p className="mt-2 border-l-[3px] border-line py-1 pl-3 text-[14px] leading-relaxed text-ink-700">
              {appointment.notes}
            </p>
          ) : null}

          {/* SMS automation status — the part that answers "did they get a text?" */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <StatusChip
              label="Consent"
              value={appointment.smsConsent ? "Yes" : "No"}
              tone={
                appointment.smsConsent ? "bg-success-50 text-success-600" : "bg-bone-200 text-ink-600"
              }
            />
            <StatusChip
              label="Confirmation"
              value={describe(customer, appointment.smsConsent ? "Not attempted" : "Not sent")}
              tone={toneFor(customer)}
            />
            <StatusChip
              label="Owner alert"
              value={describe(owner, "Not attempted")}
              tone={toneFor(owner)}
            />
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <a
            href={`tel:+1${appointment.phone}`}
            aria-label={`Call ${appointment.name}`}
            className="grid size-11 place-items-center border border-ink-900 bg-white text-ink-900 transition-colors hover:bg-ink-950 hover:text-white"
          >
            <Phone aria-hidden className="size-4" strokeWidth={2.5} />
          </a>
          <a
            href={`sms:+1${appointment.phone}`}
            aria-label={`Text ${appointment.name}`}
            className="grid size-11 place-items-center border border-brand-500 bg-brand-500 text-white transition-colors hover:bg-brand-600"
          >
            <MessageSquareText aria-hidden className="size-4" strokeWidth={2.5} />
          </a>
        </div>
      </div>

      <form
        action={updateAppointmentStatusAction}
        className="mt-4 flex items-center gap-2 border-t border-line pt-3"
      >
        <input type="hidden" name="id" value={appointment.id} />
        <label
          htmlFor={`appointment-status-${appointment.id}`}
          className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-500"
        >
          Status
        </label>
        <select
          id={`appointment-status-${appointment.id}`}
          name="status"
          defaultValue={appointment.status}
          className="h-10 border border-line bg-white px-2 text-[13.5px] text-ink-800"
        >
          {APPOINTMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {APPOINTMENT_STATUS_LABELS[status]}
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
