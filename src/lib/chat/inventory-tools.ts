import "server-only";

import {
  getApplianceById,
  getApplianceBySlug,
  getCategoryCounts,
  queryInventory,
} from "@/lib/inventory/repository";
import { buildQueryString } from "@/lib/inventory/search-params";
import {
  CATEGORIES,
  CATEGORY_LIST,
  CONDITION_LABELS,
  STATUS_LABELS,
  formatPrice,
  isPurchasable,
  primaryImage,
  type Appliance,
  type ApplianceCategory,
} from "@/lib/inventory/types";
import type { ChatProduct, ChatSearchFilters } from "./types";

/**
 * The assistant's view of inventory.
 *
 * ---------------------------------------------------------------------------
 * WHY A PROJECTION AND NOT THE `Appliance` TYPE
 * ---------------------------------------------------------------------------
 * `Appliance` is the internal record. It is fine on a server-rendered page,
 * where the page decides field by field what to print. It is not fine as a
 * response body: whatever is on that object goes over the wire, into the browser
 * and — when the AI layer is on — into a prompt. Handing the whole record to
 * either is how an internal note or a future `cost` column ends up quoted back
 * to a customer.
 *
 * So every chat surface reads `ChatProduct`, built here by naming each field.
 * The fields that exist on `Appliance` and deliberately do not appear:
 * `cosmeticNotes` and `functionalNotes` (condition prose belongs on the listing
 * page where it has room to be read properly, not summarised in a chat bubble),
 * `sku`, `quantity`, `damageSpots`, `published`, `soldAt`, and the raw
 * timestamps.
 *
 * ---------------------------------------------------------------------------
 * WHAT COUNTS AS VISIBLE
 * ---------------------------------------------------------------------------
 * Search only ever returns `status = 'available'` and `published = true` — the
 * repository enforces `published` and this module pins the status, so a draft,
 * a sold unit or a reserved one can never surface as a suggestion. A direct
 * lookup by slug or id is allowed to return a reserved or sold unit, because the
 * visitor is standing on that listing and asking about it: answering "that one
 * is already sold" is the honest response, and pretending it does not exist is
 * not.
 */

/** Chat results stay short — five cards is already a lot of scrolling in a panel. */
export const CHAT_RESULT_LIMIT = 4;

/** Hard ceiling on anything a caller (or the model) can ask for. */
const MAX_RESULT_LIMIT = 6;

/** Budget bands offered in the structured flow. */
export const CHAT_BUDGET_BANDS = [
  { id: "under-500", label: "Under $500", maxPrice: 499 },
  { id: "under-750", label: "Under $750", maxPrice: 749 },
  { id: "under-1000", label: "Under $1,000", maxPrice: 999 },
  { id: "under-1500", label: "Under $1,500", maxPrice: 1499 },
  { id: "any", label: "Show me everything", maxPrice: undefined },
] as const;

export type ChatBudgetBandId = (typeof CHAT_BUDGET_BANDS)[number]["id"];

export function budgetBand(id: string) {
  return CHAT_BUDGET_BANDS.find((band) => band.id === id) ?? null;
}

/**
 * "What matters most" answers.
 *
 * Each one maps onto a filter or a sort the repository already supports. There
 * is no entry that only reorders the copy — a preference the catalogue cannot
 * actually honour would be a button that does nothing.
 */
export const CHAT_PREFERENCES = [
  { id: "price", label: "Lowest price", sort: "price-asc" as const },
  { id: "savings", label: "Biggest savings", sort: "savings" as const, dealsOnly: true },
  { id: "stainless", label: "Stainless steel", color: "Stainless Steel" },
  { id: "new", label: "New or open-box", conditions: ["new-in-box", "open-box"] as const },
  { id: "scratch", label: "Scratch & dent", conditions: ["scratch-and-dent"] as const },
  { id: "none", label: "No preference" },
] as const;

export type ChatPreferenceId = (typeof CHAT_PREFERENCES)[number]["id"];

