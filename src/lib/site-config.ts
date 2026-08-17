/**
 * Single source of truth for business information.
 * Nothing in this file should be duplicated elsewhere in the codebase — import from here.
 */

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

/** Canonical origin used for metadata, sitemaps and absolute URLs. */
export const SITE_URL = rawSiteUrl && rawSiteUrl.length > 0 ? rawSiteUrl : "http://localhost:3000";

const rawPhone = (process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? "9735199717").replace(/\D/g, "");

function formatPhone(digits: string): string {
  if (digits.length !== 10) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export const siteConfig = {
  name: "KT Appliances",
  legalName: "KT Appliances, LLC",

  /**
   * From the company logo. Recorded here because the rest of the site is
   * deliberately silent about company history — until this was supplied there
   * was no founding year to cite, and inventing one is exactly the sort of
   * detail that makes a small business site read as fake.
   */
  foundedYear: 2000,
  familyOwned: true,
  shortDescription: "Scratch & dent appliance warehouse in East Stroudsburg, PA.",
  description:
    "KT Appliances is a scratch & dent appliance warehouse in East Stroudsburg, PA. Name-brand refrigerators, washers, dryers, ranges and dishwashers — tested, working, and priced below traditional retail. Serving Pennsylvania, New Jersey and New York.",
  url: SITE_URL,

  phone: {
    /** Digits only — used to build tel: and sms: hrefs. */
    digits: rawPhone,
    /** Human readable — used for display. */
    display: formatPhone(rawPhone),
    /** E.164 — used for tel:/sms: hrefs and schema.org. */
    e164: `+1${rawPhone}`,
  },

  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL?.trim() || "ktappliances20@gmail.com",

  address: {
    street: "109 Burson St",
    city: "East Stroudsburg",
    state: "PA",
    stateName: "Pennsylvania",
    postalCode: "18301",
    country: "US",
    /** Single-line display string. */
    get oneLine() {
      return `${this.street}, ${this.city}, ${this.state}`;
    },
  },

  /**
   * Warehouse hours. Open every day; after-hours slots are by appointment only.
   */
  hours: {
    regular: { open: "10:00", close: "17:00", label: "10:00 AM – 5:00 PM", days: "Monday – Sunday" },
    afterHours: {
      open: "17:00",
      close: "21:00",
      label: "5:00 PM – 9:00 PM",
      days: "Monday – Sunday",
      note: "Appointments required after 5 PM.",
    },
  },

  brand: {
    /**
     * Mark referenced by the LocalBusiness schema and the app icons.
     *
     * Points at the KT monogram, which is a real asset in this repo. When the
     * full company logo is supplied as a file, drop it in `public/img/brand/`
     * and change this one path — nothing else reads the logo directly.
     */
    mark: "/icon.svg",
    /** Straplines carried on the company logo. */
    strapline: "True Family Deal",
    ownership: "Family Owned Since 2000",
  },

  /** States where the business advertises sales and delivery coverage. */
  serviceStates: ["Pennsylvania", "New Jersey", "New York"] as const,
  serviceStatesShort: ["PA", "NJ", "NY"] as const,

  social: {
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim() || "",
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "",
    marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_URL?.trim() || "",
  },
} as const;

/** `tel:` href for the business line. */
export const telHref = `tel:${siteConfig.phone.e164}`;

/** `mailto:` href for the business inbox. */
export const mailtoHref = `mailto:${siteConfig.email}`;

/**
 * Builds an `sms:` href with a pre-filled body.
 *
 * iOS requires `&body=`, Android/most others accept `?body=`. `sms:+1555…?&body=`
 * is the widely used form that works on both, so we emit that.
 */
export function smsHref(body?: string): string {
  const base = `sms:${siteConfig.phone.e164}`;
  if (!body) return base;
  return `${base}?&body=${encodeURIComponent(body)}`;
}

/** Google Maps directions link — works without an API key. */
export const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  `${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state} ${siteConfig.address.postalCode}`,
)}`;

/** Embedded map source. Uses the Maps Embed API when a key exists, otherwise the keyless embed. */
export function mapEmbedSrc(): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const q = encodeURIComponent(
    `${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state} ${siteConfig.address.postalCode}`,
  );
  if (key) return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${q}&zoom=15`;
  return `https://maps.google.com/maps?q=${q}&z=15&output=embed`;
}

/** Absolute URL helper for canonicals, OG tags and sitemaps. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}
