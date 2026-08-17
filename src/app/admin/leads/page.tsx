import Link from "next/link";

import { LeadRow } from "@/components/admin/lead-row";
import { buttonStyles } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { listLeads } from "@/lib/admin/leads-repo";
import { AdminConfigNotice } from "@/components/admin/admin-config-notice";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/leads/schema";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

const FILTERS: Array<{ value: LeadStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  ...LEAD_STATUSES.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
  })),
];

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;

  const active = (LEAD_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as LeadStatus)
    : "all";

  const { items, total, configured, problem } = await listLeads({ status: active, limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-950">
          Leads
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-600">
          {configured
            ? `${total} inquir${total === 1 ? "y" : "ies"}${active === "all" ? "" : ` marked ${active}`}.`
            : "Connect Supabase to store and review leads."}
        </p>
      </div>

      {problem ? <AdminConfigNotice problem={problem} /> : null}

      {configured ? (
        <>
          <nav aria-label="Filter leads by status">
            <ul className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <li key={filter.value}>
                  <Link
                    href={filter.value === "all" ? "/admin/leads" : `/admin/leads?status=${filter.value}`}
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
            </ul>
          </nav>

          {items.length > 0 ? (
            <ul className="space-y-3">
              {items.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </ul>
          ) : (
            <p className="border border-line bg-white px-5 py-12 text-center text-[14.5px] text-ink-500">
              No leads {active === "all" ? "yet" : `marked ${active}`}. Inquiries submitted through
              the website appear here immediately.
            </p>
          )}
        </>
      ) : (
        <div className="border border-line bg-white p-6">
          <p className="text-[14.5px] leading-relaxed text-ink-600">
            Leads are stored in Supabase using the service-role key, and the{" "}
            <code className="font-mono text-[13px]">leads</code> table is closed to the public key
            entirely. Until Supabase is configured, form submissions are written to the server log so
            nothing is lost — but they will not appear here.
          </p>
          <Link href="/admin" className={buttonStyles("outline", "md", "mt-5")}>
            Back to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
