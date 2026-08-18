import type { Metadata } from "next";
import { SITE_URL, absoluteUrl, siteConfig } from "@/lib/site-config";

interface PageMetaOptions {
  title: string;
  description: string;
  /** Site-root-relative path, e.g. "/inventory". Drives the canonical URL. */
  path: string;
  /**
   * Overrides the canonical when it is not simply `path` — a filtered listing
   * canonicalising back to its clean URL, or a paginated page canonicalising to
   * itself. Root-relative, and may carry a querystring.
   */
  canonicalPath?: string;
  /** Absolute or root-relative OG image. Defaults to the site card. */
  image?: string;
  /**
   * Keeps the page out of the index. Links are still followed by default, which
   * is what a filtered listing wants: do not index this permutation, but do keep
   * crawling through to the products on it. Pass `"none"` to drop both.
   */
  noindex?: boolean | "none";
  type?: "website" | "article";
  publishedTime?: string;
}

/**
 * Every page's metadata funnels through here so canonicals, Open Graph and
 * Twitter cards stay consistent and the domain is never hardcoded.
 */
export function pageMetadata({
  title,
  description,
  path,
  canonicalPath,
  image = "/opengraph-image",
  noindex = false,
  type = "website",
  publishedTime,
}: PageMetaOptions): Metadata {
  const url = absoluteUrl(path);
  const canonical = absoluteUrl(canonicalPath ?? path);
  const imageUrl = image.startsWith("http") ? image : absoluteUrl(image);

  return {
    title,
    description,
    alternates: { canonical },
    robots: noindex
      ? { index: false, follow: noindex !== "none", nocache: true }
      : { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    openGraph: {
      type,
      url,
      title: `${title} | ${siteConfig.name}`,
      description,
      siteName: siteConfig.name,
      locale: "en_US",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${siteConfig.name} — ${title}` }],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [imageUrl],
    },
  };
}

/**
 * Metadata for a listing page that may be filtered, sorted, searched or paged.
 *
 * THE DUPLICATE-CONTENT DECISION, IN ONE PLACE.
 *
 * `/inventory` and every category route accept a dozen query parameters, which
 * multiply into more URL permutations than the catalogue has products. Left
 * alone that is the classic faceted-navigation index bloat: thousands of
 * near-identical listing URLs competing with the page that should rank.
 *
 * The rule applied here:
 *
 *   no parameters          → index, canonical to itself.
 *   `page=N` only          → index, canonical to itself. Deep pages are how a
 *                            crawler reaches product 300; canonicalising them to
 *                            page 1 hides those products.
 *   any filter/sort/search → `noindex, follow`, canonical to the clean listing.
 *                            The permutation is useful to a shopper and worth
 *                            crawling through to the products, and worthless as
 *                            an index entry.
 *
 * `follow` is the load-bearing half: these pages are the main crawl path into
 * individual appliances, so they must stay traversable even while unindexed.
 */
export function listingMetadata({
  title,
  description,
  path,
  filtered,
  page = 1,
}: {
  title: string;
  description: string;
  /** Clean route for this listing, e.g. "/refrigerators". */
  path: string;
  /** True when any filter, sort, search or view parameter is applied. */
  filtered: boolean;
  /** 1-based page number from the URL. */
  page?: number;
}): Metadata {
  if (filtered) {
    return pageMetadata({ title, description, path, canonicalPath: path, noindex: true });
  }

  const paged = page > 1;
  return pageMetadata({
    title: paged ? `${title} — Page ${page}` : title,
    description,
    path,
    canonicalPath: paged ? `${path}?page=${page}` : path,
  });
}

/** Root metadata, including the title template every page inherits. */
export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${siteConfig.name} — Scratch & Dent Appliance Warehouse in East Stroudsburg, PA`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "Appliance Store",
  formatDetection: { telephone: true, address: true, email: true },
  alternates: { canonical: absoluteUrl("/") },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  // Icons come from the `app/icon.svg` file convention — no manual config needed.
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — Scratch & Dent Appliance Warehouse`,
    description: siteConfig.description,
  },
  twitter: { card: "summary_large_image" },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};
