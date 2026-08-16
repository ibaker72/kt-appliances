/**
 * Domain types for warehouse inventory.
 *
 * These mirror the `appliances` / `appliance_images` tables in
 * `supabase/migrations/0001_init.sql`. Keep the two in sync.
 */

export const APPLIANCE_CATEGORIES = [
  "refrigerators",
  "washers",
  "dryers",
  "washer-dryer-sets",
  "ranges",
  "dishwashers",
  "other",
] as const;

export type ApplianceCategory = (typeof APPLIANCE_CATEGORIES)[number];

export const APPLIANCE_STATUSES = ["available", "reserved", "sold", "draft"] as const;
export type ApplianceStatus = (typeof APPLIANCE_STATUSES)[number];

export const APPLIANCE_CONDITIONS = [
  "scratch-and-dent",
  "open-box",
  "new-in-box",
  "refurbished",
] as const;
export type ApplianceCondition = (typeof APPLIANCE_CONDITIONS)[number];

export const FUEL_TYPES = ["electric", "gas", "dual-fuel", "propane"] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export interface ApplianceImage {
  id: string;
  applianceId: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface Appliance {
  id: string;
  slug: string;
  sku: string | null;
  title: string;
  brand: string;
  modelNumber: string | null;
  category: ApplianceCategory;
  subcategory: string | null;
  description: string | null;
  condition: ApplianceCondition;
  cosmeticNotes: string | null;
  functionalNotes: string | null;
  /** Price in whole US dollars. */
  price: number;
  /** Comparison retail price. Null when no verified comparison exists — never invent one. */
  compareAtPrice: number | null;
  quantity: number;
  status: ApplianceStatus;
  color: string | null;
  finish: string | null;
  dimensions: string | null;
  capacity: string | null;
  fuelType: FuelType | null;
  warrantyAvailable: boolean;
  deliveryAvailable: boolean;
  installationAvailable: boolean;
  haulAwayAvailable: boolean;
  featured: boolean;
  published: boolean;
  soldAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: ApplianceImage[];
  /** True for locally seeded sample records. Never set on production database rows. */
  isDemo?: boolean;
}

export interface CategoryDefinition {
  slug: ApplianceCategory;
  /** Plural display name, e.g. "Refrigerators". */
  name: string;
  /** Singular, e.g. "Refrigerator". */
  singular: string;
  /** Dedicated top-level route, e.g. "/refrigerators". Null when browsed via /inventory. */
  path: string;
  /** Short merchandising line used on category tiles. */
  tagline: string;
  /** Longer copy for the category landing page. */
  intro: string;
  /** Illustration used when a listing has no photograph yet. */
  artwork: string;
}

export const CATEGORIES: Record<ApplianceCategory, CategoryDefinition> = {
  refrigerators: {
    slug: "refrigerators",
    name: "Refrigerators",
    singular: "Refrigerator",
    path: "/refrigerators",
    tagline: "French door, side-by-side, top freezer",
    intro:
      "French door, side-by-side, top and bottom freezer refrigerators from name brands. Most units carry cosmetic marks from shipping or showroom handling — dents, scuffs or a scratched panel — and are tested for cooling and ice/water function before they hit the floor.",
    artwork: "/img/appliances/refrigerator.svg",
  },
  washers: {
    slug: "washers",
    name: "Washers",
    singular: "Washer",
    path: "/washers",
    tagline: "Front load and top load",
    intro:
      "Front load and top load washers, including high-efficiency and large-capacity models. Every washer is run through a test cycle before it is listed so you know it fills, agitates, spins and drains.",
    artwork: "/img/appliances/washer.svg",
  },
  dryers: {
    slug: "dryers",
    name: "Dryers",
    singular: "Dryer",
    path: "/dryers",
    tagline: "Electric and gas",
    intro:
      "Electric and gas dryers, including steam and large-capacity models. Check the fuel type on each listing — gas dryers need a gas hookup and electric dryers need a 240V outlet.",
    artwork: "/img/appliances/dryer.svg",
  },
  "washer-dryer-sets": {
    slug: "washer-dryer-sets",
    name: "Washer & Dryer Sets",
    singular: "Washer & Dryer Set",
    path: "/washer-dryer-sets",
    tagline: "Matched laundry pairs",
    intro:
      "Matched washer and dryer pairs sold together. Buying the set is usually the cheapest way to replace a full laundry room, and both units are tested before the set is listed.",
    artwork: "/img/appliances/laundry-set.svg",
  },
  ranges: {
    slug: "ranges",
    name: "Ranges & Ovens",
    singular: "Range",
    path: "/ranges",
    tagline: "Gas, electric, induction, wall ovens",
    intro:
      "Freestanding and slide-in ranges, wall ovens and cooktops in gas, electric and induction. Fuel type is listed on every unit — bring your hookup type with you when you call.",
    artwork: "/img/appliances/range.svg",
  },
  dishwashers: {
    slug: "dishwashers",
    name: "Dishwashers",
    singular: "Dishwasher",
    path: "/dishwashers",
    tagline: "Built-in and portable",
    intro:
      "Built-in and portable dishwashers, mostly standard 24-inch openings. Dishwashers are run through a fill and drain test before listing, and installation is available if you need the old one pulled out.",
    artwork: "/img/appliances/dishwasher.svg",
  },
  other: {
    slug: "other",
    name: "Other Appliances",
    singular: "Appliance",
    path: "/other-appliances",
    tagline: "Microwaves, freezers, and more",
    intro:
      "Over-the-range microwaves, chest and upright freezers, wine coolers and whatever else comes through the warehouse. Stock in this category turns over quickly — call or text if you are looking for something specific.",
    artwork: "/img/appliances/microwave.svg",
  },
};

/** Order used for navigation, footers and the homepage merchandising grid. */
export const CATEGORY_ORDER: ApplianceCategory[] = [
  "refrigerators",
  "washers",
  "dryers",
  "washer-dryer-sets",
  "ranges",
  "dishwashers",
  "other",
];

export const CATEGORY_LIST: CategoryDefinition[] = CATEGORY_ORDER.map((slug) => CATEGORIES[slug]);

export function isApplianceCategory(value: string): value is ApplianceCategory {
  return (APPLIANCE_CATEGORIES as readonly string[]).includes(value);
}

export const CONDITION_LABELS: Record<ApplianceCondition, string> = {
  "scratch-and-dent": "Scratch & Dent",
  "open-box": "Open Box",
  "new-in-box": "New In Box",
  refurbished: "Refurbished",
};

export const STATUS_LABELS: Record<ApplianceStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
  draft: "Draft",
};

export const FUEL_LABELS: Record<FuelType, string> = {
  electric: "Electric",
  gas: "Natural Gas",
  "dual-fuel": "Dual Fuel",
  propane: "Propane",
};

/**
 * Savings are only meaningful when a real comparison price is on record and is
 * genuinely higher than what we charge. Anything else returns null so the UI
 * renders nothing rather than a fabricated discount.
 */
export function savingsFor(appliance: Pick<Appliance, "price" | "compareAtPrice">): number | null {
  const { price, compareAtPrice } = appliance;
  if (compareAtPrice == null) return null;
  if (compareAtPrice <= price) return null;
  return compareAtPrice - price;
}

export function primaryImage(appliance: Appliance): ApplianceImage | null {
  if (appliance.images.length === 0) return null;
  return appliance.images.find((image) => image.isPrimary) ?? appliance.images[0];
}

export function isPurchasable(appliance: Appliance): boolean {
  return appliance.status === "available" && appliance.quantity > 0;
}

/** US dollars, no cents — warehouse pricing is always whole dollars. */
export function formatPrice(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}