export function chatPreference(id: string) {
  return CHAT_PREFERENCES.find((preference) => preference.id === id) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Projection                                                                  */
/* -------------------------------------------------------------------------- */

export function toChatProduct(appliance: Appliance): ChatProduct {
  const image = primaryImage(appliance);
  const category = CATEGORIES[appliance.category];

  return {
    id: appliance.id,
    slug: appliance.slug,
    href: `/inventory/${appliance.slug}`,
    title: appliance.title,
    brand: appliance.brand,
    modelNumber: appliance.modelNumber,
    category: appliance.category,
    categoryLabel: category.singular,
    price: appliance.price,
    priceLabel: formatPrice(appliance.price),
    // Only when a verified comparison price is on record and is genuinely
    // higher — `savingsFor` is the rule, restated here as a label.
    compareAtPriceLabel:
      appliance.compareAtPrice != null && appliance.compareAtPrice > appliance.price
        ? formatPrice(appliance.compareAtPrice)
        : null,
    conditionLabel: CONDITION_LABELS[appliance.condition],
    statusLabel: STATUS_LABELS[appliance.status],
    available: isPurchasable(appliance),
    imageUrl: image?.imageUrl ?? category.artwork,
    imageAlt: image?.altText ?? `${appliance.brand} ${appliance.title}`,
  };
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

export interface ChatSearchResult {
  products: ChatProduct[];
  /** Total matches, not just the ones shown. */
  total: number;
  /** A real, filtered `/inventory` URL for "see them all". Null when there is no more. */
  browseHref: string | null;
  browseLabel: string | null;
  isDemo: boolean;
  /** True when the database could not be reached at all. */
  failed: boolean;
}

const EMPTY_SEARCH: ChatSearchResult = {
  products: [],
  total: 0,
  browseHref: null,
  browseLabel: null,
  isDemo: false,
  failed: false,
};

function clampPrice(value: number | undefined): number | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  if (rounded <= 0) return undefined;
  // Nothing in a scratch-and-dent warehouse costs six figures; a larger number
  // is a typo or a probe, and clamping keeps it from becoming a wide scan.
  return Math.min(rounded, 100_000);
}

/**
 * Runs a shopper's filters against real inventory.
 *
 * Everything is re-derived from the closed sets above — a `preference` string
 * the client made up matches nothing and is simply ignored, rather than being
 * passed to the database.
 */
export async function searchChatInventory(
  filters: ChatSearchFilters,
  limit = CHAT_RESULT_LIMIT,
): Promise<ChatSearchResult> {
  const safeLimit = Math.min(Math.max(1, Math.trunc(limit)), MAX_RESULT_LIMIT);
  const preference = filters.preference ? chatPreference(filters.preference) : null;
  const maxPrice = clampPrice(filters.maxPrice);
  const brand = filters.brand?.trim().slice(0, 60) || undefined;
  const query = filters.query?.trim().slice(0, 80) || undefined;

  try {
    const result = await queryInventory({
      category: filters.category,
      brands: brand ? [brand] : undefined,
      colors:
        preference && "color" in preference && preference.color ? [preference.color] : undefined,
      conditions:
        preference && "conditions" in preference && preference.conditions
          ? [...preference.conditions]
          : undefined,
      dealsOnly:
        preference && "dealsOnly" in preference && preference.dealsOnly ? true : undefined,
      maxPrice,
      search: query,
      // Suggestions are things a shopper can actually buy today. Reserved and
      // sold units are excluded here even though the listing pages show them.
      statuses: ["available"],
      sort: preference && "sort" in preference && preference.sort ? preference.sort : "featured",
      limit: safeLimit,
    });

    const products = result.items.map(toChatProduct);

    // The "see everything" link is a real filtered listing URL, built by the same
    // serialiser the filter UI uses, so it survives a copy-paste and matches what
    // the panel just showed.
    const browseHref =
      result.total > products.length
        ? `${filters.category ? CATEGORIES[filters.category].path : "/inventory"}${buildQueryString({
            brands: brand ? [brand] : undefined,
            colors:
              preference && "color" in preference && preference.color
                ? [preference.color]
                : undefined,
            conditions:
              preference && "conditions" in preference && preference.conditions
                ? [...preference.conditions]
                : undefined,
            dealsOnly:
              preference && "dealsOnly" in preference && preference.dealsOnly ? true : false,
            max: maxPrice,
            q: query,
            sort:
              preference && "sort" in preference && preference.sort ? preference.sort : "featured",
          })}`
        : null;

    return {
      products,
      total: result.total,
      browseHref,
      browseLabel: browseHref ? `View all ${result.total} matches` : null,
      isDemo: result.isDemo,
      failed: false,
    };
  } catch (error) {
    // A database outage must degrade to "I can't check right now", never to a
    // fabricated list. The caller turns `failed` into copy that offers the phone.
    console.error("[chat] inventory search failed:", error);
    return { ...EMPTY_SEARCH, failed: true };
  }
}

/* -------------------------------------------------------------------------- */
/* Single unit                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Resolves one appliance, by slug or by id, straight from the database.
 *
 * The only way the assistant ever learns anything about a specific unit. The
 * panel supplies a slug from the URL it is on, or an id from a card the server
 * itself rendered — and either way this re-reads the row, so price and status in
 * a chat answer are the same ones the listing page would print this second.
 */
export async function getChatAppliance(reference: {
  slug?: string;
  id?: string;
}): Promise<{ product: ChatProduct; appliance: Appliance } | null> {
  const slug = reference.slug?.trim();
  const id = reference.id?.trim();

  const appliance = slug
    ? await getApplianceBySlug(slug)
    : id
      ? await getApplianceById(id)
      : null;

  if (!appliance) return null;
  return { product: toChatProduct(appliance), appliance };
}

/** `"Samsung 27 cu ft French Door (model RF27T5201SR)"` — for an appointment record. */
export function applianceLabelFor(product: ChatProduct): string {
  const model = product.modelNumber ? ` (model ${product.modelNumber})` : "";
  return `${product.brand} ${product.title}${model}`.slice(0, 240);
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export interface ChatCategoryOption {
  slug: ApplianceCategory;
  label: string;
  path: string;
  count: number;
}

/**
 * The appliance types worth offering, with live counts.
 *
 * A category with nothing in it is dropped: offering "Dishwashers" and then
 * answering "we don't have any" is worse than not offering it. If the catalogue
 * is empty or unreachable the full list is returned uncounted, so the flow still
 * works and the search step delivers the honest empty state.
 */
export async function getChatCategories(): Promise<ChatCategoryOption[]> {
  let counts: Record<string, number> = {};
  try {
    counts = await getCategoryCounts();
  } catch (error) {
    console.error("[chat] category counts failed:", error);
  }

  const hasCounts = Object.values(counts).some((count) => count > 0);

  return CATEGORY_LIST.filter((category) => !hasCounts || (counts[category.slug] ?? 0) > 0).map(
    (category) => ({
      slug: category.slug,
      label: category.name,
      path: category.path,
      count: counts[category.slug] ?? 0,
    }),
  );
}
