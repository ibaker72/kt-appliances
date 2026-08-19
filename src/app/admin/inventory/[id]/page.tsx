import { notFound } from "next/navigation";
import Link from "next/link";
import { Archive, ArchiveRestore, ArrowLeft, CheckCircle2, Copy, ExternalLink, Tag } from "lucide-react";

import { applianceQuickAction } from "@/app/admin/actions";
import { ApplianceForm } from "@/components/admin/appliance-form";
import { DeleteAppliance } from "@/components/admin/delete-appliance";
import { ImageManager } from "@/components/admin/image-manager";
import { buttonStyles } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminNotConfiguredError,
  AdminPermissionError, getApplianceForAdmin } from "@/lib/admin/inventory-repo";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit appliance",
  robots: { index: false, follow: false },
};

export default async function EditAppliancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const { created } = await searchParams;

  let appliance;
  try {
    appliance = await getApplianceForAdmin(id);
  } catch (error) {
    if (error instanceof AdminNotConfiguredError || error instanceof AdminPermissionError) {
      return (
        <p className="border border-line bg-white px-5 py-10 text-center text-[14.5px] text-ink-600">
          No database connected. Set the Supabase environment variables to manage inventory.
        </p>
      );
    }
    throw error;
  }

  if (!appliance) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/inventory"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-600 hover:text-brand-500"
      >
        <ArrowLeft aria-hidden className="size-4" strokeWidth={2.5} />
        Back to inventory
      </Link>

      {created ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 border border-success-600/30 bg-success-50 px-4 py-3 text-[14px] font-medium text-success-600"
        >
          <CheckCircle2 aria-hidden className="size-4" strokeWidth={2.5} />
          Appliance created. Add photos below — listings with real photos of the unit convert far
          better.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-[-0.03em] text-ink-950">
            {appliance.brand} {appliance.title}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-ink-500">
            Created {formatDate(appliance.createdAt)} · Updated {formatDate(appliance.updatedAt)} ·{" "}
            <span className="font-mono text-[12.5px]">/{appliance.slug}</span>
          </p>
        </div>
        <Link
          href={`/inventory/${appliance.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles("outline", "md")}
        >
          View listing
          <ExternalLink aria-hidden className="size-3.5" strokeWidth={2.5} />
        </Link>
      </div>

      {/* Photos come first: it is what the owner comes back to this page to do. */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink-950">Photos</h2>
        <p className="mt-1 text-[14px] text-ink-600">
          The first photo is the one shown in search results and on category pages.
        </p>
        <div className="mt-4">
          <ImageManager appliance={appliance} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink-950">Details</h2>
        <div className="mt-4">
          <ApplianceForm appliance={appliance} />
        </div>
      </section>

      <section className="mt-12 border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-950">
          Other actions
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {appliance.status !== "sold" ? (
            <form action={applianceQuickAction}>
              <input type="hidden" name="intent" value="status" />
              <input type="hidden" name="id" value={appliance.id} />
              <input type="hidden" name="status" value="sold" />
              <button type="submit" className={buttonStyles("dark", "md")}>
                <Tag aria-hidden className="size-4" strokeWidth={2.5} />
                Mark sold
              </button>
            </form>
          ) : null}

          <form action={applianceQuickAction}>
            <input
              type="hidden"
              name="intent"
              value={appliance.published ? "unpublish" : "publish"}
            />
            <input type="hidden" name="id" value={appliance.id} />
            <button type="submit" className={buttonStyles("outline", "md")}>
              {appliance.published ? (
                <>
                  <Archive aria-hidden className="size-4" strokeWidth={2.5} />
                  Archive
                </>
              ) : (
                <>
                  <ArchiveRestore aria-hidden className="size-4" strokeWidth={2.5} />
                  Restore to site
                </>
              )}
            </button>
          </form>

          <form action={applianceQuickAction}>
            <input type="hidden" name="intent" value="duplicate" />
            <input type="hidden" name="id" value={appliance.id} />
            <button type="submit" className={buttonStyles("outline", "md")}>
              <Copy aria-hidden className="size-4" strokeWidth={2.5} />
              Duplicate as draft
            </button>
          </form>

          <DeleteAppliance id={appliance.id} label={`${appliance.brand} ${appliance.title}`} />
        </div>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-500">
          <strong className="font-semibold text-ink-700">Mark sold</strong> is what you want when a
          unit leaves the warehouse: the page stays live, shows SOLD and points shoppers at similar
          stock, so the link in an old Facebook post still works.{" "}
          <strong className="font-semibold text-ink-700">Archive</strong> takes it off the website
          entirely but keeps the record, the photos and the web address, so it can be restored.
          Deleting is permanent and takes the photos with it.
        </p>
      </section>
    </div>
  );
}
