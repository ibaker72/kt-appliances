import type { ApplianceCategory } from "@/lib/inventory/types";

/**
 * Campaign landing pages under `/deals/[campaign]`.
 *
 * These exist so paid traffic lands on a page that matches the ad instead of the
 * generic homepage: the headline restates the ad's promise, the grid is already
 * filtered to what the ad was about, and the call/text CTAs are immediate.
 * UTM parameters are captured by the site-wide attribution tracker and travel
 * through to any lead submitted from here.
 *
 * Adding a campaign is a data change — add an entry and the route exists.
 */
export interface Campaign {
  slug: string;
  /** H1 — should echo the ad copy. */
  headline: string;
  /** Second line of the H1, rendered in red. */
  headlineAccent: string;
  subhead: string;
  /** Restricts the grid. Omit for an all-inventory campaign. */
  categories?: ApplianceCategory[];
  /** Metadata title and description. */
  metaTitle: string;
  metaDescription: string;
  /** Three proof points shown directly under the CTAs. */
  proofPoints: string[];
  /** Pre-filled SMS body for this campaign's text CTA. */
  smsMessage: string;
  /** Section heading above the product grid. */
  gridHeading: string;
}

export const CAMPAIGNS: Campaign[] = [
  {
    slug: "refrigerators",
    headline: "Name-Brand Refrigerators.",
    headlineAccent: "Warehouse Prices.",
    subhead:
      "French door, side-by-side and top freezer refrigerators with cosmetic damage — tested for cooling, priced hundreds below retail. Pick up in East Stroudsburg or have it delivered.",
    categories: ["refrigerators"],
    metaTitle: "Refrigerator Deals — Scratch & Dent Refrigerators",
    metaDescription:
      "Scratch & dent refrigerators at warehouse prices in East Stroudsburg, PA. French door, side-by-side and top freezer units, tested and working. Delivery, installation and warranty options available.",
    proofPoints: [
      "Cooling and ice/water function tested before listing",
      "Damage location described on every unit",
      "Delivery, haul-away and 1-year warranty options",
    ],
    smsMessage:
      "Hi KT Appliances, I saw your refrigerator deals. What do you have available right now?",
    gridHeading: "Refrigerators available now",
  },
  {
    slug: "washer-dryer",
    headline: "Washers & Dryers.",
    headlineAccent: "Warehouse Prices.",
    subhead:
      "Front load and top load washers, electric and gas dryers, and matched laundry sets — every unit run through a test cycle before it goes on the floor.",
    categories: ["washers", "dryers", "washer-dryer-sets"],
    metaTitle: "Washer & Dryer Deals — Scratch & Dent Laundry",
    metaDescription:
      "Scratch & dent washers, dryers and matched laundry sets at warehouse prices in East Stroudsburg, PA. Tested and working, with delivery, installation, haul-away and warranty options.",
    proofPoints: [
      "Every washer run through a full test cycle",
      "Electric and gas dryers — fuel type on every listing",
      "Buy the matched set and save on the pair",
    ],
    smsMessage:
      "Hi KT Appliances, I saw your washer and dryer deals. What sets do you have available?",
    gridHeading: "Laundry available now",
  },
  {
    slug: "appliance-sale",
    headline: "Warehouse Appliance Sale.",
    headlineAccent: "Everything Below Retail.",
    subhead:
      "Refrigerators, washers, dryers, ranges and dishwashers from name brands — scratch & dent and open box, tested, and priced to move out of the warehouse.",
    metaTitle: "Appliance Sale — Warehouse Prices on Name Brands",
    metaDescription:
      "Warehouse appliance sale at KT Appliances in East Stroudsburg, PA. Scratch & dent refrigerators, washers, dryers, ranges and dishwashers below traditional retail. Delivery and financing available.",
    proofPoints: [
      "Name brands, tested and working",
      "Delivery, installation and haul-away available",
      "Financing and 1-year warranty options",
    ],
    smsMessage: "Hi KT Appliances, I saw your appliance sale. What do you have available right now?",
    gridHeading: "On the floor right now",
  },
];

export function getCampaign(slug: string): Campaign | null {
  return CAMPAIGNS.find((campaign) => campaign.slug === slug) ?? null;
}
