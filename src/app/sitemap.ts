import type { MetadataRoute } from "next";

import { buildSitemap } from "@/lib/seo/sitemap";

export const revalidate = 3600;

/**
 * Sitemap.
 *
 * The list itself is assembled by `buildSitemap()` so the same code path can be
 * exercised by the health-check cron and the test suite. Product URLs are pulled
 * live from inventory, so a newly published appliance is discoverable without a
 * redeploy; `lastModified` comes from real timestamps (product `updated_at`,
 * guide and location review dates) rather than the current time. Admin, API and
 * shopper-tool routes are absent because they are not in the route registry.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { entries } = await buildSitemap();
  return entries;
}
