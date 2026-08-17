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
      <Container className="py-4">
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
