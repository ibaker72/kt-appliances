import { SITE_URL, absoluteUrl, siteConfig } from "@/lib/site-config";
import {
  CONDITION_LABELS,
  type Appliance,
  isPurchasable,
  primaryImage,
} from "@/lib/inventory/types";

/**
 * Structured data helpers.
 *
 * Rule applied throughout: schema only ever describes content that is actually
 * visible on the page and factually true. No aggregate ratings, no review counts,
 * no offers for units we cannot sell.
 */

type Json = Record<string, unknown>;

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const LOCAL_BUSINESS_ID = `${SITE_URL}/#store`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * The warehouse is open 10–17 every day for walk-ins; 17–21 daily is by
 * appointment, which schema.org expresses as a separate specification.
 */
function openingHours(): Json[] {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  return [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days,
      opens: siteConfig.hours.regular.open,
      closes: siteConfig.hours.regular.close,
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days,
      opens: siteConfig.hours.afterHours.open,
      closes: siteConfig.hours.afterHours.close,
      description: siteConfig.hours.afterHours.note,
    },
  ];
}

export function localBusinessSchema(): Json {
  const sameAs = [
    siteConfig.social.facebook,
    siteConfig.social.instagram,
    siteConfig.social.marketplace,
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": ["Store", "HomeGoodsStore", "LocalBusiness"],
    "@id": LOCAL_BUSINESS_ID,
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: SITE_URL,
    logo: absoluteUrl(siteConfig.brand.logoFile ?? siteConfig.brand.mark),
    image: absoluteUrl(siteConfig.brand.logoFile ?? siteConfig.brand.mark),
    // Supplied by the company logo, so it can be stated rather than estimated.
    foundingDate: String(siteConfig.foundedYear),
    description: siteConfig.description,
    telephone: siteConfig.phone.e164,
    email: siteConfig.email,
    priceRange: "$$",
    currenciesAccepted: "USD",
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address.street,
      addressLocality: siteConfig.address.city,
      addressRegion: siteConfig.address.state,
      postalCode: siteConfig.address.postalCode,
      addressCountry: siteConfig.address.country,
    },
    areaServed: siteConfig.serviceStates.map((state) => ({
      "@type": "State",
      name: state,
    })),
    openingHoursSpecification: openingHours(),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: siteConfig.name,
    publisher: { "@id": LOCAL_BUSINESS_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/inventory?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface Crumb {
  name: string;
  /** Root-relative path. */
  path: string;
}

export function breadcrumbSchema(crumbs: Crumb[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export interface FaqEntry {
  question: string;
  /** Plain text — must match the answer rendered on the page. */
  answer: string;
}

export function faqSchema(entries: FaqEntry[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

const SCHEMA_CONDITION: Record<string, string> = {
  "scratch-and-dent": "https://schema.org/DamagedCondition",
  "open-box": "https://schema.org/NewCondition",
  "new-in-box": "https://schema.org/NewCondition",
  refurbished: "https://schema.org/RefurbishedCondition",
};

/**
 * Product + Offer for a single appliance. Availability mirrors real stock state,
 * and a sold unit is published as SoldOut rather than being dropped, so the URL
 * keeps its search equity instead of 404ing.
 */
export function productSchema(appliance: Appliance): Json {
  const image = primaryImage(appliance);
  const url = absoluteUrl(`/inventory/${appliance.slug}`);
  const availability = isPurchasable(appliance)
    ? "https://schema.org/InStock"
    : appliance.status === "reserved"
      ? "https://schema.org/LimitedAvailability"
      : "https://schema.org/SoldOut";

  const description =
    appliance.description ??
    `${CONDITION_LABELS[appliance.condition]} ${appliance.brand} ${appliance.title} available at ${siteConfig.name}.`;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: `${appliance.brand} ${appliance.title}`,
    description,
    sku: appliance.sku ?? undefined,
    mpn: appliance.modelNumber ?? undefined,
    brand: { "@type": "Brand", name: appliance.brand },
    category: appliance.subcategory ?? appliance.category,
    itemCondition: SCHEMA_CONDITION[appliance.condition] ?? "https://schema.org/UsedCondition",
    ...(appliance.color ? { color: appliance.color } : {}),
    ...(image
      ? { image: [image.imageUrl.startsWith("http") ? image.imageUrl : absoluteUrl(image.imageUrl)] }
      : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "USD",
      price: appliance.price,
      availability,
      itemCondition: SCHEMA_CONDITION[appliance.condition] ?? "https://schema.org/UsedCondition",
      availableAtOrFrom: { "@id": LOCAL_BUSINESS_ID },
      seller: { "@id": LOCAL_BUSINESS_ID },
    },
  };
}

/** ItemList for category and inventory pages. */
export function itemListSchema(appliances: Appliance[], listName: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: appliances.length,
    itemListElement: appliances.map((appliance, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/inventory/${appliance.slug}`),
      name: `${appliance.brand} ${appliance.title}`,
    })),
  };
}
