import Image from "next/image";
import Link from "next/link";
import { Copy, Eye, EyeOff, Pencil, Star } from "lucide-react";

import { applianceQuickAction } from "@/app/admin/actions";
import {
  CATEGORIES,
  STATUS_LABELS,
  formatPrice,
  primaryImage,
  type Appliance,
  type ApplianceStatus,
} from "@/lib/inventory/types";
import { cn, relativeTime } from "@/lib/utils";

/**
 * Inventory list.
 *
 * A real table on desktop; stacked cards on phones, because inventory gets
 * managed from the warehouse floor as often as from a desk. Every control is a
 * form posting to a server action, so it works without client JavaScript.
 */

const STATUS_STYLES: Record<ApplianceStatus, string> = {
  available: "bg-success-50 text-success-600",
  reserved: "bg-bone-200 text-ink-700",
  sold: "bg-ink-950 text-white",
  draft: "bg-white text-ink-500 border border-ink-200",
};

function StatusPill({ status }: { status: ApplianceStatus }) {
  return (
    <span
      className={cn(
        "inline-block px-2 py-1 font-display text-[10.5px] font-bold uppercase leading-none tracking-[0.07em]",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function QuickButton({
  intent,
  id,
  label,
  children,
  extra,
}: {
  intent: string;
  id: string;
  label: string;
  children: React.ReactNode;
  extra?: Record<string, string>;
}) {
  return (
    <form action={applianceQuickAction} className="inline-block">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="id" value={id} />
      {extra
        ? Object.entries(extra).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))
        : null}
      <button
        type="submit"
        aria-label={label}
        title={label}
        className="grid size-10 place-items-center border border-line bg-white text-ink-600 transition-colors hover:border-ink-950 hover:text-ink-950"
      >
        {children}
      </button>
    </form>
  );
}

function StatusSelect({ appliance }: { appliance: Appliance }) {
  return (
    <form action={applianceQuickAction} className="inline-block">
      <input type="hidden" name="intent" value="status" />
      <input type="hidden" name="id" value={appliance.id} />
      <label className="sr-only" htmlFor={`status-${appliance.id}`}>
        Change status for {appliance.brand} {appliance.title}
      </label>
      <select
        id={`status-${appliance.id}`}
        name="status"
        defaultValue={appliance.status}
        className="h-10 border border-line bg-white px-2 text-[13px] text-ink-800"
      >
        {(Object.keys(STATUS_LABELS) as ApplianceStatus[]).map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="ml-1 h-10 border border-line bg-white px-3 text-[11.5px] font-semibold uppercase tracking-wide text-ink-700 transition-colors hover:border-ink-950 hover:text-ink-950"
      >
        Set
      </button>
    </form>
  );
}

function Thumb({ appliance }: { appliance: Appliance }) {
  const image = primaryImage(appliance);
  const src = image?.imageUrl ?? CATEGORIES[appliance.category].artwork;
  return (
    <div className="relative size-16 shrink-0 overflow-hidden border border-line bg-bone-100">
      <Image src={src} alt="" fill sizes="64px" className="object-contain" />
    </div>
  );
}

export function AdminInventoryTable({ appliances }: { appliances: Appliance[] }) {
  if (appliances.length === 0) {
    return (
      <p className="border border-line bg-white px-5 py-10 text-center text-[14px] text-ink-500">
        No appliances match. Add one, or clear the filters above.
      </p>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto border border-line bg-white lg:block">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-bone-50">
              {["Appliance", "Price", "Status", "Visibility", "Updated", "Actions"].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wide text-ink-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {appliances.map((appliance) => (
              <tr key={appliance.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Thumb appliance={appliance} />
                    <div className="min-w-0">
                      <Link
                        href={`/admin/inventory/${appliance.id}`}
                        className="block truncate font-display text-[15px] font-bold text-ink-950 hover:text-brand-500"
                      >
                        {appliance.brand} {appliance.title}
                      </Link>
                      <p className="mt-0.5 truncate text-[12.5px] text-ink-500">
                        {appliance.modelNumber ? `${appliance.modelNumber} · ` : ""}
                        {CATEGORIES[appliance.category].name}
                        {appliance.sku ? ` · ${appliance.sku}` : ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-display text-[15px] font-bold text-ink-950 tnum">
                    {formatPrice(appliance.price)}
                  </p>
                  {appliance.compareAtPrice ? (
                    <p className="text-[12px] text-ink-400 line-through tnum">
                      {formatPrice(appliance.compareAtPrice)}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[12px] text-ink-500 tnum">Qty {appliance.quantity}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={appliance.status} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "text-[13px] font-medium",
                      appliance.published ? "text-success-600" : "text-ink-400",
                    )}
                  >
                    {appliance.published ? "Published" : "Hidden"}
                  </span>
                  {appliance.featured ? (
                    <span className="mt-1 block text-[12px] text-brand-500">Featured</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[13px] text-ink-500">
                  {relativeTime(appliance.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/inventory/${appliance.id}`}
                      aria-label={`Edit ${appliance.brand} ${appliance.title}`}
                      className="grid size-10 place-items-center border border-line bg-white text-ink-600 transition-colors hover:border-ink-950 hover:text-ink-950"
                    >
                      <Pencil aria-hidden className="size-4" strokeWidth={2.25} />
                    </Link>
                    <QuickButton
                      intent={appliance.published ? "unpublish" : "publish"}
                      id={appliance.id}
                      label={appliance.published ? "Unpublish" : "Publish"}
                    >
                      {appliance.published ? (
                        <EyeOff aria-hidden className="size-4" strokeWidth={2.25} />
                      ) : (
                        <Eye aria-hidden className="size-4" strokeWidth={2.25} />
                      )}
                    </QuickButton>
                    <QuickButton
                      intent={appliance.featured ? "unfeature" : "feature"}
                      id={appliance.id}
                      label={appliance.featured ? "Remove from homepage" : "Feature on homepage"}
                    >
                      <Star
                        aria-hidden
                        className={cn("size-4", appliance.featured ? "fill-brand-500 text-brand-500" : "")}
                        strokeWidth={2.25}
                      />
                    </QuickButton>
                    <QuickButton intent="duplicate" id={appliance.id} label="Duplicate as draft">
                      <Copy aria-hidden className="size-4" strokeWidth={2.25} />
                    </QuickButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="space-y-3 lg:hidden">
        {appliances.map((appliance) => (
          <li key={appliance.id} className="border border-line bg-white p-4">
            <div className="flex gap-3">
              <Thumb appliance={appliance} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/inventory/${appliance.id}`}
                  className="block font-display text-[15px] font-bold leading-tight text-ink-950"
                >
                  {appliance.brand} {appliance.title}
                </Link>
                <p className="mt-1 text-[12.5px] text-ink-500">
                  {appliance.modelNumber ? `${appliance.modelNumber} · ` : ""}
                  {CATEGORIES[appliance.category].name}
                </p>
                <p className="mt-1.5 font-display text-lg font-bold text-brand-500 tnum">
                  {formatPrice(appliance.price)}
                  <span className="ml-2 text-[12px] font-medium text-ink-500">
                    Qty {appliance.quantity}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <StatusPill status={appliance.status} />
              <span
                className={cn(
                  "text-[12.5px] font-medium",
                  appliance.published ? "text-success-600" : "text-ink-400",
                )}
              >
                {appliance.published ? "Published" : "Hidden"}
              </span>
              <span className="ml-auto text-[12px] text-ink-400">
                {relativeTime(appliance.updatedAt)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/inventory/${appliance.id}`}
                className="flex h-11 flex-1 items-center justify-center gap-2 border border-ink-900 bg-white text-[13.5px] font-semibold text-ink-900"
              >
                <Pencil aria-hidden className="size-3.5" strokeWidth={2.5} />
                Edit
              </Link>
              <QuickButton
                intent={appliance.published ? "unpublish" : "publish"}
                id={appliance.id}
                label={appliance.published ? "Unpublish" : "Publish"}
              >
                {appliance.published ? (
                  <EyeOff aria-hidden className="size-4" strokeWidth={2.25} />
                ) : (
                  <Eye aria-hidden className="size-4" strokeWidth={2.25} />
                )}
              </QuickButton>
              <QuickButton intent="duplicate" id={appliance.id} label="Duplicate as draft">
                <Copy aria-hidden className="size-4" strokeWidth={2.25} />
              </QuickButton>
            </div>

            <div className="mt-3">
              <StatusSelect appliance={appliance} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
