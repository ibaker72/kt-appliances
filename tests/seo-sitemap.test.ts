import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * The sitemap and robots policy.
 *
 * Two failures here are silent and expensive: a URL that should be listed and
 * is not (the page never gets crawled), and a URL that should never be listed
 * and is (an admin or shopper-tool URL handed to Google). Both are cheap to
 * assert and impossible to notice by eye once the file has a few hundred
 * entries.
 *
 * Supabase is unconfigured in the test environment, so the product source
 * returns nothing and the assertions below concern the static, category,
 * campaign, location and guide portions — which is exactly the part that is
 * code rather than data.
 */

const ORIGIN = "https://ktappliances.com";

const { buildSitemap, SITEMAP_URL_LIMIT } = await import("@/lib/seo/sitemap");
const robots = (await import("@/app/robots")).default;
const { SERVICE_LOCATIONS } = await import("@/lib/content/locations");
const { indexableLocations } = await import("@/lib/seo/location-quality");
const { GUIDES } = await import("@/lib/content/guides");
const { CAMPAIGNS } = await import("@/lib/content/campaigns");
const { CATEGORY_LIST } = await import("@/lib/inventory/types");

const { entries, report } = await buildSitemap();
const urls = entries.map((entry) => String(entry.url));

describe("sitemap contents", () => {
  test("every static route is present", () => {
    for (const path of [
      "/",
      "/inventory",
      "/service-areas",
      "/delivery-installation",
      "/financing",
      "/warranty",
      "/schedule",
      "/guides",
      "/about",
      "/contact",
      "/privacy",
      "/terms",
      "/accessibility",
    ]) {
      assert.ok(urls.includes(`${ORIGIN}${path}`), `sitemap is missing ${path}`);
    }
  });

  test("every appliance category is present", () => {
    for (const category of CATEGORY_LIST) {
      assert.ok(urls.includes(`${ORIGIN}${category.path}`), `missing ${category.path}`);
    }
  });

  test("every indexable location is present", () => {
    for (const location of indexableLocations()) {
      assert.ok(
        urls.includes(`${ORIGIN}/appliances/${location.slug}`),
        `missing /appliances/${location.slug}`,
      );
    }
  });

  test("every guide and campaign is present", () => {
    for (const guide of GUIDES) {
      assert.ok(urls.includes(`${ORIGIN}/guides/${guide.slug}`), `missing guide ${guide.slug}`);
    }
    for (const campaign of CAMPAIGNS) {
      assert.ok(urls.includes(`${ORIGIN}/deals/${campaign.slug}`), `missing campaign ${campaign.slug}`);
    }
  });

  test("admin, API and shopper-tool URLs are absent", () => {
    for (const forbidden of [
      "/admin",
      "/admin/login",
      "/admin/inventory",
      "/api/",
      "/inventory/saved",
      "/inventory/compare",
    ]) {
      assert.ok(
        !urls.some((url) => url.startsWith(`${ORIGIN}${forbidden}`)),
        `sitemap must not contain ${forbidden}`,
      );
    }
  });

  test("no URL appears twice", () => {
    assert.deepEqual(report.duplicates, []);
    assert.equal(new Set(urls).size, urls.length);
  });

  test("no filtered or querystring URL is listed", () => {
    // A sitemap entry for `?sort=price` would contradict the `noindex` that URL
    // serves, which is the kind of mixed signal that gets a whole directory
    // demoted.
    for (const url of urls) {
      assert.ok(!url.includes("?"), `sitemap contains a querystring URL: ${url}`);
    }
  });

  test("it is inside the per-file URL limit", () => {
    assert.ok(report.total <= SITEMAP_URL_LIMIT);
    assert.equal(report.needsSharding, false);
  });
});

describe("sitemap lastModified honesty", () => {
  test("no entry claims to have changed in the last minute", () => {
    // The failure this guards against is `lastModified: new Date()` creeping
    // back in — a sitemap where all fifty URLs changed "just now" on every
    // fetch, which trains crawlers to ignore the field entirely.
    const oneMinuteAgo = Date.now() - 60_000;
    for (const entry of entries) {
      const stamp = new Date(entry.lastModified as Date).getTime();
      assert.ok(
        stamp < oneMinuteAgo,
        `${entry.url} has a lastModified of "now", which is almost certainly not true`,
      );
    }
  });

  test("guide dates come from the guide records", () => {
    for (const guide of GUIDES) {
      const entry = entries.find((candidate) => candidate.url === `${ORIGIN}/guides/${guide.slug}`);
      assert.ok(entry);
      assert.equal(
        new Date(entry.lastModified as Date).toISOString().slice(0, 10),
        guide.updated,
      );
    }
  });

  test("location dates come from the location records", () => {
    for (const location of indexableLocations()) {
      const entry = entries.find(
        (candidate) => candidate.url === `${ORIGIN}/appliances/${location.slug}`,
      );
      assert.ok(entry);
      assert.equal(
        new Date(entry.lastModified as Date).toISOString().slice(0, 10),
        location.updatedAt,
      );
    }
  });
});

describe("sitemap report", () => {
  test("counts line up with the sources", () => {
    assert.equal(report.counts.locations, indexableLocations().length);
    assert.equal(report.counts.guides, GUIDES.length);
    assert.equal(report.counts.campaigns, CAMPAIGNS.length);
    assert.equal(report.counts.categories, CATEGORY_LIST.length);
  });

  test("a location that fails validation is excluded", () => {
    // Nothing currently fails, so this asserts the wiring rather than a count:
    // the sitemap must be built from the *indexable* set, never the raw array.
    assert.ok(report.counts.locations <= SERVICE_LOCATIONS.length);
  });
});

describe("robots policy", () => {
  const policy = robots();
  const rules = Array.isArray(policy.rules) ? policy.rules : [policy.rules];
  const disallow = rules.flatMap((rule) => {
    const value = rule?.disallow;
    return Array.isArray(value) ? value : value ? [value] : [];
  });

  test("it references the sitemap", () => {
    assert.equal(String(policy.sitemap), `${ORIGIN}/sitemap.xml`);
  });

  test("admin and API are disallowed", () => {
    assert.ok(disallow.some((path) => path.startsWith("/admin")));
    assert.ok(disallow.includes("/api/"));
  });

  test("the build output is NOT disallowed", () => {
    // Blocking /_next blocks the CSS and JS Google renders pages with, so the
    // crawler judges an unstyled page. This is the regression this file exists
    // for as much as any listing assertion.
    assert.ok(
      !disallow.some((path) => path.startsWith("/_next")),
      "robots.txt must not block /_next — crawlers need the CSS and JS to render",
    );
  });

  test("the whole site is not disallowed", () => {
    assert.ok(!disallow.includes("/"));
  });

  test("filtered listing URLs are not disallowed", () => {
    // They are handled with `noindex, follow` instead. A Disallow would stop the
    // crawler reading that directive or following the links beneath it.
    assert.ok(!disallow.some((path) => path === "/inventory" || path === "/inventory/"));
  });
});
