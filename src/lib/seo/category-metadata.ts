import type { Metadata } from "next";

import { CATEGORIES, type ApplianceCategory } from "@/lib/inventory/types";
import { listingView, type RawSearchParams } from "@/lib/inventory/search-params";
import { listingMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

/**
 * Metadata for a category route.
 *
 * Lives here rather than beside the component it serves for two reasons: it is
 * data, not markup, and a `.tsx` module cannot be imported by the test runner
 * (Node strips TypeScript types but does not compile JSX), which would leave the
 * canonical policy untestable.
 *
 * Goes through `listingMetadata` because every category route accepts the full
 * filter querystring: the clean URL and its numbered pages are indexable and
 * self-canonical, and every filtered, sorted or searched permutation is
 * `noindex, follow` pointing back at the clean URL. See `listingMetadata` for
 * why that split rather than a robots disallow.
 */
export function categoryMetadata(
  slug: ApplianceCategory,
  searchParams: RawSearchParams = {},
): Metadata {
  const category = CATEGORIES[slug];
  const view = listingView(searchParams);

  return listingMetadata({
    title: `Scratch & Dent ${category.name}`,
    description: `${category.name} at warehouse prices from ${siteConfig.name} in ${siteConfig.address.city}, ${siteConfig.address.state}. ${category.intro.slice(0, 150)} Delivery, installation and warranty options available across ${siteConfig.serviceStatesShort.join(", ")}.`,
    path: category.path,
    filtered: view.filtered,
    page: view.page,
  });
}
