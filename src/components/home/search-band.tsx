import { QuickCategoryNav } from "@/components/inventory/quick-category-nav";
import { SearchBar } from "@/components/inventory/search-bar";
import { Container } from "@/components/ui/container";
import type { NavItem } from "@/lib/navigation";

/**
 * Search band directly under the navigation.
 *
 * This is the first thing on the homepage on purpose: a shopper who already knows
 * what they want — a brand, a model number, "french door" — should not have to
 * scroll past merchandising to type it. The popular-search rail underneath is
 * built from real catalogue values, so it never offers a dead end.
 */
export function SearchBand({
  quickLinks,
  availableCount,
}: {
  quickLinks: NavItem[];
  availableCount: number;
}) {
  return (
    <section aria-labelledby="search-heading" className="border-b border-line bg-bone-100">
      <Container className="py-7 sm:py-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0 lg:max-w-xl lg:flex-1">
            <h2
              id="search-heading"
              className="font-display text-[1.35rem] font-extrabold tracking-[-0.025em] text-ink-950 sm:text-[1.6rem]"
            >
              What are you looking for?
            </h2>
            <p className="mt-1.5 text-[14.5px] text-ink-600">
              Search the warehouse by brand, model number or appliance type.
            </p>
            <SearchBar
              id="home-search"
              size="lg"
              className="mt-4"
              placeholder="Samsung, RF28, french door, washer…"
            />
          </div>

          {availableCount > 0 ? (
            <p className="shrink-0 text-[14px] text-ink-600 lg:pb-1 lg:text-right">
              <span className="block font-display text-3xl font-extrabold text-ink-950 tnum">
                {availableCount}
              </span>
              appliance{availableCount === 1 ? "" : "s"} on the floor right now
            </p>
          ) : null}
        </div>

        {quickLinks.length > 0 ? (
          <div className="mt-6">
            <h3 className="eyebrow mb-3 text-ink-500">Popular searches</h3>
            <QuickCategoryNav links={quickLinks} />
          </div>
        ) : null}
      </Container>
    </section>
  );
}
