import Link from "next/link";
import { PackageSearch } from "lucide-react";

import { ProductCard } from "@/components/inventory/product-card";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { buttonStyles } from "@/components/ui/button";
import type { Appliance } from "@/lib/inventory/types";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

interface InventoryGridProps {
  appliances: Appliance[];
  /** Columns at the largest breakpoint. */
  columns?: 3 | 4;
  /** First N cards get `priority` so above-the-fold images are not lazy. */
  priorityCount?: number;
  className?: string;
}

/**
 * Product grid. Two columns on phones — a single-column stack pushes inventory
 * too far below the fold on the screen most shoppers arrive on.
 */
export function InventoryGrid({
  appliances,
  columns = 4,
  priorityCount = 0,
  className,
}: InventoryGridProps) {
  const sizes =
    columns === 4
      ? "(min-width: 1280px) 300px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 47vw"
      : "(min-width: 1280px) 330px, (min-width: 1024px) 45vw, (min-width: 640px) 45vw, 47vw";

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px bg-line lg:grid-cols-3",
        columns === 4 ? "xl:grid-cols-4" : "lg:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {appliances.map((appliance, index) => (
        <ProductCard
          key={appliance.id}
          appliance={appliance}
          priority={index < priorityCount}
          sizes={sizes}
          className="border-0"
        />
      ))}
    </div>
  );
}

/**
 * Shown when a category or filter set returns nothing. Never renders broken
 * cards or fake "coming soon" products — it turns the dead end into a call/text.
 */
export function InventoryEmptyState({
  title = "No appliances match these filters right now",
  description = "Warehouse stock turns over constantly and new units are added most days. Call or text us and we'll tell you what just came in.",
  showReset = false,
  resetHref = "/inventory",
}: {
  title?: string;
  description?: string;
  showReset?: boolean;
  resetHref?: string;
}) {
  return (
    <div className="border border-line bg-bone-50 px-6 py-14 text-center sm:py-20">
      <PackageSearch aria-hidden className="mx-auto size-9 text-ink-400" strokeWidth={1.75} />
      <h3 className="mt-5 font-display text-xl font-bold text-ink-950 sm:text-2xl">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-600">{description}</p>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
        <TextLink
          context="empty-inventory"
          message={`Hi ${siteConfig.name}, what appliances do you have available right now?`}
          className={buttonStyles("primary", "md", "w-full sm:w-auto")}
        >
          Text {siteConfig.phone.display}
        </TextLink>
        <CallLink context="empty-inventory" className={buttonStyles("outline", "md", "w-full sm:w-auto")}>
          Call the warehouse
        </CallLink>
        {showReset ? (
          <Link href={resetHref} className={buttonStyles("ghost", "md", "w-full sm:w-auto")}>
            Clear filters
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** Skeleton that matches the real card's geometry so nothing shifts on load. */
export function ProductCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col border border-line bg-white">
      <div className="aspect-[4/3] w-full bg-bone-200" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 bg-bone-200" />
          <div className="h-4 w-20 bg-bone-200" />
        </div>
        <div className="mt-3 h-4 w-full bg-bone-200" />
        <div className="mt-2 h-4 w-2/3 bg-bone-200" />
        <div className="mt-3 h-3 w-1/2 bg-bone-100" />
        <div className="mt-4 border-t border-line pt-4">
          <div className="h-7 w-28 bg-bone-200" />
        </div>
        <div className="mt-5 h-11 w-full bg-bone-100" />
      </div>
    </div>
  );
}

export function InventoryGridSkeleton({ count = 8, columns = 4 }: { count?: number; columns?: 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px bg-line lg:grid-cols-3",
        columns === 4 ? "xl:grid-cols-4" : "lg:grid-cols-2 xl:grid-cols-3",
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
