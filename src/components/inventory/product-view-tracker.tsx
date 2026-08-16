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
  brand,
  category,
  price,
}: {
  id: string;
  slug: string;
  brand: string;
  category: string;
  price: number;
}) {
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
