import { CAMPAIGNS } from "@/lib/content/campaigns";
import { GUIDES } from "@/lib/content/guides";
import { CATEGORY_LIST } from "@/lib/inventory/types";
import { indexableLocations } from "@/lib/seo/location-quality";

/**
 * The site's indexable routes, in one place.
 *
 * The sitemap, the SEO health check and `/llms.txt` all need the same answer to
 * "what pages does this site publish?", and three separate lists would drift
 * apart the first time somebody added a page. This is that answer.
 *
 * THE `reviewedAt` DATES ARE NOT DECORATION.
 *
 * They become `<lastmod>` in the sitemap. A sitemap that stamps `new Date()` on
 * every URL on every request tells Google that all fifty pages changed a moment
 * ago, every time it looks — which is false, and which trains it to ignore the
 * field entirely. Static pages therefore carry the date their copy was last
 * genuinely revised, entered by hand when the copy changes. Everything with a
 * real timestamp behind it (products, guides, locations) uses that instead and
 * never appears in this table.
 */

export type StaticRouteKind = "core" | "service" | "legal";

export interface StaticRoute {
  path: string;
  /** ISO date the page's copy was last materially changed. */
  reviewedAt: string;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
  kind: StaticRouteKind;
  /** One line for `/llms.txt`. Omitted routes are left out of that file. */
  summary?: string;
}

/**
 * Hand-maintained. When you materially change a page's copy, move its date.
 * Leaving it stale is better than faking it forward: a wrong-but-old lastmod
 * costs a slower recrawl, a wrong-but-fresh one costs credibility on every URL.
 */
export const STATIC_ROUTES: StaticRoute[] = [
  {
    path: "/",
    reviewedAt: "2026-08-18",
    changeFrequency: "daily",
    priority: 1,
    kind: "core",
    summary: "Current warehouse stock, categories, deals and store details.",
  },
  {
    path: "/inventory",
    reviewedAt: "2026-08-18",
    changeFrequency: "daily",
    priority: 0.9,
    kind: "core",
    summary: "Every published appliance, filterable by brand, price, condition and fuel type.",
  },
  {
    path: "/service-areas",
    reviewedAt: "2026-08-18",
    changeFrequency: "monthly",
    priority: 0.8,
    kind: "core",
    summary: "Towns served from the East Stroudsburg warehouse, with delivery detail for each.",
  },
  {
    path: "/delivery-installation",
    reviewedAt: "2026-08-18",
    changeFrequency: "monthly",
    priority: 0.8,
    kind: "service",
    summary: "How appliance delivery, installation and old-appliance haul-away work, and how they are priced.",
  },
  {
    path: "/financing",
    reviewedAt: "2026-08-18",
    changeFrequency: "monthly",
    priority: 0.7,
    kind: "service",
    summary: "Financing and buy-now-pay-later options on appliance purchases.",
  },
  {
    path: "/warranty",
    reviewedAt: "2026-08-18",
    changeFrequency: "monthly",
    priority: 0.7,
    kind: "service",
    summary: "What the 1-year warranty option covers on qualifying appliances, and what it does not.",
  },
  {
    path: "/schedule",
    reviewedAt: "2026-08-18",
    changeFrequency: "monthly",
    priority: 0.8,
    kind: "service",
    summary: "Book a warehouse visit, including after-hours appointments.",
  },
  {
    path: "/guides",
    reviewedAt: "2026-08-18",
    changeFrequency: "monthly",
    priority: 0.6,
    kind: "core",
    summary: "Appliance buying guides — measuring, fuel types, delivery and what scratch & dent means.",
  },
  {
    path: "/about",
    reviewedAt: "2026-08-18",
    changeFrequency: "monthly",
    priority: 0.6,
    kind: "core",
    summary: "What KT Appliances is, where the warehouse is, and how units are tested and described.",
  },
  {
    path: "/contact",
    reviewedAt: "2026-08-18",
    changeFrequency: "monthly",
    priority: 0.8,
    kind: "core",
    summary: "Address, phone, warehouse hours and directions.",
  },
  { path: "/privacy", reviewedAt: "2026-02-01", changeFrequency: "yearly", priority: 0.2, kind: "legal" },
  { path: "/terms", reviewedAt: "2026-02-01", changeFrequency: "yearly", priority: 0.2, kind: "legal" },
  {
    path: "/accessibility",
    reviewedAt: "2026-02-01",
    changeFrequency: "yearly",
    priority: 0.2,
    kind: "legal",
  },
];

/** Copy-review dates for the campaign landing pages, keyed by slug. */
const CAMPAIGN_REVIEWED_AT: Record<string, string> = {
  refrigerators: "2026-08-18",
  "washer-dryer": "2026-08-18",
  "appliance-sale": "2026-08-18",
};

/** Fallback for a campaign added without a review date recorded above. */
const CAMPAIGN_REVIEWED_FALLBACK = "2026-08-18";

export interface RouteEntry {
  path: string;
  lastModified: Date;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
}

function toDate(iso: string): Date {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function staticRouteEntries(): RouteEntry[] {
  return STATIC_ROUTES.map((route) => ({
    path: route.path,
    lastModified: toDate(route.reviewedAt),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

/**
 * Category routes.
 *
 * `productUpdates` maps a category slug to the newest `updated_at` among its
 * published products, so a category's lastmod moves when its stock actually
 * moves — which for this business is the only thing on those pages that changes.
 * Absent that (no database configured), it falls back to the copy-review date
 * rather than to `now`.
 */
export function categoryRouteEntries(productUpdates: Record<string, Date | undefined> = {}): RouteEntry[] {
  const fallback = toDate("2026-08-18");
  return CATEGORY_LIST.map((category) => ({
    path: category.path,
    lastModified: productUpdates[category.slug] ?? fallback,
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));
}

export function campaignRouteEntries(): RouteEntry[] {
  return CAMPAIGNS.map((campaign) => ({
    path: `/deals/${campaign.slug}`,
    lastModified: toDate(CAMPAIGN_REVIEWED_AT[campaign.slug] ?? CAMPAIGN_REVIEWED_FALLBACK),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
}

/** Only locations that clear the quality gate are published. */
export function locationRouteEntries(): RouteEntry[] {
  return indexableLocations().map((location) => ({
    path: `/appliances/${location.slug}`,
    lastModified: toDate(location.updatedAt),
    changeFrequency: "weekly" as const,
    priority: location.tier === "warehouse" ? 0.8 : 0.7,
  }));
}

export function guideRouteEntries(): RouteEntry[] {
  return GUIDES.map((guide) => ({
    path: `/guides/${guide.slug}`,
    lastModified: toDate(guide.updated),
    changeFrequency: "yearly" as const,
    priority: 0.55,
  }));
}
