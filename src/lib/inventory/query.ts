import type {
  Appliance,
  ApplianceCategory,
  ApplianceCondition,
  ApplianceStatus,
  FuelType,
} from "./types";

/**
 * Query shapes and sort constants.
 *
 * Kept separate from `repository.ts` because the filter UI is a client component
 * and needs the sort options, while the repository is server-only (it holds the
 * Supabase clients). Everything in this file is pure data and safe on both sides.
 */

export const INVENTORY_SORTS = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
  "savings",
  "brand",
] as const;
export type InventorySort = (typeof INVENTORY_SORTS)[number];

export const SORT_LABELS: Record<InventorySort, string> = {
  featured: "Featured",
  newest: "Newest arrivals",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  savings: "Biggest savings",
  brand: "Brand A–Z",
};

/**
 * "Biggest savings" is only meaningful for units carrying a verified comparison
 * price, so choosing it also narrows the result set to those units. Callers that
 * need to explain that to a shopper can check this rather than re-deriving it.
 */
export function sortImpliesSavings(sort: InventorySort): boolean {
  return sort === "savings";
}

export interface InventoryQuery {
  category?: ApplianceCategory;
  brands?: string[];
  /** Free-text `subcategory` values, e.g. "French Door" — the appliance-type filter. */
  subcategories?: string[];
  /** Free-text `color` values, e.g. "Stainless Steel". */
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  conditions?: ApplianceCondition[];
  fuelTypes?: FuelType[];
  /** Defaults to `["available", "reserved"]` — draft rows are never public. */
  statuses?: ApplianceStatus[];
  search?: string;
  sort?: InventorySort;
  featuredOnly?: boolean;
  /** Restricts to units flagged as warranty-eligible. */
  warrantyOnly?: boolean;
  /** Restricts to units carrying a verified comparison price (i.e. real markdowns). */
  dealsOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface InventoryResult {
  items: Appliance[];
  total: number;
  /** True when the results come from the local sample dataset rather than a database. */
  isDemo: boolean;
}

/**
 * Price bands offered in navigation and on the homepage price tiles.
 *
 * Bounds are inclusive of `min` and `max` because `parseFilters` maps them onto
 * `gte`/`lte`. A band is only ever rendered once something is priced inside it —
 * see `getNavigationMenu`.
 */
export const PRICE_BANDS = [
  { label: "Under $500", min: undefined, max: 500 },
  { label: "$500 – $1,000", min: 500, max: 1000 },
  { label: "$1,000 & up", min: 1000, max: undefined },
] as const satisfies ReadonlyArray<{
  label: string;
  min: number | undefined;
  max: number | undefined;
}>;

/** A navigation link that is known to return at least `count` results. */
export interface MenuLink {
  label: string;
  href: string;
  count: number;
}

/** One category's mega-menu panel, derived entirely from live inventory. */
export interface CategoryMenu {
  slug: ApplianceCategory;
  name: string;
  path: string;
  /** Units available in this category. */
  count: number;
  subcategories: MenuLink[];
  brands: MenuLink[];
  priceBands: MenuLink[];
}

export interface NavigationMenu {
  categories: CategoryMenu[];
  facets: InventoryFacets;
}

export interface InventoryFacets {
  brands: string[];
  categories: ApplianceCategory[];
  /** Distinct `subcategory` values present in scope, e.g. ["French Door", "Side-by-Side"]. */
  subcategories: string[];
  /** Distinct `color` values present in scope. */
  colors: string[];
  /** Fuel types present in scope — drives the gas/electric controls on cooking and laundry. */
  fuelTypes: FuelType[];
  minPrice: number;
  maxPrice: number;
  /** True when at least one unit in scope has a verified comparison price. */
  hasDeals: boolean;
  /** True when at least one unit in scope is warranty-eligible. */
  hasWarranty: boolean;
}
