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
  { label: "Under $500", min: undefined, max: 499 },
  { label: "$500 – $999", min: 500, max: 999 },
  { label: "$1,000 – $1,499", min: 1000, max: 1499 },
  { label: "$1,500 & up", min: 1500, max: undefined },
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
  /** Site-wide price bands that contain stock, pointing at `/inventory`. */
  priceBands: MenuLink[];
  /** Site-wide brands that have stock, pointing at `/inventory`. */
  brands: MenuLink[];
  facets: InventoryFacets;
}

/**
 * Everything the homepage merchandises, allocated so no unit appears twice.
 *
 * See `merchandiseHome`. The shape deliberately makes the small-catalogue case
 * explicit rather than leaving the page to guess: a warehouse with 20 units on
 * the floor cannot fill five rails without showing the same refrigerator in
 * three of them, so it gets one dense grid instead.
 */
export interface HomeMerchandising {
  totalAvailable: number;
  /** True when the catalogue is small enough that rails would repeat units. */
  compact: boolean;
  /** The whole floor, populated only in compact mode. */
  everything: Appliance[];
  deals: Appliance[];
  newArrivals: Appliance[];
  recentlySold: Appliance[];
  counts: Record<string, number>;
  facets: InventoryFacets;
}

/**
 * Per-value result counts for the filter sidebar.
 *
 * Each group is counted with every *other* active filter applied but its own
 * excluded — the standard faceting rule, and the only one that does not lie: a
 * brand row reading "3" means ticking it yields three results given what is
 * already selected, and multi-select within a group stays additive.
 */
export interface FacetCounts {
  brands: Record<string, number>;
  subcategories: Record<string, number>;
  colors: Record<string, number>;
  conditions: Record<string, number>;
  fuelTypes: Record<string, number>;
  warranty: number;
  deals: number;
}

export interface InventoryFacets {
  /** Keyed lower-case, since the free-text values are matched case-insensitively. */
  counts: FacetCounts;
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
