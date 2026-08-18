import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Canonicals and indexability.
 *
 * The faceted inventory browser can produce more URLs than the warehouse has
 * products. Which of them carry a canonical, which carry `noindex`, and which
 * stay followable is a deliberate policy (see `listingMetadata`), and it is the
 * kind of policy that gets quietly undone by an unrelated refactor — a static
 * `metadata` export restored here, a `follow: false` added there — with no
 * visible symptom until traffic drops months later. Pinned here instead.
 */

const ORIGIN = "https://ktappliances.com";

const { pageMetadata, listingMetadata } = await import("@/lib/seo/metadata");
const { listingView } = await import("@/lib/inventory/search-params");
const { categoryMetadata } = await import("@/lib/seo/category-metadata");
const { locationTitle } = await import("@/lib/seo/location-quality");
const { SERVICE_LOCATIONS } = await import("@/lib/content/locations");

type Robots = { index?: boolean; follow?: boolean };

/**
 * Next's `Metadata` types both `robots` and `alternates.canonical` as wide
 * unions covering shapes this codebase never produces. Reading through
 * `unknown` keeps the assertions about the values rather than about the union.
 */
const robotsOf = (meta: object) => (meta as { robots?: unknown }).robots as Robots;
const canonicalOf = (meta: object) =>
  String((meta as { alternates?: { canonical?: unknown } }).alternates?.canonical);

describe("page metadata", () => {
  test("canonicals are absolute and on the canonical origin", () => {
    const meta = pageMetadata({ title: "About", description: "d", path: "/about" });
    assert.equal(canonicalOf(meta), `${ORIGIN}/about`);
  });

  test("an indexable page allows large image previews and full snippets", () => {
    const meta = pageMetadata({ title: "About", description: "d", path: "/about" });
    const robots = robotsOf(meta);
    assert.equal(robots.index, true);
    assert.equal(robots.follow, true);
  });

  test("noindex still follows links by default", () => {
    // A shopper tool must not be indexed, but the crawler should still traverse
    // it to the products it links to.
    const meta = pageMetadata({ title: "Saved", description: "d", path: "/x", noindex: true });
    assert.equal(robotsOf(meta).index, false);
    assert.equal(robotsOf(meta).follow, true);
  });

  test('noindex: "none" drops following too', () => {
    const meta = pageMetadata({ title: "X", description: "d", path: "/x", noindex: "none" });
    assert.equal(robotsOf(meta).index, false);
    assert.equal(robotsOf(meta).follow, false);
  });

  test("a canonical can point somewhere other than the page's own path", () => {
    const meta = pageMetadata({
      title: "Inventory",
      description: "d",
      path: "/inventory",
      canonicalPath: "/refrigerators",
    });
    assert.equal(canonicalOf(meta), `${ORIGIN}/refrigerators`);
  });
});

describe("listing metadata", () => {
  test("the clean listing is indexable and self-canonical", () => {
    const meta = listingMetadata({ title: "T", description: "d", path: "/inventory", filtered: false });
    assert.equal(robotsOf(meta).index, true);
    assert.equal(canonicalOf(meta), `${ORIGIN}/inventory`);
  });

  test("a paginated listing stays indexable and canonicalises to itself", () => {
    // Canonicalising page 2 to page 1 is the common mistake: it hides every
    // product that is only reachable from page 2.
    const meta = listingMetadata({
      title: "T",
      description: "d",
      path: "/inventory",
      filtered: false,
      page: 3,
    });
    assert.equal(robotsOf(meta).index, true);
    assert.equal(canonicalOf(meta), `${ORIGIN}/inventory?page=3`);
    assert.match(String(meta.title), /Page 3/);
  });

  test("a filtered listing is noindex, follow, canonical to the clean URL", () => {
    const meta = listingMetadata({
      title: "T",
      description: "d",
      path: "/refrigerators",
      filtered: true,
      page: 2,
    });
    assert.equal(robotsOf(meta).index, false);
    // `follow` is load-bearing: these are the crawl path to the products.
    assert.equal(robotsOf(meta).follow, true);
    assert.equal(canonicalOf(meta), `${ORIGIN}/refrigerators`);
  });
});

describe("listing view classification", () => {
  test("no parameters is not filtered", () => {
    assert.equal(listingView({}).filtered, false);
  });

  test("pagination alone is not filtered", () => {
    const view = listingView({ page: "4" });
    assert.equal(view.filtered, false);
    assert.equal(view.page, 4);
  });

  for (const params of [
    { q: "lg" },
    { brand: "Samsung" },
    { sort: "price-asc" },
    { min: "200" },
    { condition: "open-box" },
    { fuel: "gas" },
    { warranty: "1" },
    { deals: "1" },
    { status: "sold" },
    { type: "French Door" },
    { color: "Stainless" },
    { cols: "3" },
    { compare: "abc" },
  ]) {
    const key = Object.keys(params)[0];
    test(`?${key}= is treated as a filtered view`, () => {
      assert.equal(listingView(params).filtered, true, `${key} should be filtered`);
    });
  }

  test("an unrecognised parameter does not make a URL filtered", () => {
    // Ad platforms append their own parameters. `?gclid=…` must not knock the
    // landing page out of the index.
    assert.equal(listingView({ gclid: "abc123", utm_source: "google" }).filtered, false);
  });
});

describe("category metadata", () => {
  test("the clean category URL is indexable and self-canonical", () => {
    const meta = categoryMetadata("refrigerators");
    assert.equal(robotsOf(meta).index, true);
    assert.equal(canonicalOf(meta), `${ORIGIN}/refrigerators`);
  });

  test("a filtered category URL canonicalises back to the category", () => {
    const meta = categoryMetadata("washers", { brand: "LG", sort: "price-asc" });
    assert.equal(robotsOf(meta).index, false);
    assert.equal(canonicalOf(meta), `${ORIGIN}/washers`);
  });

  test("every category has a distinct title", () => {
    const slugs = [
      "refrigerators",
      "washers",
      "dryers",
      "washer-dryer-sets",
      "ranges",
      "dishwashers",
      "other",
    ] as const;
    const titles = slugs.map((slug) => String(categoryMetadata(slug).title));
    assert.equal(new Set(titles).size, titles.length, `duplicate category titles: ${titles.join(", ")}`);
  });
});

describe("location metadata", () => {
  test("every location produces a unique canonical URL", () => {
    const paths = SERVICE_LOCATIONS.map((location) => `/appliances/${location.slug}`);
    assert.equal(new Set(paths).size, paths.length);
  });

  test("every location produces a unique title", () => {
    const titles = SERVICE_LOCATIONS.map(locationTitle);
    assert.equal(new Set(titles).size, titles.length, `duplicate location titles: ${titles.join(", ")}`);
  });

  test("location titles name the town and stay a sane length", () => {
    for (const location of SERVICE_LOCATIONS) {
      const title = locationTitle(location);
      assert.ok(title.includes(location.name), `${location.slug} title omits the town name`);
      // The site template appends " | KT Appliances" (16 chars); ~60 total is
      // where Google starts truncating.
      assert.ok(title.length <= 48, `${location.slug} title is ${title.length} chars: "${title}"`);
    }
  });
});
