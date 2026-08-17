"use client";

import { useEffect } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

/**
 * Reports a product_view (and Meta ViewContent) once per mount. Kept as its own
 * tiny client component so the product page itself stays a server component.
 */
export function ProductViewTracker({
  id,
  slug,
  title,
  brand,
  category,
  price,
  image,
}: {
  id: string;
  slug: string;
  /** Only used for the recently-viewed cookie. */
  title?: string;
  brand: string;
  category: string;
  price: number;
  /** Primary image URL, stored so the rail can render without a round trip. */
  image?: string | null;
}) {
  useEffect(() => {
    if (title) rememberViewed({ slug, title, brand, image: image ?? null });
  }, [slug, title, brand, image]);

  useEffect(() => {
    track(ANALYTICS_EVENTS.productView, {
      content_ids: slug,
      content_type: "product",
      item_id: id,
      brand,
      category,
      value: price,
      currency: "USD",
    });
  }, [id, slug, brand, category, price]);

  return null;
}

/** Category and inventory listing views. */
export function ListViewTracker({
  listName,
  category,
  resultCount,
}: {
  listName: string;
  category?: string;
  resultCount: number;
}) {
  useEffect(() => {
    track(category ? ANALYTICS_EVENTS.categoryView : ANALYTICS_EVENTS.inventoryView, {
      list_name: listName,
      category,
      results: resultCount,
    });
  }, [listName, category, resultCount]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* Recently viewed                                                             */
/* -------------------------------------------------------------------------- */

export const RECENTLY_VIEWED_COOKIE = "kt_recent";
const RECENTLY_VIEWED_MAX = 8;

/**
 * The slice of a listing kept in the recently-viewed cookie.
 *
 * Price is deliberately absent. A cookie is a snapshot taken whenever the
 * shopper last opened the page, and this site does not print a price it cannot
 * verify at render time — a stale number here would be exactly the kind of claim
 * the rest of the codebase goes out of its way to avoid. The rail is a way back
 * to something you looked at, not a merchandising module.
 */
export interface RecentlyViewedEntry {
  slug: string;
  title: string;
  brand: string;
  image: string | null;
}

export function readRecentlyViewed(): RecentlyViewedEntry[] {
  if (typeof document === "undefined") return [];
  const raw = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${RECENTLY_VIEWED_COOKIE}=`))
    ?.slice(RECENTLY_VIEWED_COOKIE.length + 1);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is RecentlyViewedEntry =>
        typeof entry === "object" && entry != null && typeof (entry as RecentlyViewedEntry).slug === "string",
    );
  } catch {
    // A malformed cookie is not worth an error boundary — show nothing.
    return [];
  }
}

/** Records this unit at the head of the recently-viewed list. */
export function rememberViewed(entry: RecentlyViewedEntry): void {
  const next = [entry, ...readRecentlyViewed().filter((item) => item.slug !== entry.slug)].slice(
    0,
    RECENTLY_VIEWED_MAX,
  );
  const value = encodeURIComponent(JSON.stringify(next));
  document.cookie = `${RECENTLY_VIEWED_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}
