import "server-only";

import { getSupabaseReadClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { DEMO_APPLIANCES } from "./demo-data";
import type { InventoryFacets, InventoryQuery, InventoryResult } from "./query";
export * from "./query";

import {
  type Appliance,
  type ApplianceCategory,
  type ApplianceCondition,
  type ApplianceStatus,
  type FuelType,
  isApplianceCategory,
} from "./types";

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

/* -------------------------------------------------------------------------- */
/* In-memory filtering (sample data path)                                      */
/* -------------------------------------------------------------------------- */

function applyFiltersInMemory(source: Appliance[], query: InventoryQuery): Appliance[] {
  const statuses = query.statuses ?? (["available", "reserved"] as ApplianceStatus[]);
  const search = query.search?.trim().toLowerCase();

  let items = source.filter((item) => item.published && statuses.includes(item.status));

  if (query.category) items = items.filter((item) => item.category === query.category);
  if (query.brands?.length) {
    const set = new Set(query.brands.map((brand) => brand.toLowerCase()));
    items = items.filter((item) => set.has(item.brand.toLowerCase()));
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
  if (search) {
    items = items.filter((item) =>
      [item.title, item.brand, item.modelNumber, item.subcategory, item.sku, item.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }

  const sort = query.sort ?? "newest";
  items = [...items].sort((a, b) => {
    switch (sort) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "brand":
        return a.brand.localeCompare(b.brand) || a.title.localeCompare(b.title);
      default:
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
  });

  return items;
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
  let builder = client
    .from("appliances")
    .select(SELECT, { count: "exact" })
    .eq("published", true)
    .in("status", statuses);

  if (query.category) builder = builder.eq("category", query.category);
  if (query.brands?.length) builder = builder.in("brand", query.brands);
  if (query.conditions?.length) builder = builder.in("condition", query.conditions);
  if (query.fuelTypes?.length) builder = builder.in("fuel_type", query.fuelTypes);
  if (query.minPrice != null) builder = builder.gte("price", query.minPrice);
  if (query.maxPrice != null) builder = builder.lte("price", query.maxPrice);
  if (query.featuredOnly) builder = builder.eq("featured", true);

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

  switch (query.sort ?? "newest") {
    case "price-asc":
      builder = builder.order("price", { ascending: true });
      break;
    case "price-desc":
      builder = builder.order("price", { ascending: false });
      break;
    case "brand":
      builder = builder.order("brand", { ascending: true }).order("title", { ascending: true });
      break;
    default:
      builder = builder.order("created_at", { ascending: false });
  }

  if (query.limit != null) {
    const offset = query.offset ?? 0;
    builder = builder.range(offset, offset + query.limit - 1);
  }

  const { data, error, count } = await builder;

  if (error) {
    console.error("[inventory] query failed:", error.message);
    return { items: [], total: 0, isDemo: false };
  }

  const items = (data ?? []).map((row) => mapRow(row as Row));
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

  const derive = (items: Appliance[]): InventoryFacets => {
    const prices = items.map((item) => item.price).filter((price) => price > 0);
    return {
      brands: [...new Set(items.map((item) => item.brand).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
      categories: [...new Set(items.map((item) => item.category))],
      minPrice: prices.length ? Math.floor(Math.min(...prices)) : 0,
      maxPrice: prices.length ? Math.ceil(Math.max(...prices)) : 0,
    };
  };

  if (!client) {
    if (!isDemoInventory()) return { brands: [], categories: [], minPrice: 0, maxPrice: 0 };
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
    .select("brand, category, price")
    .eq("published", true)
    .in("status", ["available", "reserved"]);
  if (category) builder = builder.eq("category", category);

  const { data, error } = await builder.limit(5000);
  if (error) {
    console.error("[inventory] facet query failed:", error.message);
    return { brands: [], categories: [], minPrice: 0, maxPrice: 0 };
  }

  const rows = (data ?? []) as Row[];
  const prices = rows.map((row) => num(row.price)).filter((price) => price > 0);
  return {
    brands: [...new Set(rows.map((row) => str(row.brand)).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    ),
    categories: [
      ...new Set(rows.map((row) => str(row.category)).filter(isApplianceCategory)),
    ] as ApplianceCategory[],
    minPrice: prices.length ? Math.floor(Math.min(...prices)) : 0,
    maxPrice: prices.length ? Math.ceil(Math.max(...prices)) : 0,
  };
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
