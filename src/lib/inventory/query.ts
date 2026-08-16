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

export const INVENTORY_SORTS = ["newest", "price-asc", "price-desc", "brand"] as const;
export type InventorySort = (typeof INVENTORY_SORTS)[number];

export const SORT_LABELS: Record<InventorySort, string> = {
  newest: "Newest arrivals",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  brand: "Brand A–Z",
};

export interface InventoryQuery {
  category?: ApplianceCategory;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  conditions?: ApplianceCondition[];
  fuelTypes?: FuelType[];
  /** Defaults to `["available", "reserved"]` — draft rows are never public. */
  statuses?: ApplianceStatus[];
  search?: string;
  sort?: InventorySort;
  featuredOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface InventoryResult {
  items: Appliance[];
  total: number;
  /** True when the results come from the local sample dataset rather than a database. */
  isDemo: boolean;
}

export interface InventoryFacets {
  brands: string[];
  categories: ApplianceCategory[];
  minPrice: number;
  maxPrice: number;
}
