import { SearchBar } from "@/components/inventory/search-bar";
import { Container } from "@/components/ui/container";

/**
 * Mobile search band.
 *
 * Hidden from `lg` up, where the header's own search field is the widest thing
 * in the main bar and a second one here would just be a duplicate pushing
 * products below the fold. Below `lg` the header search collapses to a toggle,
 * so this keeps a real field on the screen a shopper actually lands on.
 *
 * The popular-search rail that used to sit here now lives in the header, under
 * the category bar, where it also serves the category pages.
 */
export function SearchBand({ availableCount }: { availableCount: number }) {
  return (
    <section aria-labelledby="search-heading" className="border-b border-line bg-bone-100 lg:hidden">
      <Container className="py-3">
        <div className="flex flex-col gap-2 sm:gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0 lg:max-w-xl lg:flex-1">
            <h2 id="search-heading" className="sr-only sm:not-sr-only sm:text-[20px] sm:font-semibold sm:text-ink-950">
              What are you looking for?
            </h2>
            <SearchBar
              id="home-search"
              size="lg"
              className="sm:mt-3"
              placeholder="Samsung, RF28, french door, washer…"
            />
          </div>

          {availableCount > 0 ? (
            <p className="shrink-0 text-ui text-ink-600 lg:pb-1 lg:text-right">
              <span className="font-display text-[17px] font-extrabold text-ink-950 tnum sm:block sm:text-3xl">
                {availableCount}
              </span>{" "}
              appliance{availableCount === 1 ? "" : "s"} on the floor right now
            </p>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
