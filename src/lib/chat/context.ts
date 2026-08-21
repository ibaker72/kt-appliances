import { CATEGORIES, CATEGORY_LIST, type ApplianceCategory } from "@/lib/inventory/types";
import { getLocation } from "@/lib/content/locations";

/**
 * What the visitor is looking at.
 *
 * Derived on the server from the pathname alone. The panel sends its pathname
 * and nothing else about the page — no product id, no price, no status — so
 * there is no client-supplied claim about inventory to trust in the first place.
 * The pathname is not a claim: it is the URL the visitor is already on, and
 * every fact hung off it (which appliance, whether it is available, what it
 * costs) is re-read from the database by `inventory-tools.ts`.
 *
 * Pure module: the panel uses the same greeting logic for its optimistic first
 * paint that the server uses for the real one, so opening the assistant does not
 * flash a generic greeting before the contextual one arrives.
 */

export type PageContextKind =
  | "home"
  | "inventory"
  | "category"
  | "appliance"
  | "delivery"
  | "financing"
  | "schedule"
  | "location"
  | "contact"
  | "guides"
  | "other";

export interface PageContext {
  kind: PageContextKind;
  pathname: string;
  /** Set on a category route, e.g. `/refrigerators`. */
  categorySlug?: ApplianceCategory;
  /** Set on `/inventory/[slug]`. Resolved against the database before use. */
  applianceSlug?: string;
  /** Town name on a service-area page, e.g. "Stroudsburg". */
  locationName?: string;
}

/** `/refrigerators` → `refrigerators`. Built from the category table, not restated. */
const CATEGORY_BY_PATH = new Map<string, ApplianceCategory>(
  CATEGORY_LIST.map((category) => [category.path, category.slug]),
);

/** Trailing slashes and query strings are stripped before matching. */
function normalizePath(pathname: string): string {
  const withoutQuery = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) return withoutQuery.slice(0, -1);
  return withoutQuery || "/";
}

export function describePageContext(pathname: string): PageContext {
  const path = normalizePath(pathname);

  if (path === "/") return { kind: "home", pathname: path };

  const applianceMatch = /^\/inventory\/([a-z0-9-]{1,160})$/i.exec(path);
  if (applianceMatch) {
    return { kind: "appliance", pathname: path, applianceSlug: applianceMatch[1].toLowerCase() };
  }

  if (path === "/inventory" || path.startsWith("/inventory/")) {
    return { kind: "inventory", pathname: path };
  }

  const category = CATEGORY_BY_PATH.get(path);
  if (category) return { kind: "category", pathname: path, categorySlug: category };

  const locationMatch = /^\/appliances\/([a-z0-9-]{1,80})$/i.exec(path);
  if (locationMatch) {
    const location = getLocation(locationMatch[1].toLowerCase());
    // An unknown slug is a 404 on the site, so it gets no location claim here
    // either — the assistant must never name a town the business has not
    // published coverage for.
    if (location) return { kind: "location", pathname: path, locationName: location.name };
    return { kind: "other", pathname: path };
  }

  if (path === "/delivery-installation") return { kind: "delivery", pathname: path };
  if (path === "/financing") return { kind: "financing", pathname: path };
  if (path === "/schedule") return { kind: "schedule", pathname: path };
  if (path === "/contact" || path === "/service-areas") return { kind: "contact", pathname: path };
  if (path === "/guides" || path.startsWith("/guides/")) return { kind: "guides", pathname: path };

  return { kind: "other", pathname: path };
}

/** True on surfaces where a floating assistant has no business appearing. */
export function assistantSuppressed(pathname: string): boolean {
  const path = normalizePath(pathname);
  // The admin screen belongs to the inventory tools, and the booking page is
  // already a booking form — a bubble offering to book on top of it is noise.
  return path === "/admin" || path.startsWith("/admin/");
}

/**
 * The opening line.
 *
 * Written per surface because a generic "how can I help?" wastes the one message
 * a shopper reliably reads. `applianceName` is passed only once the appliance
 * has been resolved server-side; the client's optimistic paint omits it and gets
 * the category-level line instead.
 */
export function greetingFor(context: PageContext, applianceName?: string | null): string {
  switch (context.kind) {
    case "appliance":
      return applianceName
        ? `Interested in the ${applianceName}? I can check its current listing status or set up a time for you to come see it.`
        : "Interested in this appliance? I can check its current listing status or set up a time for you to come see it.";
    case "category": {
      const category = context.categorySlug ? CATEGORIES[context.categorySlug] : null;
      if (!category) break;
      return `Looking for a ${category.singular.toLowerCase()}? Tell me your budget or a brand and I'll check what's on the floor.`;
    }
    case "inventory":
      return "Looking for something specific? Tell me the appliance type, brand or budget and I'll narrow it down.";
    case "delivery":
      return "Need delivery? Tell me your ZIP code and which appliance you're considering and we'll get you a real number.";
    case "financing":
      return "Have a financing question? I can point you to the details or set up a time to go through the options.";
    case "schedule":
      return "Booking a visit? I can find you a time, or answer a question about what's in stock first.";
    case "location":
      return context.locationName
        ? `Shopping for appliances in ${context.locationName}? Everything ships from our East Stroudsburg warehouse — I can check stock or quote delivery to you.`
        : "I can check what's in stock or quote delivery to your address.";
    case "contact":
      return "Need directions, hours, or someone to talk to? I can help with all three.";
    case "guides":
      return "Reading up before you buy? I can check what's actually on the floor right now.";
    default:
      break;
  }
  return "Hi! 👋 What can we help you with today?";
}

/** Short line under the header. Same everywhere, so the panel reads consistently. */
export const ASSISTANT_SUBTITLE =
  "Find appliances, check availability, ask about delivery or schedule a visit.";
