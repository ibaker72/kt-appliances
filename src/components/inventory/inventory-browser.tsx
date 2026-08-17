import Link from "next/link";
import { X } from "lucide-react";

import { FilterSidebar, InventoryToolbar } from "@/components/inventory/inventory-filters";
import { CompareBar } from "@/components/inventory/compare-bar";
import { InventoryEmptyState, InventoryGrid } from "@/components/inventory/inventory-grid";
import { SoldProductCard } from "@/components/inventory/product-card";
import { SearchBar } from "@/components/inventory/search-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { itemListSchema } from "@/lib/seo/jsonld";
import { getInventoryFacets, queryInventory } from "@/lib/inventory/repository";
import { CONDITION_LABELS, FUEL_LABELS, CATEGORIES } from "@/lib/inventory/types";
import {
  COMPARE_LIMIT,
  PAGE_SIZE,
  activeFilterCount,
  buildQueryString,
  parseFilters,
  toInventoryQuery,
  type ParsedFilters,
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
 *
 * Desktop puts filters in a sticky sidebar beside the grid; phones get the same
 * controls behind a filter button, with the grid taking the full width.
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
    // Counts reflect what is already selected, so a row reading "3" means
    // ticking it yields three results rather than three somewhere in the catalogue.
    getInventoryFacets(category ?? filters.category, {
      brands: scoped.brands,
      subcategories: scoped.types,
      colors: scoped.colors,
      conditions: scoped.conditions,
      fuelTypes: scoped.fuelTypes,
      minPrice: scoped.min,
      maxPrice: scoped.max,
      warrantyOnly: scoped.warrantyOnly,
      dealsOnly: scoped.dealsOnly,
    }),
  ]);

  /**
   * Compare selection lives in the querystring, so the toggle is a plain link
   * and the whole feature works before hydration. Ids are kept even when they
   * are not on the current page — paging away from a selected unit must not
   * silently drop it from the comparison.
   */
  const compareIds = scoped.compare;
  const compareHref = (id: string) => {
    const next = compareIds.includes(id)
      ? compareIds.filter((entry) => entry !== id)
      : [...compareIds, id].slice(0, COMPARE_LIMIT);
    return `${basePath}${buildQueryString({ ...scoped, compare: next })}`;
  };
  const compareSelected = compareIds
    .map((id) => result.items.find((item) => item.id === id))
    .filter((item): item is (typeof result.items)[number] => Boolean(item));

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const activeCount = activeFilterCount(scoped);
  const showingFrom = result.total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, result.total);

  const summary =
    result.total > 0 ? (
      <p className="min-w-0">
        Showing{" "}
        <span className="font-semibold text-ink-950 tnum">
          {showingFrom}–{showingTo}
        </span>{" "}
        of <span className="font-semibold text-ink-950 tnum">{result.total}</span>{" "}
        {filters.showSold ? "recently sold" : "available"}{" "}
        {result.total === 1 ? "appliance" : "appliances"}
      </p>
    ) : (
      <p className="min-w-0">No appliances match</p>
    );

  return (
    <Container className="py-6 sm:py-8">
      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
        {/* Desktop sidebar. Sticky below the header so filters stay reachable in a
            long grid; `max-h`/`overflow` keep a tall filter set scrollable. */}
        <div className="hidden lg:block">
          <div className="sticky top-[152px] max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
            <FilterSidebar
              filters={scoped}
              facets={facets}
              basePath={basePath}
              lockCategory={Boolean(category)}
            />
          </div>
        </div>

        <div className="min-w-0">
          {/* Search scopes to this route, so searching inside a category stays in it. */}
          <SearchBar
            action={basePath}
            defaultValue={filters.q}
            id="browse-search"
            placeholder="Search by brand, model number or appliance…"
            className="mb-5"
          />

          {/* Sticky under the header so sort and density stay reachable in a long
              grid. `top` matches the header's height at `lg`, where it sticks. */}
          <div className="sticky top-[152px] z-20 -mx-1 border-y border-line bg-white/95 px-1 py-3 backdrop-blur-sm">
            <InventoryToolbar
              filters={scoped}
              facets={facets}
              basePath={basePath}
              lockCategory={Boolean(category)}
              resultCount={result.total}
              summary={summary}
              density={scoped.cols}
              densityHrefs={{
                3: `${basePath}${buildQueryString({ ...scoped, cols: 3 })}`,
                4: `${basePath}${buildQueryString({ ...scoped, cols: 4 })}`,
              }}
            />
          </div>

          {activeCount > 0 ? (
            <ActiveFilterChips filters={scoped} basePath={basePath} lockCategory={Boolean(category)} />
          ) : null}

          <div className="mt-6">
            {result.items.length > 0 ? (
              <>
                <JsonLd data={itemListSchema(result.items, listName)} />
                {filters.showSold ? (
                  <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                    {result.items.map((appliance) => (
                      <li key={appliance.id}>
                        <SoldProductCard appliance={appliance} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <InventoryGrid
                    appliances={result.items}
                    columns={scoped.cols}
                    priorityCount={scoped.cols}
                    compareHref={compareHref}
                    compareIds={compareIds}
                  />
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
          </div>
        </div>
      </div>

      <CompareBar
        selected={compareSelected}
        removeHref={(id) =>
          `${basePath}${buildQueryString({ ...scoped, compare: compareIds.filter((entry) => entry !== id) })}`
        }
        clearHref={`${basePath}${buildQueryString({ ...scoped, compare: [] })}`}
      />
    </Container>
  );
}

/**
 * Applied filters as removable chips.
 *
 * Plain links rather than buttons: each one is just "the current URL minus this
 * value", so removing a filter costs no client JavaScript and works before
 * hydration.
 */
function ActiveFilterChips({
  filters,
  basePath,
  lockCategory,
}: {
  filters: ParsedFilters;
  basePath: string;
  lockCategory: boolean;
}) {
  const href = (patch: Partial<ParsedFilters>) =>
    `${basePath}${buildQueryString({ ...filters, ...patch, page: 1 })}`;

  const chips: Array<{ key: string; label: string; href: string }> = [];

  if (filters.q) {
    chips.push({ key: "q", label: `“${filters.q}”`, href: href({ q: "" }) });
  }
  // A category page owns its category, so that chip would be a dead end there.
  if (filters.category && !lockCategory) {
    chips.push({
      key: "category",
      label: CATEGORIES[filters.category].name,
      href: href({ category: undefined }),
    });
  }
  for (const brand of filters.brands) {
    chips.push({
      key: `brand-${brand}`,
      label: brand,
      href: href({ brands: filters.brands.filter((entry) => entry !== brand) }),
    });
  }
  for (const type of filters.types) {
    chips.push({
      key: `type-${type}`,
      label: type,
      href: href({ types: filters.types.filter((entry) => entry !== type) }),
    });
  }
  for (const color of filters.colors) {
    chips.push({
      key: `color-${color}`,
      label: color,
      href: href({ colors: filters.colors.filter((entry) => entry !== color) }),
    });
  }
  for (const condition of filters.conditions) {
    chips.push({
      key: `condition-${condition}`,
      label: CONDITION_LABELS[condition],
      href: href({ conditions: filters.conditions.filter((entry) => entry !== condition) }),
    });
  }
  for (const fuel of filters.fuelTypes) {
    chips.push({
      key: `fuel-${fuel}`,
      label: FUEL_LABELS[fuel],
      href: href({ fuelTypes: filters.fuelTypes.filter((entry) => entry !== fuel) }),
    });
  }
  if (filters.min != null || filters.max != null) {
    const min = filters.min != null ? `$${filters.min.toLocaleString("en-US")}` : "Any";
    const max = filters.max != null ? `$${filters.max.toLocaleString("en-US")}` : "Any";
    chips.push({
      key: "price",
      label: `${min} – ${max}`,
      href: href({ min: undefined, max: undefined }),
    });
  }
  if (filters.warrantyOnly) {
    chips.push({
      key: "warranty",
      label: "Warranty available",
      href: href({ warrantyOnly: false }),
    });
  }
  if (filters.dealsOnly) {
    chips.push({ key: "deals", label: "Marked down", href: href({ dealsOnly: false }) });
  }
  if (filters.showSold) {
    chips.push({ key: "sold", label: "Recently sold", href: href({ showSold: false }) });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-line bg-bone-50 px-3 py-2.5">
      <h2 className="mr-1 text-ui font-semibold uppercase tracking-wide text-ink-500">Applied</h2>
      <ul className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              href={chip.href}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-pill border border-ink-300 bg-white px-3 py-1 text-[13px] font-medium text-ink-900 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-500"
            >
              {chip.label}
              <X aria-hidden className="size-3.5" strokeWidth={2.5} />
              <span className="sr-only">Remove filter</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={basePath}
        className="ml-1 inline-flex min-h-9 items-center text-[13px] font-semibold text-ink-600 underline underline-offset-4 hover:text-brand-500"
      >
        Clear all
      </Link>
    </div>
  );
}

function Pagination({
  basePath,
  filters,
  currentPage,
  totalPages,
}: {
  basePath: string;
  filters: ParsedFilters;
  currentPage: number;
  totalPages: number;
}) {
  const href = (page: number) => `${basePath}${buildQueryString({ ...filters, page })}`;

  // Show a compact window around the current page rather than every page number.
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visible = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);

  return (
    <nav aria-label="Inventory pages" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
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
