import Link from "next/link";

import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { InventoryEmptyState, InventoryGrid } from "@/components/inventory/inventory-grid";
import { SoldProductCard } from "@/components/inventory/product-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { itemListSchema } from "@/lib/seo/jsonld";
import {
  getInventoryFacets,
  queryInventory,
} from "@/lib/inventory/repository";
import {
  PAGE_SIZE,
  activeFilterCount,
  buildQueryString,
  parseFilters,
  toInventoryQuery,
  type RawSearchParams,
} from "@/lib/inventory/search-params";
import type { ApplianceCategory } from "@/lib/inventory/types";
import { cn } from "@/lib/utils";

interface InventoryBrowserProps {
  searchParams: RawSearchParams;
  /** Route filters write back to. */
  basePath: string;
  /** Scopes results to a category and hides the category control. */
  category?: ApplianceCategory;
  listName: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * Shared filter + results surface used by `/inventory` and every category page.
 * Rendered on the server so the first paint of an ad landing already contains
 * products — no client-side fetch waterfall before anyone sees a price.
 */
export async function InventoryBrowser({
  searchParams,
  basePath,
  category,
  listName,
  emptyTitle,
  emptyDescription,
}: InventoryBrowserProps) {
  const filters = parseFilters(searchParams);
  const scoped = category ? { ...filters, category } : filters;

  const [result, facets] = await Promise.all([
    queryInventory(toInventoryQuery(scoped)),
    getInventoryFacets(category ?? filters.category),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const activeCount = activeFilterCount(scoped);
  const showingFrom = result.total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, result.total);

  return (
    <>
      <Container>
        <InventoryFilters
          filters={scoped}
          brands={facets.brands}
          priceBounds={{ min: facets.minPrice, max: facets.maxPrice }}
          basePath={basePath}
          lockCategory={Boolean(category)}
          resultCount={result.total}
        />
      </Container>

      <Container className="py-8 sm:py-10">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-[14px] text-ink-600">
            {result.total > 0 ? (
              <>
                Showing{" "}
                <span className="font-semibold text-ink-950 tnum">
                  {showingFrom}–{showingTo}
                </span>{" "}
                of <span className="font-semibold text-ink-950 tnum">{result.total}</span>{" "}
                {filters.showSold ? "recently sold" : "available"}{" "}
                {result.total === 1 ? "appliance" : "appliances"}
              </>
            ) : null}
          </p>
          {activeCount > 0 ? (
            <Link
              href={basePath}
              className="inline-flex min-h-[34px] items-center text-[13px] font-semibold text-ink-600 underline underline-offset-4 hover:text-brand-500"
            >
              Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
            </Link>
          ) : null}
        </div>

        {result.items.length > 0 ? (
          <>
            <JsonLd data={itemListSchema(result.items, listName)} />
            {filters.showSold ? (
              <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
                {result.items.map((appliance) => (
                  <li key={appliance.id}>
                    <SoldProductCard appliance={appliance} />
                  </li>
                ))}
              </ul>
            ) : (
              <InventoryGrid appliances={result.items} columns={4} priorityCount={4} />
            )}

            {totalPages > 1 ? (
              <Pagination
                basePath={basePath}
                filters={scoped}
                currentPage={currentPage}
                totalPages={totalPages}
              />
            ) : null}
          </>
        ) : (
          <InventoryEmptyState
            title={
              activeCount > 0
                ? "No appliances match these filters right now"
                : (emptyTitle ?? "No appliances listed right now")
            }
            description={
              activeCount > 0
                ? "Try widening the price range or clearing a filter. Warehouse stock changes daily — call or text us and we'll tell you what just came in."
                : (emptyDescription ??
                  "New inventory arrives regularly. Call or text us to ask what's currently available.")
            }
            showReset={activeCount > 0}
            resetHref={basePath}
          />
        )}
      </Container>
    </>
  );
}

function Pagination({
  basePath,
  filters,
  currentPage,
  totalPages,
}: {
  basePath: string;
  filters: ReturnType<typeof parseFilters>;
  currentPage: number;
  totalPages: number;
}) {
  const href = (page: number) => `${basePath}${buildQueryString({ ...filters, page })}`;

  // Show a compact window around the current page rather than every page number.
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visible = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);

  return (
    <nav aria-label="Inventory pages" className="mt-10 flex items-center justify-center gap-1.5">
      {currentPage > 1 ? (
        <Link
          href={href(currentPage - 1)}
          rel="prev"
          className="flex h-11 items-center border border-ink-200 px-4 font-display text-[12px] font-bold uppercase tracking-[0.06em] text-ink-800 hover:border-ink-950"
        >
          Previous
        </Link>
      ) : null}

      {visible.map((page, index) => (
        <span key={page} className="flex items-center gap-1.5">
          {index > 0 && page - visible[index - 1] > 1 ? (
            <span aria-hidden className="px-1 text-ink-400">
              …
            </span>
          ) : null}
          <Link
            href={href(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={cn(
              "grid h-11 min-w-11 place-items-center border px-3 font-display text-[13px] font-bold tnum",
              page === currentPage
                ? "border-ink-950 bg-ink-950 text-white"
                : "border-ink-200 text-ink-800 hover:border-ink-950",
            )}
          >
            {page}
          </Link>
        </span>
      ))}

      {currentPage < totalPages ? (
        <Link
          href={href(currentPage + 1)}
          rel="next"
          className="flex h-11 items-center border border-ink-200 px-4 font-display text-[12px] font-bold uppercase tracking-[0.06em] text-ink-800 hover:border-ink-950"
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
}
