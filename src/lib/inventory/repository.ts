import "server-only";

import { getSupabaseReadClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { DEMO_APPLIANCES } from "./demo-data";
import type {
  CategoryMenu,
  HomeMerchandising,
  InventoryFacets,
  MenuLink,
  InventoryQuery,
  InventoryResult,
  InventorySort,
  NavigationMenu,
} from "./query";
import { PRICE_BANDS } from "./query";
export * from "./query";

import {
  CATEGORIES,
  CATEGORY_ORDER,
  FUEL_TYPES,
  savingsFor,
  type Appliance,
  type ApplianceCategory,
  type ApplianceCondition,
  type ApplianceStatus,
  type FuelType,
  isApplianceCategory,
} from "./types";

/**
 * Ceiling on rows pulled for the "biggest savings" sort.
 *
 * Savings is `compare_at_price - price`, a computed value PostgREST cannot sort
 * on, so that one sort ranks in memory instead. The query is still narrowed
 * database-side to units that actually carry a comparison price, which is a
 * small slice of the catalogue — this cap exists so a pathological catalogue
 * can't pull unbounded rows, not because we expect to reach it.
 */
const SAVINGS_SORT_CAP = 480;

/** Returned whenever there is nothing to derive facets from, so filter UI hides itself. */
const EMPTY_FACETS: InventoryFacets = {
  brands: [],
  categories: [],
  subcategories: [],
  colors: [],
  fuelTypes: [],
  minPrice: 0,
  maxPrice: 0,
  hasDeals: false,
  hasWarranty: false,
};

/**
 * Sample data is only served when there is no database to read from, and even
 * then only in development or behind an explicit opt-in. A production deployment
 * without Supabase renders honest empty states instead of fictional products.
 */
export function isDemoInventory(): boolean {
  if (isSupabaseConfigured) return false;
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_INVENTORY === "true") return true;
  return process.env.NODE_ENV !== "production";
}

/* -------------------------------------------------------------------------- */
/* Row mapping                                                                 */
/* -------------------------------------------------------------------------- */

