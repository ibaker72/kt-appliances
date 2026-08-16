import { CATEGORY_LIST } from "@/lib/inventory/types";

export interface NavItem {
  label: string;
  href: string;
  description?: string;
}

/** Primary desktop navigation. */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Appliances", href: "/inventory", description: "Everything on the floor right now" },
  { label: "Warehouse Deals", href: "/deals/appliance-sale", description: "This month's lowest prices" },
  { label: "Delivery & Installation", href: "/delivery-installation", description: "Local delivery, install and haul-away" },
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
  { label: "About KT Appliances", href: "/about" },
  { label: "Contact & Warehouse Hours", href: "/contact" },
  { label: "Recently Sold", href: "/inventory?status=sold" },
];

export const FOOTER_LEGAL_NAV: NavItem[] = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Sale", href: "/terms" },
  { label: "Accessibility", href: "/accessibility" },
];
