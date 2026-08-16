import type { MetadataRoute } from "next";

import { getPublishedSlugs } from "@/lib/inventory/repository";
import { CATEGORY_LIST } from "@/lib/inventory/types";
import { SERVICE_LOCATIONS } from "@/lib/content/locations";
import { CAMPAIGNS } from "@/lib/content/campaigns";
import { GUIDES } from "@/lib/content/guides";
import { absoluteUrl } from "@/lib/site-config";

export const revalidate = 3600;

/**
 * Sitemap.
 *
 * Product URLs are pulled live from inventory so newly published appliances are
 * discoverable without a redeploy, and sold units stay in the sitemap because
 * their pages remain useful (they cross-sell available stock rather than 404).
 * Admin and API routes are excluded.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/inventory"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    {
      url: absoluteUrl("/delivery-installation"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { url: absoluteUrl("/financing"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/warranty"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    {
      url: absoluteUrl("/service-areas"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { url: absoluteUrl("/guides"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/accessibility"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const categoryEntries: MetadataRoute.Sitemap = CATEGORY_LIST.map((category) => ({
    url: absoluteUrl(category.path),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  const campaignEntries: MetadataRoute.Sitemap = CAMPAIGNS.map((campaign) => ({
    url: absoluteUrl(`/deals/${campaign.slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const locationEntries: MetadataRoute.Sitemap = SERVICE_LOCATIONS.map((location) => ({
    url: absoluteUrl(`/appliances/${location.slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.65,
  }));

  const guideEntries: MetadataRoute.Sitemap = GUIDES.map((guide) => ({
    url: absoluteUrl(`/guides/${guide.slug}`),
    lastModified: new Date(guide.updated),
    changeFrequency: "yearly" as const,
    priority: 0.55,
  }));

  const slugs = await getPublishedSlugs();
  const productEntries: MetadataRoute.Sitemap = slugs.map(({ slug, updatedAt }) => ({
    url: absoluteUrl(`/inventory/${slug}`),
    lastModified: updatedAt ? new Date(updatedAt) : now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...campaignEntries,
    ...locationEntries,
    ...guideEntries,
    ...productEntries,
  ];
}
