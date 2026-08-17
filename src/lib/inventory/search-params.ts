import {
  APPLIANCE_CONDITIONS,
  FUEL_TYPES,
  isApplianceCategory,
  type ApplianceCategory,
  type ApplianceCondition,
  type FuelType,
} from "./types";
import { INVENTORY_SORTS, type InventoryQuery, type InventorySort } from "./query";

/**
 * URL <-> query translation for the inventory browser.
 *
 * Filters live in the URL so results are shareable, linkable from an ad, and
 * server-rendered on first paint. Anything unrecognised is dropped rather than
 * passed through to the database.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const FILTER_KEYS = [
  "q",
  "category",
  "brand",
  "type",
  "color",
  "min",
  "max",
  "condition",
  "fuel",
  "warranty",
  "deals",
  "status",
  "sort",
  "page",
] as const;

export const PAGE_SIZE = 24;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function list(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function positiveInt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

export interface ParsedFilters {
  q: string;
  category?: ApplianceCategory;
  brands: string[];
  /** Appliance-type values matched against `subcategory`. */
  types: string[];
  colors: string[];
  min?: number;
  max?: number;
  conditions: ApplianceCondition[];
  fuelTypes: FuelType[];
  /** Only units flagged warranty-eligible. */
  warrantyOnly: boolean;
  /** Only units with a verified comparison price. */
  dealsOnly: boolean;
  /** `sold` switches the page into the recently-sold archive view. */
  showSold: boolean;
  sort: InventorySort;
  page: number;
}

/** Free-text facet values (brand, subcategory, color) come from the data, so they
 *  are only length-capped here — matching against real values happens in the query. */
function textList(value: string | string[] | undefined, cap: number): string[] {
  return list(value)
    .map((entry) => entry.slice(0, 60))
    .slice(0, cap);
}

function flag(value: string | string[] | undefined): boolean {
  const raw = first(value);
  return raw === "1" || raw === "true";
}

export function parseFilters(params: RawSearchParams): ParsedFilters {
  const categoryRaw = first(params.category);
  const sortRaw = first(params.sort) as InventorySort;
  const min = positiveInt(first(params.min));
  const max = positiveInt(first(params.max));

  return {
    q: first(params.q).slice(0, 80),
    category: isApplianceCategory(categoryRaw) ? categoryRaw : undefined,
    brands: textList(params.brand, 12),
    types: textList(params.type, 12),
    colors: textList(params.color, 8),
    min,
    // Guard against an inverted range producing an always-empty result set.
    max: min != null && max != null && max < min ? undefined : max,
    conditions: list(params.condition).filter((value): value is ApplianceCondition =>
      (APPLIANCE_CONDITIONS as readonly string[]).includes(value),
    ),
    fuelTypes: list(params.fuel).filter((value): value is FuelType =>
      (FUEL_TYPES as readonly string[]).includes(value),
    ),
    warrantyOnly: flag(params.warranty),
    dealsOnly: flag(params.deals),
    showSold: first(params.status) === "sold",
    sort: INVENTORY_SORTS.includes(sortRaw) ? sortRaw : "featured",
    page: Math.max(1, positiveInt(first(params.page)) ?? 1),
  };
}

/** Builds the repository query from parsed filters. */
export function toInventoryQuery(
  filters: ParsedFilters,
  overrides: Partial<InventoryQuery> = {},
): InventoryQuery {
  return {
    search: filters.q || undefined,
    category: filters.category,
    brands: filters.brands.length ? filters.brands : undefined,
    subcategories: filters.types.length ? filters.types : undefined,
    colors: filters.colors.length ? filters.colors : undefined,
    minPrice: filters.min,
    maxPrice: filters.max,
    conditions: filters.conditions.length ? filters.conditions : undefined,
    fuelTypes: filters.fuelTypes.length ? filters.fuelTypes : undefined,
    warrantyOnly: filters.warrantyOnly || undefined,
    dealsOnly: filters.dealsOnly || undefined,
    statuses: filters.showSold ? ["sold"] : ["available", "reserved"],
    sort: filters.sort,
    limit: PAGE_SIZE,
    offset: (filters.page - 1) * PAGE_SIZE,
    ...overrides,
  };
}

/** Count of user-applied filters, for the mobile "Filters (3)" affordance. */
export function activeFilterCount(filters: ParsedFilters): number {
  return (
    (filters.q ? 1 : 0) +
    (filters.category ? 1 : 0) +
    filters.brands.length +
    filters.types.length +
    filters.colors.length +
    (filters.min != null ? 1 : 0) +
    (filters.max != null ? 1 : 0) +
    filters.conditions.length +
    filters.fuelTypes.length +
    (filters.warrantyOnly ? 1 : 0) +
    (filters.dealsOnly ? 1 : 0) +
    (filters.showSold ? 1 : 0)
  );
}

/** Serialises filters back into a querystring, omitting defaults. */
export function buildQueryString(filters: Partial<ParsedFilters>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.brands?.length) params.set("brand", filters.brands.join(","));
  if (filters.types?.length) params.set("type", filters.types.join(","));
  if (filters.colors?.length) params.set("color", filters.colors.join(","));
  if (filters.min != null) params.set("min", String(filters.min));
  if (filters.max != null) params.set("max", String(filters.max));
  if (filters.conditions?.length) params.set("condition", filters.conditions.join(","));
  if (filters.fuelTypes?.length) params.set("fuel", filters.fuelTypes.join(","));
  if (filters.warrantyOnly) params.set("warranty", "1");
  if (filters.dealsOnly) params.set("deals", "1");
  if (filters.showSold) params.set("status", "sold");
  if (filters.sort && filters.sort !== "featured") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}
