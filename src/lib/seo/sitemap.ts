import type { MetadataRoute } from "next";

import { categoryFreshness, getIndexableProducts } from "@/lib/inventory/repository";
import {
  campaignRouteEntries,
  categoryRouteEntries,
  guideRouteEntries,
  locationRouteEntries,
  staticRouteEntries,
  type RouteEntry,
} from "@/lib/seo/routes";
import { absoluteUrl } from "@/lib/site-config";

/**
 * Sitemap construction, kept out of the route file.
 *
 * Two reasons. The health-check cron needs to prove the sitemap builds without
 * going through Next's metadata pipeline, and the day this outgrows a single
 * file the split into a sitemap index is a change to `app/sitemap.ts` alone —
 * `buildSitemap()` already returns one flat, deduplicated, sorted list that can
 * be sliced into shards of 50,000 by `generateSitemaps`. `SITEMAP_URL_LIMIT`
 * marks where that becomes necessary, and `sitemapReport` surfaces it before a
 * crawler notices.
 */

/** Google's per-file limit. Cross it and the file needs sharding. */
export const SITEMAP_URL_LIMIT = 50_000;

/** Products are the only unbounded source, so they carry the guard rail. */
const PRODUCT_URL_CAP = 45_000;

export interface SitemapReport {
  total: number;
  counts: {
    static: number;
    categories: number;
    campaigns: number;
    locations: number;
    guides: number;
    products: number;
  };
  /** True once the flat file should become a sitemap index. */
  needsSharding: boolean;
  /** URLs that appeared more than once before deduplication. */
  duplicates: string[];
}

function toSitemapEntry(entry: RouteEntry): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(entry.path),
    lastModified: entry.lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  };
}

/**
 * The whole sitemap, plus what it is made of.
 *
 * Sold units stay listed: their pages remain useful (they carry the price the
 * unit sold for and cross-sell what is on the floor now) and dropping a URL that
 * still returns 200 throws away its accumulated equity for nothing.
 */
export async function buildSitemap(): Promise<{
  entries: MetadataRoute.Sitemap;
  report: SitemapReport;
}> {
  const products = await getIndexableProducts();

  const groups = {
    static: staticRouteEntries(),
    categories: categoryRouteEntries(categoryFreshness(products)),
    campaigns: campaignRouteEntries(),
    locations: locationRouteEntries(),
    guides: guideRouteEntries(),
    products: products.slice(0, PRODUCT_URL_CAP).map((product) => ({
      path: `/inventory/${product.slug}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly" as const,
      priority: product.status === "sold" ? 0.4 : 0.8,
    })),
  } satisfies Record<string, RouteEntry[]>;

  // A URL emitted twice is a self-inflicted duplicate-content signal, so the
  // list is deduplicated on the way out and the collision is reported rather
  // than silently swallowed.
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const entries: MetadataRoute.Sitemap = [];

  for (const entry of Object.values(groups).flat()) {
    const url = absoluteUrl(entry.path);
    if (seen.has(url)) {
      duplicates.push(url);
      continue;
    }
    seen.add(url);
    entries.push(toSitemapEntry(entry));
  }

  return {
    entries,
    report: {
      total: entries.length,
      counts: {
        static: groups.static.length,
        categories: groups.categories.length,
        campaigns: groups.campaigns.length,
        locations: groups.locations.length,
        guides: groups.guides.length,
        products: groups.products.length,
      },
      needsSharding: entries.length > SITEMAP_URL_LIMIT,
      duplicates,
    },
  };
}
