import Link from "next/link";

import { AppointmentRow } from "@/components/admin/appointment-row";
import { AdminConfigNotice } from "@/components/admin/admin-config-notice";
import { buttonStyles } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { listAppointments } from "@/lib/admin/appointments-repo";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/lib/appointments/schema";
import { getOwnerNotificationPhone, isCustomerSmsEnabled, smsConfigProblem } from "@/lib/sms/config";
import { maskPhoneNumber } from "@/lib/sms/phone";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Appointments",
  robots: { index: false, follow: false },
};

const FILTERS: Array<{ value: AppointmentStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  ...APPOINTMENT_STATUSES.map((status) => ({
    value: status,
    label: APPOINTMENT_STATUS_LABELS[status],
  })),
];

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; window?: string }>;
}) {
  await requireAdmin();
  const { status, window } = await searchParams;

  const active = (APPOINTMENT_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as AppointmentStatus)
    : "all";
  const showAllTime = window === "all";

  const { items, total, configured, problem } = await listAppointments({
    status: active,
    window: showAllTime ? "all" : "upcoming",
    limit: 100,
  });

  // Read on the server only. The owner's number is never rendered in full, and
  // no Twilio credential is read here at all — just whether one is usable.
  const smsProblem = smsConfigProblem();
  const ownerPhone = getOwnerNotificationPhone();
  const customerSmsLive = isCustomerSmsEnabled();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-950">
          Appointments
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-600">
          {configured
            ? `${total} ${showAllTime ? "total" : "upcoming"} appointment${total === 1 ? "" : "s"}${
                active === "all" ? "" : ` marked ${APPOINTMENT_STATUS_LABELS[active].toLowerCase()}`
              }.`
            : "Connect Supabase to store and review appointments."}
        </p>
      </div>

      {problem ? <AdminConfigNotice problem={problem} /> : null}

      {/* Text-message automation status. Deliberately plain: the owner needs to
          know whether customers are being texted right now, and why not. */}
      <section className="border border-line bg-white p-5">
        <h2 className="font-display text-[15px] font-bold uppercase tracking-wide text-ink-800">
          Text message automation
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-500">
              Customer confirmations
            </dt>
            <dd
              className={cn(
                "mt-1 text-[14px] font-semibold",
                customerSmsLive ? "text-success-600" : "text-ink-700",
              )}
            >
              {customerSmsLive ? "Sending" : "Paused"}
            </dd>
            {!customerSmsLive && smsProblem ? (
              <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{smsProblem}</p>
            ) : null}
            {!customerSmsLive && !smsProblem ? (
              <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
                SMS_CUSTOMER_SENDING_ENABLED is set to false.
              </p>
            ) : null}
          </div>
          <div>
            <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-500">
              Owner alerts go to
            </dt>
            <dd className="mt-1 text-[14px] font-semibold text-ink-900 tnum">
              {ownerPhone ? maskPhoneNumber(ownerPhone) : "Not configured"}
            </dd>
            {!ownerPhone ? (
              <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
                Set APPOINTMENT_NOTIFICATION_PHONE to get a text on every new booking. Bookings are
                saved either way.
              </p>
            ) : null}
          </div>
        </dl>
      </section>

      {configured ? (
        <>
          <nav aria-label="Filter appointments">
            <ul className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <li key={filter.value}>
                  <Link
                    href={buildHref(filter.value, showAllTime)}
                    aria-current={active === filter.value ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center border px-4 text-[14px] font-medium transition-colors",
                      active === filter.value
                        ? "border-ink-950 bg-ink-950 text-white"
                        : "border-line bg-white text-ink-700 hover:border-ink-400",
                    )}
                  >
                    {filter.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={buildHref(active, !showAllTime)}
                  className="inline-flex min-h-11 items-center border border-line bg-white px-4 text-[14px] font-medium text-ink-700 transition-colors hover:border-ink-400"
                >
                  {showAllTime ? "Upcoming only" : "Include past"}
                </Link>
              </li>
            </ul>
          </nav>

          {items.length > 0 ? (
            <ul className="space-y-3">
              {items.map((appointment) => (
                <AppointmentRow key={appointment.id} appointment={appointment} />
              ))}
            </ul>
          ) : (
            <p className="border border-line bg-white px-5 py-12 text-center text-[14.5px] text-ink-500">
              No {showAllTime ? "" : "upcoming "}appointments
              {active === "all" ? "" : ` marked ${APPOINTMENT_STATUS_LABELS[active].toLowerCase()}`}.
              Bookings made at /schedule appear here immediately.
            </p>
          )}
        </>
      ) : (
        <div className="border border-line bg-white p-6">
          <p className="text-[14.5px] leading-relaxed text-ink-600">
            Appointments are stored in Supabase using the service-role key, and the{" "}
            <code className="font-mono text-[13px]">appointments</code> table is closed to the public
            key entirely. Run <code className="font-mono text-[13px]">0003_appointments.sql</code>{" "}
            and set the service-role key to enable booking.
          </p>
          <Link href="/admin" className={buttonStyles("outline", "md", "mt-5")}>
            Back to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

function buildHref(status: AppointmentStatus | "all", allTime: boolean): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (allTime) params.set("window", "all");
  const query = params.toString();
  return query ? `/admin/appointments?${query}` : "/admin/appointments";
}
