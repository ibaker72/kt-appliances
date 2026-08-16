import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CATEGORY_LIST, type ApplianceCategory, type CategoryDefinition } from "@/lib/inventory/types";
import { cn } from "@/lib/utils";

/**
 * Shop-by-category merchandising.
 *
 * Asymmetric on desktop — refrigerators lead because they carry the highest
 * ticket, laundry sets get a wide tile — collapsing to a straightforward stack
 * on phones where scanning beats layout cleverness.
 */
const SPANS: Record<ApplianceCategory, string> = {
  refrigerators: "sm:col-span-2 lg:col-span-6",
  washers: "lg:col-span-3",
  dryers: "lg:col-span-3",
  "washer-dryer-sets": "sm:col-span-2 lg:col-span-4",
  ranges: "lg:col-span-4",
  dishwashers: "lg:col-span-4",
  other: "sm:col-span-2 lg:col-span-12",
};

const IMAGE_HEIGHTS: Record<ApplianceCategory, string> = {
  refrigerators: "h-56 sm:h-72 lg:h-[340px]",
  washers: "h-48 lg:h-[340px]",
  dryers: "h-48 lg:h-[340px]",
  "washer-dryer-sets": "h-48 lg:h-56",
  ranges: "h-48 lg:h-56",
  dishwashers: "h-48 lg:h-56",
  other: "h-44 lg:h-52",
};

const SIZES: Record<ApplianceCategory, string> = {
  refrigerators: "(min-width: 1024px) 640px, (min-width: 640px) 92vw, 92vw",
  washers: "(min-width: 1024px) 320px, 46vw",
  dryers: "(min-width: 1024px) 320px, 46vw",
  "washer-dryer-sets": "(min-width: 1024px) 430px, 92vw",
  ranges: "(min-width: 1024px) 430px, 46vw",
  dishwashers: "(min-width: 1024px) 430px, 46vw",
  other: "(min-width: 1024px) 1300px, 92vw",
};

function CategoryTile({
  category,
  count,
  priority,
}: {
  category: CategoryDefinition;
  count?: number;
  priority?: boolean;
}) {
  return (
    <Link
      href={category.path}
      className={cn(
        "zoom-frame group flex flex-col overflow-hidden border border-line bg-white transition-colors hover:border-ink-950",
        SPANS[category.slug],
      )}
    >
      <div className={cn("relative w-full overflow-hidden bg-bone-100", IMAGE_HEIGHTS[category.slug])}>
        <Image
          src={category.artwork}
          alt=""
          fill
          sizes={SIZES[category.slug]}
          priority={priority}
          className="object-contain p-2"
        />
      </div>

      <div className="flex flex-1 items-center justify-between gap-4 border-t border-line px-4 py-4 sm:px-5">
        <div>
          <h3 className="font-display text-[19px] font-bold leading-tight tracking-[-0.02em] text-ink-950 sm:text-xl">
            {category.name}
          </h3>
          <p className="mt-1 text-[13px] text-ink-500">
            {category.tagline}
            {count ? (
              <>
                <span aria-hidden className="mx-1.5 text-ink-300">·</span>
                <span className="font-medium text-ink-700 tnum">
                  {count} available
                </span>
              </>
            ) : null}
          </p>
        </div>
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center border border-line text-ink-500 transition-colors group-hover:border-brand-500 group-hover:bg-brand-500 group-hover:text-white"
        >
          <ArrowRight className="size-4" strokeWidth={2.5} />
        </span>
      </div>
    </Link>
  );
}

export function CategoryGrid({ counts = {} }: { counts?: Record<string, number> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-12">
      {CATEGORY_LIST.map((category, index) => (
        <CategoryTile
          key={category.slug}
          category={category}
          count={counts[category.slug]}
          priority={index === 0}
        />
      ))}
    </div>
  );
}
