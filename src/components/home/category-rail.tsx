import Image from "next/image";
import Link from "next/link";

import { Rail } from "@/components/ui/rail";
import { CATEGORY_LIST } from "@/lib/inventory/types";

/**
 * Category doorways.
 *
 * A flat, even row — every category the same size, in a fixed order. The
 * previous version was a 12-column mosaic with per-category span, height and
 * `sizes` maps, which is layout cleverness a shopper gets nothing from: the
 * only job here is to be a scannable set of doors, and equal weight scans
 * fastest. Counts come from live inventory and a category with none is still
 * shown, because an empty category page explains itself better than a gap.
 */
export function CategoryRail({ counts = {} }: { counts?: Record<string, number> }) {
  return (
    <Rail label="Shop by category" itemWidth="category">
      {CATEGORY_LIST.map((category) => {
        const count = counts[category.slug] ?? 0;
        return (
          <Link
            key={category.slug}
            href={category.path}
            className="group flex flex-col items-center rounded-md border border-line bg-white p-2.5 text-center shadow-card transition-shadow hover:shadow-hover"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-bone-50">
              <Image
                src={category.artwork}
                alt=""
                fill
                sizes="(min-width: 640px) 130px, 104px"
                className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <h3 className="mt-1.5 text-[12px] font-semibold leading-tight text-ink-950 group-hover:text-brand-500 sm:mt-2 sm:text-ui">
              {category.name}
            </h3>
            <p className="mt-0.5 text-[11.5px] text-ink-500 tnum sm:mt-1 sm:text-ui">
              {count > 0 ? `${count} available` : "Ask what's in"}
            </p>
          </Link>
        );
      })}
    </Rail>
  );
}
