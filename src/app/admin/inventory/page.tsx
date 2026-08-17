import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { AdminInventoryTable } from "@/components/admin/admin-inventory-table";
import { AdminConfigNotice } from "@/components/admin/admin-config-notice";
import { buttonStyles } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminNotConfiguredError, AdminPermissionError, listAppliancesForAdmin } from "@/lib/admin/inventory-repo";
import { APPLIANCE_STATUSES, CATEGORY_LIST, STATUS_LABELS } from "@/lib/inventory/types";
import type { ApplianceStatus } from "@/lib/inventory/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inventory",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; published?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const status = (APPLIANCE_STATUSES as readonly string[]).includes(params.status ?? "")
    ? (params.status as ApplianceStatus)
    : "all";
  const published =
    params.published === "published" || params.published === "unpublished" ? params.published : "all";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  let items: Awaited<ReturnType<typeof listAppliancesForAdmin>>["items"] = [];
  let total = 0;
  let notConfigured = false;
  let problem: string | null = null;

  try {
    const result = await listAppliancesForAdmin({
      search: params.q,
      status,
      category: params.category,
      published,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    items = result.items;
    total = result.total;
  } catch (error) {
    // A refused query is a configuration fault, not a crash: say which, rather
    // than handing the browser an opaque 500 digest.
    if (error instanceof AdminNotConfiguredError || error instanceof AdminPermissionError) {
      notConfigured = true;
      problem = error.message;
    } else throw error;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-950">
            Inventory
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-600">
            {notConfigured
              ? "Connect Supabase to manage inventory."
              : `${total} appliance${total === 1 ? "" : "s"} on record.`}
          </p>
        </div>
        <Link href="/admin/inventory/new" className={buttonStyles("primary", "md")}>
          <Plus aria-hidden className="size-4" strokeWidth={2.75} />
          Add Appliance
        </Link>
      </div>

      {notConfigured ? (
        <AdminConfigNotice problem={problem} />
      ) : (
        <>
          {/* Filters — a plain GET form, so results are linkable and shareable. */}
          <form method="get" className="border border-line bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0 relative sm:col-span-2 lg:col-span-1">
                <label htmlFor="q" className="sr-only">
                  Search inventory
                </label>
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                  strokeWidth={2.5}
                />
                <input
                  id="q"
                  name="q"
                  type="search"
                  defaultValue={params.q ?? ""}
                  placeholder="Brand, model, SKU…"
                  className="h-11 w-full border border-ink-200 bg-white pl-9 pr-3 text-[15px] text-ink-950"
                />
              </div>

              <div>
                <label htmlFor="status" className="sr-only">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={status}
                  className="h-11 w-full border border-ink-200 bg-white px-3 text-[15px] text-ink-950"
                >
                  <option value="all">All statuses</option>
                  {APPLIANCE_STATUSES.map((entry) => (
                    <option key={entry} value={entry}>
                      {STATUS_LABELS[entry]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="category" className="sr-only">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  defaultValue={params.category ?? ""}
                  className="h-11 w-full border border-ink-200 bg-white px-3 text-[15px] text-ink-950"
                >
                  <option value="">All categories</option>
                  {CATEGORY_LIST.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <label htmlFor="published" className="sr-only">
                  Visibility
                </label>
                <select
                  id="published"
                  name="published"
                  defaultValue={published}
                  className="h-11 min-w-0 flex-1 border border-ink-200 bg-white px-3 text-[15px] text-ink-950"
                >
                  <option value="all">Any visibility</option>
                  <option value="published">Published</option>
                  <option value="unpublished">Hidden</option>
                </select>
                <button type="submit" className={buttonStyles("dark", "md", "shrink-0")}>
                  Filter
                </button>
              </div>
            </div>
          </form>

          <AdminInventoryTable appliances={items} />

          {totalPages > 1 ? (
            <nav aria-label="Inventory pages" className="flex items-center justify-center gap-2">
              {page > 1 ? (
                <Link
                  href={{ pathname: "/admin/inventory", query: { ...params, page: page - 1 } }}
                  className={buttonStyles("outline", "md")}
                >
                  Previous
                </Link>
              ) : null}
              <span className="px-3 text-[13.5px] text-ink-600 tnum">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={{ pathname: "/admin/inventory", query: { ...params, page: page + 1 } }}
                  className={buttonStyles("outline", "md")}
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
