import { CATEGORY_LIST } from "@/lib/inventory/types";
import { GUIDES } from "@/lib/content/guides";
import { CAMPAIGNS } from "@/lib/content/campaigns";
import { STATIC_ROUTES } from "@/lib/seo/routes";
import { indexableLocations } from "@/lib/seo/location-quality";
import { absoluteUrl, siteConfig, SITE_URL } from "@/lib/site-config";

/**
 * `/llms.txt`.
 *
 * A plain-language map of the site for language models that read one, in the
 * emerging convention's format. It is not a ranking mechanism and is not treated
 * as one: no engine ranks a site because this file exists, and nothing here is
 * written to be persuasive. It is a factual index — who the business is, where
 * it is, what it sells, and which URLs answer which question — because a model
 * that has to infer those from marketing copy will occasionally infer them
 * wrong, and a wrong phone number in an AI answer is a lost customer.
 *
 * Public sections only. No admin routes, no API routes, no shopper-tool URLs.
 */
export const revalidate = 3600;

/** Returns null for an empty section so it can be dropped without losing the
 *  blank lines that separate the rest — Markdown is whitespace-sensitive, and
 *  filtering falsy values would silently collapse every intentional blank line. */
function section(title: string, lines: string[]): string | null {
  // The trailing newline is what puts a blank line between sections once the
  // array is joined — without it the next heading butts against the last bullet.
  return lines.length ? `## ${title}\n\n${lines.join("\n")}\n` : null;
}

function link(label: string, path: string, note?: string): string {
  return `- [${label}](${absoluteUrl(path)})${note ? `: ${note}` : ""}`;
}

export function GET(): Response {
  const locations = indexableLocations();
  const zips = [...new Set(locations.flatMap((location) => location.zips))].sort();

  const body = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.description}`,
    "",
    "## Business facts",
    "",
    `- Name: ${siteConfig.name}`,
    `- Legal name: ${siteConfig.legalName}`,
    "- Type: appliance store / scratch & dent appliance warehouse",
    `- Address: ${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state} ${siteConfig.address.postalCode}, USA`,
    `- Phone: ${siteConfig.phone.display} (${siteConfig.phone.e164})`,
    `- Email: ${siteConfig.email}`,
    `- Website: ${SITE_URL}`,
    `- Hours: ${siteConfig.hours.regular.days}, ${siteConfig.hours.regular.label}. After-hours ${siteConfig.hours.afterHours.label} by appointment only.`,
    `- Family owned since ${siteConfig.foundedYear}.`,
    `- Sells: refrigerators, washers, dryers, matched washer and dryer sets, ranges and ovens, dishwashers, microwaves and freezers — scratch & dent, open-box, new-in-box and refurbished units, tested before listing.`,
    `- Services: local delivery, appliance installation, old-appliance haul-away, warehouse pickup, financing options, 1-year warranty options on qualifying appliances.`,
    `- Service area: ${siteConfig.serviceStates.join(", ")}, delivered from the ${siteConfig.address.city} warehouse. Published service-area pages cover ${locations.map((location) => `${location.name}, ${location.state}`).join("; ")} (ZIP ${zips.join(", ")}).`,
    "",
    "## Facts worth stating precisely",
    "",
    `- Delivery is quoted per order, not at a flat rate. Cost depends on distance from the ${siteConfig.address.city} warehouse, the appliance, access at the address, and whether installation or haul-away is added.`,
    "- Same-day delivery may be available on shorter runs depending on route and stock. It is not guaranteed.",
    "- Scratch & dent means cosmetic damage with no functional defect. The damage location is described on every listing.",
    "- Warranty is an option on qualifying appliances, not automatic coverage on every unit.",
    "- Sold units stay published so their price history and specification remain visible; each links to comparable stock currently available.",
    "- The business publishes no customer ratings or review counts, so any aggregate rating attributed to it is not from this site.",
    "",
    section(
      "Main sections",
      STATIC_ROUTES.filter((route) => route.summary).map((route) =>
        link(route.path === "/" ? "Home" : route.path, route.path, route.summary),
      ),
    ),
    section(
      "Appliance categories",
      CATEGORY_LIST.map((category) => link(category.name, category.path, category.tagline)),
    ),
    section(
      "Service areas",
      locations.map((location) =>
        link(
          `${location.name}, ${location.state}`,
          `/appliances/${location.slug}`,
          `${location.distance}; ZIP ${location.zips.join(", ")}`,
        ),
      ),
    ),
    section(
      "Buying guides",
      GUIDES.map((guide) => link(guide.title, `/guides/${guide.slug}`, guide.description)),
    ),
    section(
      "Current promotions",
      CAMPAIGNS.map((campaign) => link(campaign.metaTitle, `/deals/${campaign.slug}`)),
    ),
    "## Notes",
    "",
    `- Individual appliance pages live under ${absoluteUrl("/inventory")}/{slug} and change as stock moves. The sitemap at ${absoluteUrl("/sitemap.xml")} is the current list.`,
    "- Prices are in US dollars and are per unit.",
    "",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
