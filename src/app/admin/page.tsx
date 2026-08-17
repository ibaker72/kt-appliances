import Link from "next/link";
import { AlertTriangle, ArrowRight, Plus } from "lucide-react";

import { requireAdmin } from "@/lib/admin/auth";
import {
  AdminNotConfiguredError,
  getInventoryStats,
  listAppliancesForAdmin,
} from "@/lib/admin/inventory-repo";
import { listLeads } from "@/lib/admin/leads-repo";
import { buttonStyles } from "@/components/ui/button";
import { AdminInventoryTable } from "@/components/admin/admin-inventory-table";
import { LeadRow } from "@/components/admin/lead-row";
import { isSupabaseWritable } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminDashboard() {
  await requireAdmin();

  // Data fetching and rendering are kept separate: the JSX below is built from a
  // resolved value, never inside the try block that guards the query.
  const data = await loadDashboard();
  if (!data) return <NotConfigured />;

  const { stats, recent, leads } = data;

  const tiles = [
    { label: "Available", value: stats.available, href: "/admin/inventory?status=available" },
    { label: "Reserved", value: stats.reserved, href: "/admin/inventory?status=reserved" },
    { label: "Sold", value: stats.sold, href: "/admin/inventory?status=sold" },
    { label: "Drafts", value: stats.draft, href: "/admin/inventory?status=draft" },
    {
      label: "Unpublished",
      value: stats.unpublished,
      href: "/admin/inventory?published=unpublished",
    },
    { label: "New leads", value: stats.newLeads, href: "/admin/leads", accent: true },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.7rem] font-extrabold tracking-[-0.02em] text-ink-950">
            Dashboard
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-600">
            What&apos;s on the floor and who&apos;s been asking about it.
          </p>
        </div>
        <Link href="/admin/inventory/new" className={buttonStyles("primary", "md")}>
          <Plus aria-hidden className="size-4" strokeWidth={2.75} />
          Add Appliance
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <li key={tile.label} className="bg-white">
            <Link href={tile.href} className="block p-4 transition-colors hover:bg-bone-50 sm:p-5">
              <p className="text-ui font-semibold uppercase tracking-wide text-ink-500">{tile.label}</p>
              <p
                className={
                  tile.accent && tile.value > 0
                    ? "mt-2 font-display text-3xl font-extrabold text-brand-500 tnum"
                    : "mt-2 font-display text-3xl font-extrabold text-ink-950 tnum"
                }
              >
                {tile.value}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink-950">
            Recently updated
          </h2>
          <Link
            href="/admin/inventory"
            className="inline-flex items-center gap-1.5 text-ui font-semibold uppercase tracking-wide text-ink-700 hover:text-brand-500"
          >
            All inventory
            <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
          </Link>
        </div>
        <AdminInventoryTable appliances={recent} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink-950">
            Latest leads
          </h2>
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-1.5 text-ui font-semibold uppercase tracking-wide text-ink-700 hover:text-brand-500"
          >
            All leads
            <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
          </Link>
        </div>
        {leads.length > 0 ? (
          <ul className="space-y-3">
            {leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} />
            ))}
          </ul>
        ) : (
          <p className="border border-line bg-white px-5 py-8 text-center text-[14px] text-ink-500">
            No leads yet. They appear here the moment someone submits a form on the site.
          </p>
        )}
      </section>
    </div>
  );
}

/** Returns null when there is no database to read from. */
async function loadDashboard() {
  if (!isSupabaseWritable) return null;
  try {
    const [stats, recent, leads] = await Promise.all([
      getInventoryStats(),
      listAppliancesForAdmin({ limit: 8 }),
      listLeads({ limit: 5 }),
    ]);
    return { stats, recent: recent.items, leads: leads.items };
  } catch (error) {
    if (error instanceof AdminNotConfiguredError) return null;
    throw error;
  }
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="border border-line bg-white p-6 sm:p-8">
        <AlertTriangle aria-hidden className="size-8 text-brand-500" strokeWidth={1.9} />
        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-[-0.025em] text-ink-950">
          No database connected
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          You are signed in, but inventory management needs a Supabase project. The public site is
          running fine without one — it simply shows empty states instead of products.
        </p>

        <ol className="mt-6 space-y-4 border-t border-line pt-6">
          {[
            "Create a Supabase project.",
            "Run supabase/migrations/0001_init.sql against it (SQL editor or `supabase db push`).",
            "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.",
            "Redeploy. This page becomes the inventory dashboard.",
          ].map((step, index) => (
            <li key={step} className="flex gap-4">
              <span className="font-display text-[13px] font-bold text-brand-500 tnum">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="text-[14.5px] leading-relaxed text-ink-700">{step}</p>
            </li>
          ))}
        </ol>

        <p className="mt-6 border-t border-line pt-5 text-[13.5px] leading-relaxed text-ink-500">
          Keep <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> server-side only. It
          bypasses row-level security, so it must never be prefixed with{" "}
          <code className="font-mono">NEXT_PUBLIC_</code>.
        </p>
      </div>
    </div>
  );
}
