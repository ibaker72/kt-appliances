import type { InventoryFacets } from "@/lib/inventory/query";
import { CATEGORY_LIST, type FuelType } from "@/lib/inventory/types";

export interface NavItem {
  label: string;
  href: string;
  description?: string;
  /**
   * Condensed label for the desktop header bar, where the full one competes with
   * the search field for width. The full `label` is still used in the mobile
   * drawer and the footer, so no destination is ever described only by shorthand.
   */
  shortLabel?: string;
}

/**
 * Popular-search rail shown under the homepage search box.
 *
 * Each entry is a real filtered URL, and any entry that depends on a specific
 * attribute declares it so `quickLinksFor` can drop it when nothing in the
 * warehouse carries that attribute. A shopper never taps a chip that leads to an
 * empty grid, and the rail shrinks with the catalogue instead of lying about it.
 */
interface QuickLinkDefinition extends NavItem {
  /** Hidden unless some unit carries this `subcategory` value. */
  requiresSubcategory?: string;
  /** Hidden unless some unit carries this fuel type. */
  requiresFuelType?: FuelType;
  /** Hidden unless some unit is priced below this. */
  requiresPriceBelow?: number;
  /** Hidden unless some unit has a verified comparison price. */
  requiresDeals?: boolean;
}

const QUICK_LINKS: QuickLinkDefinition[] = [
  {
    label: "French Door Refrigerators",
    href: "/refrigerators?type=French+Door",
    requiresSubcategory: "French Door",
  },
  {
    label: "Side-by-Side Refrigerators",
    href: "/refrigerators?type=Side-by-Side",
    requiresSubcategory: "Side-by-Side",
  },
  {
    label: "Top Freezer Refrigerators",
    href: "/refrigerators?type=Top+Freezer",
    requiresSubcategory: "Top Freezer",
  },
  {
    label: "Front Load Washers",
    href: "/washers?type=Front+Load",
    requiresSubcategory: "Front Load",
  },
  {
    label: "Top Load Washers",
    href: "/washers?type=Top+Load",
    requiresSubcategory: "Top Load",
  },
  { label: "Electric Dryers", href: "/dryers?fuel=electric", requiresFuelType: "electric" },
  { label: "Gas Dryers", href: "/dryers?fuel=gas", requiresFuelType: "gas" },
  { label: "Washer & Dryer Sets", href: "/washer-dryer-sets" },
  { label: "Ranges & Ovens", href: "/ranges" },
  { label: "Dishwashers", href: "/dishwashers" },
  { label: "Under $500", href: "/inventory?max=500", requiresPriceBelow: 500 },
  { label: "Today's Deals", href: "/inventory?deals=1&sort=savings", requiresDeals: true },
];

/** Filters the quick-search rail down to entries the current catalogue supports. */
export function quickLinksFor(facets: InventoryFacets): NavItem[] {
  const subcategories = new Set(facets.subcategories.map((value) => value.toLowerCase()));

  return QUICK_LINKS.filter((link) => {
    if (link.requiresSubcategory && !subcategories.has(link.requiresSubcategory.toLowerCase())) {
      return false;
    }
    if (link.requiresFuelType && !facets.fuelTypes.includes(link.requiresFuelType)) return false;
    // `minPrice` is 0 only when nothing priced is in scope, so that hides it too.
    if (
      link.requiresPriceBelow != null &&
      (facets.minPrice === 0 || facets.minPrice >= link.requiresPriceBelow)
    ) {
      return false;
    }
    if (link.requiresDeals && !facets.hasDeals) return false;
    return true;
  }).map(({ label, href, description }) => ({ label, href, description }));
}

/** Primary desktop navigation. */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Appliances", href: "/inventory", description: "Everything on the floor right now" },
  {
    label: "Warehouse Deals",
    shortLabel: "Deals",
    href: "/deals/appliance-sale",
    description: "This month's lowest prices",
  },
  {
    label: "Delivery & Installation",
    shortLabel: "Delivery",
    href: "/delivery-installation",
    description: "Local delivery, install and haul-away",
  },
  { label: "Financing", href: "/financing", description: "Buy now, pay later options" },
  { label: "Warranty", href: "/warranty", description: "1-year coverage on qualifying units" },
  { label: "About", href: "/about", description: "How the warehouse works" },
  { label: "Contact", href: "/contact", description: "Hours, directions and after-hours visits" },
];

/** Category bar under the main header, and the mobile drawer's shop section. */
export const CATEGORY_NAV: NavItem[] = CATEGORY_LIST.map((category) => ({
  label: category.name,
  href: category.path,
  description: category.tagline,
}));

export const FOOTER_SHOP_NAV: NavItem[] = [
  { label: "All Inventory", href: "/inventory" },
  ...CATEGORY_NAV.map(({ label, href }) => ({ label, href })),
];

export const FOOTER_SERVICE_NAV: NavItem[] = [
  { label: "Delivery & Installation", href: "/delivery-installation" },
  { label: "Financing", href: "/financing" },
  { label: "Warranty", href: "/warranty" },
  { label: "Service Areas", href: "/service-areas" },
  { label: "Buying Guides", href: "/guides" },
];

export const FOOTER_COMPANY_NAV: NavItem[] = [
  { label: "Saved Appliances", href: "/inventory/saved" },
  { label: "About KT Appliances", href: "/about" },
  { label: "Contact & Warehouse Hours", href: "/contact" },
  { label: "Recently Sold", href: "/inventory?status=sold" },
];

export const FOOTER_LEGAL_NAV: NavItem[] = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Sale", href: "/terms" },
  { label: "Accessibility", href: "/accessibility" },
];
