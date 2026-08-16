import type { Metadata } from "next";
import { SITE_URL, absoluteUrl, siteConfig } from "@/lib/site-config";

interface PageMetaOptions {
  title: string;
  description: string;
  /** Site-root-relative path, e.g. "/inventory". Drives the canonical URL. */
  path: string;
  /** Absolute or root-relative OG image. Defaults to the site card. */
  image?: string;
  noindex?: boolean;
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
  image = "/opengraph-image",
  noindex = false,
  type = "website",
  publishedTime,
}: PageMetaOptions): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = image.startsWith("http") ? image : absoluteUrl(image);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noindex
      ? { index: false, follow: false, nocache: true }
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
