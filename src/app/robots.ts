import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-config";

/**
 * Robots policy.
 *
 * WHAT IS BLOCKED, AND WHAT DELIBERATELY IS NOT.
 *
 * Blocked: the admin area, the API surface and the two shopper tools whose URLs
 * are built from arbitrary ids (`/inventory/compare?compare=…`, `/inventory/saved`).
 * Those carry `noindex` in their metadata too; the `Disallow` here is belt and
 * braces for the admin routes, which additionally send `X-Robots-Tag: noindex`
 * from `next.config.ts` and `proxy.ts`.
 *
 * NOT blocked: `/_next/`. An earlier version disallowed it, which is a quiet but
 * serious mistake — Google renders pages before judging them, and blocking the
 * build output blocks the CSS and JavaScript it needs to do that. A page whose
 * stylesheet 403s to the crawler is assessed as unstyled and, on mobile, often
 * as unusable. Static assets stay crawlable.
 *
 * NOT blocked either: the filtered inventory URLs. Those are handled with
 * `noindex, follow` in page metadata (see `listingMetadata`), not with a
 * `Disallow` — a disallowed URL is never fetched, so the crawler never reads the
 * `noindex` on it and never follows the links to the products beneath it.
 *
 * If `NEXT_PUBLIC_SITE_URL` has not been set, the site is not on its real domain
 * yet — in that case crawling is disallowed entirely so a preview deployment
 * cannot get indexed ahead of production.
 */
export default function robots(): MetadataRoute.Robots {
  const hasProductionDomain = Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim());

  if (!hasProductionDomain) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/inventory/compare", "/inventory/saved"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
