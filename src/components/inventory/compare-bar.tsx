import Link from "next/link";
import { X } from "lucide-react";

import { ProductImage } from "@/components/inventory/product-image";
import { buttonStyles } from "@/components/ui/button";
import { COMPARE_LIMIT } from "@/lib/inventory/search-params";
import type { Appliance } from "@/lib/inventory/types";

interface CompareBarProps {
  /** Units currently selected, in URL order. */
  selected: Appliance[];
  /** Removes one unit from the selection. */
  removeHref: (id: string) => string;
  /** Clears the whole selection. */
  clearHref: string;
}

/**
 * Sticky selection tray for side-by-side comparison.
 *
 * Deliberately not a client component: the selection lives in the querystring,
 * so every control here is a link and the tray renders correctly on the server
 * with scripting disabled. It sits above the mobile action bar rather than over
 * it, so the call and text CTAs stay reachable while comparing.
 */
export function CompareBar({ selected, removeHref, clearHref }: CompareBarProps) {
  if (selected.length === 0) return null;

  const ready = selected.length >= 2;

  return (
    <div className="sticky bottom-0 z-30 mt-6 border-t border-line bg-white shadow-[0_-6px_20px_-12px_rgb(10_11_13/0.35)] pb-[var(--mobile-actions-height,0px)]">
      <div className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center gap-3 px-5 py-3 sm:px-6 lg:px-10">
        <p className="text-ui font-semibold text-ink-950">
          Comparing {selected.length} of {COMPARE_LIMIT}
        </p>

        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {selected.map((appliance) => (
            <li key={appliance.id} className="relative">
              <span className="flex items-center gap-2 rounded-sm border border-line bg-bone-50 py-1 pl-1 pr-2">
                <span className="size-9 shrink-0 overflow-hidden rounded-[3px] bg-white">
                  <ProductImage
                    appliance={appliance}
                    sizes="36px"
                    framed={false}
                    className="aspect-square"
                  />
                </span>
                <span className="hidden max-w-[140px] truncate text-ui text-ink-700 sm:block">
                  {appliance.title}
                </span>
                <Link
                  href={removeHref(appliance.id)}
                  scroll={false}
                  className="grid size-5 shrink-0 place-items-center rounded-[2px] text-ink-500 hover:bg-ink-100 hover:text-ink-950"
                >
                  <X aria-hidden className="size-3.5" strokeWidth={2.5} />
                  <span className="sr-only">Remove {appliance.title} from comparison</span>
                </Link>
              </span>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-2">
          <Link href={clearHref} scroll={false} className={buttonStyles("ghost", "sm")}>
            Clear
          </Link>
          {ready ? (
            <Link
              href={`/inventory/compare?ids=${selected.map((item) => item.id).join(",")}`}
              className={buttonStyles("primary", "sm")}
            >
              Compare {selected.length}
            </Link>
          ) : (
            // Stated rather than shown as a disabled button, so the requirement
            // is legible instead of something the shopper has to infer.
            <p className="text-ui text-ink-500">Pick one more to compare</p>
          )}
        </div>
      </div>
    </div>
  );
}
