import { SearchBar } from "@/components/inventory/search-bar";
import { Container } from "@/components/ui/container";

/**
 * Search band directly under the navigation.
 *
 * A shopper who already knows what they want — a brand, a model number,
 * "french door" — should not have to scroll past merchandising to type it.
 *
 * The popular-search rail that used to sit here now lives in the header, under
 * the category bar, which is where retail puts it and where it stays reachable
 * from category pages too.
 */
export function SearchBand({ availableCount }: { availableCount: number }) {
  return (
    <section aria-labelledby="search-heading" className="border-b border-line bg-bone-100">
      <Container className="py-6 sm:py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0 lg:max-w-xl lg:flex-1">
            <h2 id="search-heading" className="text-[18px] font-semibold text-ink-950 sm:text-[20px]">
              What are you looking for?
            </h2>
            <SearchBar
              id="home-search"
              size="lg"
              className="mt-3"
              placeholder="Samsung, RF28, french door, washer…"
            />
          </div>

          {availableCount > 0 ? (
            <p className="shrink-0 text-ui text-ink-600 lg:pb-1 lg:text-right">
              <span className="block font-display text-3xl font-extrabold text-ink-950 tnum">
                {availableCount}
              </span>
              appliance{availableCount === 1 ? "" : "s"} on the floor right now
            </p>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