type Row = Record<string, unknown>;

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function nullableNum(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableStr(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function mapRow(row: Row): Appliance {
  const rawImages = Array.isArray(row.appliance_images) ? (row.appliance_images as Row[]) : [];
  const images = rawImages
    .map((image) => ({
      id: str(image.id),
      applianceId: str(image.appliance_id),
      imageUrl: str(image.image_url),
      altText: nullableStr(image.alt_text),
      sortOrder: num(image.sort_order),
      isPrimary: Boolean(image.is_primary),
    }))
    .filter((image) => image.imageUrl.length > 0)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);

  const category = str(row.category);

  return {
    id: str(row.id),
    slug: str(row.slug),
    sku: nullableStr(row.sku),
    title: str(row.title),
    brand: str(row.brand),
    modelNumber: nullableStr(row.model_number),
    category: isApplianceCategory(category) ? category : "other",
    subcategory: nullableStr(row.subcategory),
    description: nullableStr(row.description),
    condition: (nullableStr(row.condition) ?? "scratch-and-dent") as ApplianceCondition,
    cosmeticNotes: nullableStr(row.cosmetic_notes),
    functionalNotes: nullableStr(row.functional_notes),
    price: num(row.price),
    compareAtPrice: nullableNum(row.compare_at_price),
    quantity: num(row.quantity),
    status: (nullableStr(row.status) ?? "available") as ApplianceStatus,
    color: nullableStr(row.color),
    finish: nullableStr(row.finish),
    dimensions: nullableStr(row.dimensions),
    capacity: nullableStr(row.capacity),
    fuelType: nullableStr(row.fuel_type) as FuelType | null,
    warrantyAvailable: Boolean(row.warranty_available),
    deliveryAvailable: Boolean(row.delivery_available),
    installationAvailable: Boolean(row.installation_available),
    haulAwayAvailable: Boolean(row.haul_away_available),
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    soldAt: nullableStr(row.sold_at),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    images,
  };
}

const SELECT = "*, appliance_images(*)";

/** Postgrest `or()` filters are comma/parenthesis delimited, so those characters must go. */
function sanitizeSearch(term: string): string {
  return term.replace(/[(),*%\\]/g, " ").trim();
}

/**
 * Case-insensitive equality across a set of free-text values.
 *
 * `subcategory` and `color` are typed by hand in the admin, so "French Door" and
 * "French door" both occur in practice — and campaign URLs are written by hand
 * too. Matching case-insensitively means a link keeps working either way, where
 * `in()` would silently return nothing. Values are double-quoted because they
 * contain spaces, and sanitised because `or()` is comma/paren delimited.
 */
function ilikeAnyFilter(column: string, values: string[]): string | null {
  const clauses = values
    .map((value) => sanitizeSearch(value))
    .filter((value) => value.length > 0)
    .map((value) => `${column}.ilike."${value}"`);
  return clauses.length > 0 ? clauses.join(",") : null;
}

/* -------------------------------------------------------------------------- */
/* In-memory filtering (sample data path)                                      */
/* -------------------------------------------------------------------------- */

/** Case-insensitive membership test for the free-text facets. */
function matchesAny(value: string | null, allowed: string[]): boolean {
  if (value == null) return false;
  const needle = value.toLowerCase();
  return allowed.some((entry) => entry.toLowerCase() === needle);
}

/** Shared ranking so the sample-data path and the savings sort order identically. */
function compareBySort(a: Appliance, b: Appliance, sort: InventorySort): number {
  switch (sort) {
    case "price-asc":
      return a.price - b.price;
    case "price-desc":
      return b.price - a.price;
    case "savings":
      return (savingsFor(b) ?? 0) - (savingsFor(a) ?? 0);
    case "brand":
      return a.brand.localeCompare(b.brand) || a.title.localeCompare(b.title);
    case "featured":
      return (
        Number(b.featured) - Number(a.featured) ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
    default:
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  }
}

function applyFiltersInMemory(source: Appliance[], query: InventoryQuery): Appliance[] {
  const statuses = query.statuses ?? (["available", "reserved"] as ApplianceStatus[]);
  const search = query.search?.trim().toLowerCase();

  let items = source.filter((item) => item.published && statuses.includes(item.status));

  if (query.category) items = items.filter((item) => item.category === query.category);
  if (query.brands?.length) {
    items = items.filter((item) => matchesAny(item.brand, query.brands!));
  }
  if (query.subcategories?.length) {
    items = items.filter((item) => matchesAny(item.subcategory, query.subcategories!));
  }
  if (query.colors?.length) {
    items = items.filter((item) => matchesAny(item.color, query.colors!));
  }
  if (query.conditions?.length) {
    items = items.filter((item) => query.conditions!.includes(item.condition));
  }
  if (query.fuelTypes?.length) {
    items = items.filter((item) => item.fuelType != null && query.fuelTypes!.includes(item.fuelType));
  }
  if (query.minPrice != null) items = items.filter((item) => item.price >= query.minPrice!);
  if (query.maxPrice != null) items = items.filter((item) => item.price <= query.maxPrice!);
  if (query.featuredOnly) items = items.filter((item) => item.featured);
  if (query.warrantyOnly) items = items.filter((item) => item.warrantyAvailable);
  if (query.dealsOnly || query.sort === "savings") {
    items = items.filter((item) => savingsFor(item) != null);
  }
  if (search) {
    items = items.filter((item) =>
      [item.title, item.brand, item.modelNumber, item.subcategory, item.sku, item.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }

  const sort = query.sort ?? "featured";
  return [...items].sort((a, b) => compareBySort(a, b, sort));
}

/* -------------------------------------------------------------------------- */
/* Public queries                                                              */
/* -------------------------------------------------------------------------- */

export async function queryInventory(query: InventoryQuery = {}): Promise<InventoryResult> {
  const client = getSupabaseReadClient();

  if (!client) {
    if (!isDemoInventory()) return { items: [], total: 0, isDemo: false };
    const filtered = applyFiltersInMemory(DEMO_APPLIANCES, query);
    const offset = query.offset ?? 0;
    const limit = query.limit ?? filtered.length;
    return { items: filtered.slice(offset, offset + limit), total: filtered.length, isDemo: true };
  }

  const statuses = query.statuses ?? (["available", "reserved"] as ApplianceStatus[]);
  const sort: InventorySort = query.sort ?? "featured";
  // Savings is a computed column PostgREST cannot order on, so that sort ranks in
  // memory over the (database-narrowed) set of units that carry a comparison price.
  const rankInMemory = sort === "savings";

  let builder = client
    .from("appliances")
    .select(SELECT, { count: "exact" })
    .eq("published", true)
    .in("status", statuses);

  if (query.category) builder = builder.eq("category", query.category);
  // Matched case-insensitively to stay consistent with the sample-data path and
  // to survive a hand-written `?brand=samsung`.
  if (query.brands?.length) {
    const filter = ilikeAnyFilter("brand", query.brands);
    if (filter) builder = builder.or(filter);
  }
  if (query.subcategories?.length) {
    const filter = ilikeAnyFilter("subcategory", query.subcategories);
    if (filter) builder = builder.or(filter);
  }
  if (query.colors?.length) {
    const filter = ilikeAnyFilter("color", query.colors);
    if (filter) builder = builder.or(filter);
  }
  if (query.conditions?.length) builder = builder.in("condition", query.conditions);
  if (query.fuelTypes?.length) builder = builder.in("fuel_type", query.fuelTypes);
  if (query.minPrice != null) builder = builder.gte("price", query.minPrice);
  if (query.maxPrice != null) builder = builder.lte("price", query.maxPrice);
  if (query.featuredOnly) builder = builder.eq("featured", true);
  if (query.warrantyOnly) builder = builder.eq("warranty_available", true);
  // A verified comparison price is what makes a markdown real, so both the deals
  // filter and the savings sort require one to be on record.
  if (query.dealsOnly || rankInMemory) {
    builder = builder.not("compare_at_price", "is", null);
  }

  const search = query.search ? sanitizeSearch(query.search) : "";
  if (search) {
    const pattern = `%${search}%`;
    builder = builder.or(
      [
        `title.ilike.${pattern}`,
        `brand.ilike.${pattern}`,
        `model_number.ilike.${pattern}`,
        `subcategory.ilike.${pattern}`,
        `sku.ilike.${pattern}`,
      ].join(","),
    );
  }

  switch (sort) {
    case "price-asc":
      builder = builder.order("price", { ascending: true });
      break;
    case "price-desc":
      builder = builder.order("price", { ascending: false });
      break;
    case "brand":
      builder = builder.order("brand", { ascending: true }).order("title", { ascending: true });
      break;
    case "featured":
      builder = builder
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    case "savings":
      // Deepest discounts tend to sit on the highest-ticket units, so this keeps
      // the capped window close to the true top of the ranking.
      builder = builder.order("compare_at_price", { ascending: false });
      break;
    default:
      builder = builder.order("created_at", { ascending: false });
  }

  if (rankInMemory) {
    builder = builder.range(0, SAVINGS_SORT_CAP - 1);
  } else if (query.limit != null) {
    const offset = query.offset ?? 0;
    builder = builder.range(offset, offset + query.limit - 1);
  }

  const { data, error, count } = await builder;

  if (error) {
    console.error("[inventory] query failed:", error.message);
    return { items: [], total: 0, isDemo: false };
  }

  const items = (data ?? []).map((row) => mapRow(row as Row));

  if (rankInMemory) {
    const ranked = [...items].sort((a, b) => compareBySort(a, b, sort));
    const offset = query.offset ?? 0;
    const limit = query.limit ?? ranked.length;
    return {
      items: ranked.slice(offset, offset + limit),
      // Paging is bounded by what was actually ranked, so the count reflects what
      // a shopper can reach rather than a total they cannot page to.
      total: Math.min(count ?? ranked.length, ranked.length),
      isDemo: false,
    };
  }

  return { items, total: count ?? items.length, isDemo: false };
}

export async function getApplianceBySlug(slug: string): Promise<Appliance | null> {
  const client = getSupabaseReadClient();

  if (!client) {
    if (!isDemoInventory()) return null;
    return DEMO_APPLIANCES.find((item) => item.slug === slug && item.published) ?? null;
  }

  const { data, error } = await client
    .from("appliances")
    .select(SELECT)
    .eq("slug", slug)
    .eq("published", true)
    .neq("status", "draft")
    .maybeSingle();

  if (error) {
    console.error("[inventory] slug lookup failed:", error.message);
    return null;
  }
  return data ? mapRow(data as Row) : null;
}

/**
 * Looks up listings by slug, preserving the order asked for.
 *
 * Used by the saved list, which stores slugs only: re-reading the catalogue on
 * every render means a saved unit always shows its current price and current
 * status, and a slug that no longer exists simply drops out instead of
 * rendering from a stale snapshot.
 */
export async function getAppliancesBySlugs(slugs: string[]): Promise<Appliance[]> {
  if (slugs.length === 0) return [];
  const client = getSupabaseReadClient();

  const order = (items: Appliance[]): Appliance[] =>
    slugs
      .map((slug) => items.find((item) => item.slug === slug))
      .filter((item): item is Appliance => Boolean(item));

  if (!client) {
    if (!isDemoInventory()) return [];
    return order(DEMO_APPLIANCES.filter((item) => item.published));
  }

  const { data, error } = await client
    .from("appliances")
    .select(SELECT)
    .in("slug", slugs)
    .eq("published", true)
    .neq("status", "draft");

  if (error) {
    console.error("[inventory] slug batch lookup failed:", error.message);
    return [];
  }
  return order((data ?? []).map((row) => mapRow(row as Row)));
}

/** Slugs for the sitemap and for static params. */
export async function getPublishedSlugs(): Promise<Array<{ slug: string; updatedAt: string }>> {
  const client = getSupabaseReadClient();

  if (!client) {
    if (!isDemoInventory()) return [];
    return DEMO_APPLIANCES.filter((item) => item.published).map((item) => ({
      slug: item.slug,
      updatedAt: item.updatedAt,
    }));
  }

  const { data, error } = await client
    .from("appliances")
    .select("slug, updated_at")
    .eq("published", true)
    .neq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("[inventory] slug list failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({ slug: str(row.slug), updatedAt: str(row.updated_at) }));
}

/** Available filter values, scoped to a category when one is given. */
export async function getInventoryFacets(category?: ApplianceCategory): Promise<InventoryFacets> {
  const client = getSupabaseReadClient();

  const sortedUnique = (values: Array<string | null>): string[] =>
    [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) =>
      a.localeCompare(b),
    );

  const derive = (items: Appliance[]): InventoryFacets => {
    const prices = items.map((item) => item.price).filter((price) => price > 0);
    return {
      brands: sortedUnique(items.map((item) => item.brand)),
      categories: [...new Set(items.map((item) => item.category))],
      subcategories: sortedUnique(items.map((item) => item.subcategory)),
      colors: sortedUnique(items.map((item) => item.color)),
      fuelTypes: FUEL_TYPES.filter((fuel) => items.some((item) => item.fuelType === fuel)),
      minPrice: prices.length ? Math.floor(Math.min(...prices)) : 0,
      maxPrice: prices.length ? Math.ceil(Math.max(...prices)) : 0,
      hasDeals: items.some((item) => savingsFor(item) != null),
      hasWarranty: items.some((item) => item.warrantyAvailable),
    };
  };

  if (!client) {
    if (!isDemoInventory()) return EMPTY_FACETS;
    const items = DEMO_APPLIANCES.filter(
      (item) =>
        item.published &&
        item.status !== "draft" &&
        item.status !== "sold" &&
        (!category || item.category === category),
    );
    return derive(items);
  }

  let builder = client
    .from("appliances")
    .select(
      "brand, category, subcategory, color, fuel_type, price, compare_at_price, warranty_available",
    )
    .eq("published", true)
    .in("status", ["available", "reserved"]);
  if (category) builder = builder.eq("category", category);

  const { data, error } = await builder.limit(5000);
  if (error) {
    console.error("[inventory] facet query failed:", error.message);
    return EMPTY_FACETS;
  }

  const rows = (data ?? []) as Row[];
  const prices = rows.map((row) => num(row.price)).filter((price) => price > 0);
  return {
    brands: sortedUnique(rows.map((row) => str(row.brand))),
    categories: [
      ...new Set(rows.map((row) => str(row.category)).filter(isApplianceCategory)),
    ] as ApplianceCategory[],
    subcategories: sortedUnique(rows.map((row) => nullableStr(row.subcategory))),
    colors: sortedUnique(rows.map((row) => nullableStr(row.color))),
    fuelTypes: FUEL_TYPES.filter((fuel) =>
      rows.some((row) => nullableStr(row.fuel_type) === fuel),
    ),
    minPrice: prices.length ? Math.floor(Math.min(...prices)) : 0,
    maxPrice: prices.length ? Math.ceil(Math.max(...prices)) : 0,
    hasDeals: rows.some((row) => {
      const compare = nullableNum(row.compare_at_price);
      return compare != null && compare > num(row.price);
    }),
    hasWarranty: rows.some((row) => Boolean(row.warranty_available)),
  };
}

/* -------------------------------------------------------------------------- */
/* Navigation menu                                                             */
/* -------------------------------------------------------------------------- */

/** The columns the mega-menu needs. Same shape from both the database and demo data. */
interface NavRow {
  brand: string;
  category: ApplianceCategory;
  subcategory: string | null;
  price: number;
}

/** Longest column in a mega-menu panel before it stops being scannable. */
const MENU_COLUMN_LIMIT = 8;

/**
 * Groups free-text values case-insensitively.
 *
 * `subcategory` and `brand` are typed by hand in the admin, so "French Door" and
 * "French door" both occur. The query layer already matches them with `ilike`,
 * so the menu has to group them too — otherwise the panel offers two links that
 * lead to the same results and split the count between them. The most frequent
 * spelling wins as the display label.
 */
function groupByValue(rows: NavRow[], pick: (row: NavRow) => string | null) {
  const groups = new Map<string, { label: string; count: number; spellings: Map<string, number> }>();

  for (const row of rows) {
    const value = pick(row)?.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    const group = groups.get(key) ?? { label: value, count: 0, spellings: new Map() };
    group.count += 1;
    group.spellings.set(value, (group.spellings.get(value) ?? 0) + 1);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      label: [...group.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
      count: group.count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function menuHref(path: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Builds every mega-menu panel from live inventory.
 *
 * The guarantee here is the same one `quickLinksFor` makes about the popular-
 * search rail, applied to the whole navigation: a link only exists because rows
 * matching it were counted, so a shopper cannot open a category panel and land
 * on an empty grid. Categories with nothing in them come back with empty columns
 * and the header renders them as a plain link instead of a panel.
 */
/** Price bands over a set of rows, dropping any band with nothing priced inside it. */
function derivePriceBands(rows: NavRow[], path: string): MenuLink[] {
  return PRICE_BANDS.map((band) => {
    const count = rows.filter(
      (row) =>
        row.price > 0 &&
        (band.min == null || row.price >= band.min) &&
        (band.max == null || row.price <= band.max),
    ).length;
    return { label: band.label, count, href: menuHref(path, { min: band.min, max: band.max }) };
  }).filter((band) => band.count > 0);
}

function deriveNavigationMenu(rows: NavRow[]): CategoryMenu[] {
  return CATEGORY_ORDER.map((slug) => {
    const definition = CATEGORIES[slug];
    const inCategory = rows.filter((row) => row.category === slug);
    const path = definition.path;

    return {
      slug,
      name: definition.name,
      path,
      count: inCategory.length,
      subcategories: groupByValue(inCategory, (row) => row.subcategory)
        .slice(0, MENU_COLUMN_LIMIT)
        .map(({ label, count }) => ({ label, count, href: menuHref(path, { type: label }) })),
      brands: groupByValue(inCategory, (row) => row.brand)
        .slice(0, MENU_COLUMN_LIMIT)
        .map(({ label, count }) => ({ label, count, href: menuHref(path, { brand: label }) })),
      priceBands: derivePriceBands(inCategory, path),
    };
  });
}

function buildNavigation(rows: NavRow[], facets: InventoryFacets): NavigationMenu {
  return {
    categories: deriveNavigationMenu(rows),
    priceBands: derivePriceBands(rows, "/inventory"),
    brands: groupByValue(rows, (row) => row.brand).map(({ label, count }) => ({
      label,
      count,
      href: menuHref("/inventory", { brand: label }),
    })),
    facets,
  };
}

function emptyNavigation(facets: InventoryFacets): NavigationMenu {
  return buildNavigation([], facets);
}

/**
 * Everything the site header needs, in one pass over the catalogue.
 *
 * Deliberately a single query rather than one per category: the mega-menu needs
 * facet values for all seven categories at once, and this runs on every route
 * because the header lives in the layout. The result is wrapped in a cache by
 * the caller so a page render does not pay for it each time.
 */
export async function getNavigationMenu(): Promise<NavigationMenu> {
  const client = getSupabaseReadClient();
  const facets = await getInventoryFacets();

  if (!client) {
    if (!isDemoInventory()) return emptyNavigation(facets);
    const rows: NavRow[] = DEMO_APPLIANCES.filter(
      (item) => item.published && item.status === "available",
    ).map((item) => ({
      brand: item.brand,
      category: item.category,
      subcategory: item.subcategory,
      price: item.price,
    }));
    return buildNavigation(rows, facets);
  }

  const { data, error } = await client
    .from("appliances")
    .select("brand, category, subcategory, price")
    .eq("published", true)
    .eq("status", "available")
    .limit(5000);

  if (error) {
    console.error("[inventory] navigation menu failed:", error.message);
    return emptyNavigation(facets);
  }

  const rows: NavRow[] = (data ?? []).map((row) => {
    const category = str((row as Row).category);
    return {
      brand: str((row as Row).brand),
      category: isApplianceCategory(category) ? category : "other",
      subcategory: nullableStr((row as Row).subcategory),
      price: num((row as Row).price),
    };
  });

  return buildNavigation(rows, facets);
}

/** Recently sold units — real turnover, used as honest social proof. */
export async function getRecentlySold(limit = 6): Promise<Appliance[]> {
  const client = getSupabaseReadClient();

  if (!client) {
    if (!isDemoInventory()) return [];
    return DEMO_APPLIANCES.filter((item) => item.status === "sold" && item.published)
      .sort((a, b) => Date.parse(b.soldAt ?? b.updatedAt) - Date.parse(a.soldAt ?? a.updatedAt))
      .slice(0, limit);
  }

  const { data, error } = await client
    .from("appliances")
    .select(SELECT)
    .eq("published", true)
    .eq("status", "sold")
    .order("sold_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("[inventory] recently sold failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapRow(row as Row));
}

/* -------------------------------------------------------------------------- */
/* Homepage merchandising                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Below this many available units, the homepage stops using rails.
 *
 * Big-box homepages run five or six product rails because they are drawing from
 * a catalogue of tens of thousands. A scratch & dent warehouse floor is a couple
 * of dozen one-of-a-kind units, and slicing that across "deals", "just arrived"
 * and "under $500" puts the same refrigerator in three rails — which reads as an
 * empty store dressed up, not a full one. At this size a single dense grid of
 * everything on the floor is both more honest and more useful.
 */
const COMPACT_CATALOGUE_MAX = 40;

/** Items pulled per rail. */
const HOME_RAIL_SIZE = 12;

/** A rail with fewer than this looks broken, so it does not render at all. */
const MIN_RAIL_ITEMS = 4;

/**
 * Allocates inventory across the homepage so no unit appears in two modules.
 *
 * Rails are filled in priority order against a shared `seen` set: deals first
 * (they carry a verified comparison price, so they are the strongest thing on
 * the page), then new arrivals from whatever is left. A rail that cannot reach
 * `MIN_RAIL_ITEMS` yields its units back rather than rendering half-empty —
 * the same self-hiding guard the deals section already used, generalised.
 */
export async function merchandiseHome(): Promise<HomeMerchandising> {
  const [counts, facets, recentlySold] = await Promise.all([
    getCategoryCounts(),
    getInventoryFacets(),
    getRecentlySold(8),
  ]);

  const totalAvailable = Object.values(counts).reduce((sum, count) => sum + count, 0);

  // Small floor: one grid of everything, no rails to duplicate across.
  if (totalAvailable <= COMPACT_CATALOGUE_MAX) {
    const all = await queryInventory({
      statuses: ["available"],
      limit: COMPACT_CATALOGUE_MAX,
      sort: "featured",
    });
    return {
      totalAvailable,
      compact: true,
      everything: all.items,
      deals: [],
      newArrivals: [],
      recentlySold,
      counts,
      facets,
    };
  }

  const [dealsResult, freshResult] = await Promise.all([
    queryInventory({
      dealsOnly: true,
      statuses: ["available"],
      limit: HOME_RAIL_SIZE,
      sort: "savings",
    }),
    // Over-fetched so the rail can still fill after deals are removed from it.
    queryInventory({
      statuses: ["available"],
      limit: HOME_RAIL_SIZE * 2,
      sort: "newest",
    }),
  ]);

  const deals = dealsResult.items.length >= MIN_RAIL_ITEMS ? dealsResult.items : [];
  const seen = new Set(deals.map((item) => item.id));
  const newArrivals = freshResult.items
    .filter((item) => !seen.has(item.id))
    .slice(0, HOME_RAIL_SIZE);

  return {
    totalAvailable,
    compact: false,
    everything: [],
    deals,
    newArrivals: newArrivals.length >= MIN_RAIL_ITEMS ? newArrivals : [],
    recentlySold,
    counts,
    facets,
  };
}

/**
 * Related units for a product page — same category first, then anything else
 * available. Used both for cross-sell and to keep sold listings useful.
 */
export async function getRelatedAppliances(appliance: Appliance, limit = 4): Promise<Appliance[]> {
  const sameCategory = await queryInventory({
    category: appliance.category,
    statuses: ["available"],
    limit: limit + 1,
    sort: "newest",
  });

  const results = sameCategory.items.filter((item) => item.id !== appliance.id).slice(0, limit);
  if (results.length >= limit) return results;

  const fallback = await queryInventory({ statuses: ["available"], limit: limit * 3, sort: "newest" });
  const seen = new Set([appliance.id, ...results.map((item) => item.id)]);
  for (const item of fallback.items) {
    if (results.length >= limit) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    results.push(item);
  }
  return results;
}

/** Per-category counts for navigation and category tiles. */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  const client = getSupabaseReadClient();

  if (!client) {
    if (!isDemoInventory()) return {};
    return DEMO_APPLIANCES.reduce<Record<string, number>>((acc, item) => {
      if (item.published && item.status === "available") {
        acc[item.category] = (acc[item.category] ?? 0) + 1;
      }
      return acc;
    }, {});
  }

  const { data, error } = await client
    .from("appliances")
    .select("category")
    .eq("published", true)
    .eq("status", "available")
    .limit(5000);

  if (error) {
    console.error("[inventory] category counts failed:", error.message);
    return {};
  }
  return (data ?? []).reduce<Record<string, number>>((acc, row) => {
    const key = str((row as Row).category);
    if (key) acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}
