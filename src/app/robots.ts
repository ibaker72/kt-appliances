import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/site-config";

/**
 * Robots policy.
 *
 * Admin, API and auth surfaces are disallowed here and additionally carry an
 * `X-Robots-Tag: noindex` response header (see `next.config.ts`) so they stay out
 * of the index even if the file is ignored.
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
        disallow: ["/admin", "/admin/", "/api/", "/_next/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
