import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * The programmatic-SEO quality gate.
 *
 * This is the suite that matters most in this whole area, because the failure it
 * prevents does not look like a failure. Adding a town to `SERVICE_LOCATIONS` is
 * one object literal, and the route, the sitemap entry, the hub card and the
 * schema all appear for free. That is the point of the architecture and it is
 * also how a site grows fifty doorway pages: nothing errors, nothing looks
 * broken, and six months later the whole directory is demoted.
 *
 * So the bar is asserted, not documented. The fixtures below are the shapes a
 * hurried addition actually takes — a name and one sentence, a copy-paste of a
 * neighbouring town with the name swapped, a missing ZIP — and each must fail.
 */

const {
  validateLocation,
  isIndexable,
  indexableLocations,
  auditLocations,
  duplicateSlugs,
  copyOverlapRatio,
  locationTitle,
  LOCATION_THRESHOLDS,
} = await import("@/lib/seo/location-quality");
const { SERVICE_LOCATIONS, getLocation, nearbyLocations, servedZips, locationFaqs } = await import(
  "@/lib/content/locations"
);

type Location = (typeof SERVICE_LOCATIONS)[number];

/** A record that clears every threshold, used as the base for each fixture. */
function goodLocation(overrides: Partial<Location> = {}): Location {
  return {
    slug: "testville-pa",
    name: "Testville",
    state: "PA",
    county: "Monroe County",
    tier: "close",
    distance: "About 15 minutes from the warehouse",
    driveMinutes: 15,
    zips: ["18999"],
    summary: "A short run from the warehouse with straightforward truck access.",
    intro:
      "Testville is reached on a single road from the warehouse, which keeps the delivery quote at the lower end and makes collecting a unit yourself realistic if you have a trailer. The run is short enough that timing can usually be confirmed on the day you call rather than a week out.",
    quickAnswer:
      "Yes. KT Appliances delivers to Testville, PA from the warehouse fifteen minutes away, and the quote depends on the appliance and whether installation is added.",
    logistics: [
      "Short delivery run, quoted at the lower end of the range.",
      "Pickup is a fifteen minute drive on a single road.",
      "Installation and haul-away can be booked on the same trip.",
    ],
    localNotes: [
      "Ribbon development along the highway means most driveways are long gravel runs.",
      "Kitchens here were mostly fitted in the eighties, so cabinet openings run narrow.",
      "Septic systems are usual, which changes what a dishwasher install involves.",
    ],
    updatedAt: "2026-08-18",
    ...overrides,
  } as Location;
}

describe("published service areas", () => {
  test("every published location clears the bar", () => {
    const issues = auditLocations().filter((issue) => issue.severity === "error");
    assert.deepEqual(
      issues,
      [],
      `published locations must all be indexable:\n${issues.map((issue) => `  ${issue.slug}.${issue.field}: ${issue.message}`).join("\n")}`,
    );
  });

  test("no location record raises even a warning", () => {
    const warnings = auditLocations().filter((issue) => issue.severity === "warning");
    assert.deepEqual(warnings, []);
  });

  test("slugs are unique", () => {
    assert.deepEqual(duplicateSlugs(), []);
  });

  test("indexableLocations returns the full published set", () => {
    assert.equal(indexableLocations().length, SERVICE_LOCATIONS.length);
  });

  test("every location has at least one valid ZIP", () => {
    for (const location of SERVICE_LOCATIONS) {
      assert.ok(location.zips.length > 0, `${location.slug} has no ZIP`);
      for (const zip of location.zips) assert.match(zip, /^\d{5}$/);
    }
  });

  test("ZIP codes are not claimed by two towns", () => {
    const all = SERVICE_LOCATIONS.flatMap((location) => location.zips);
    assert.equal(new Set(all).size, all.length, "two locations claim the same ZIP code");
    assert.deepEqual(servedZips(), [...new Set(all)].sort());
  });

  test("every state is one the business actually serves", () => {
    for (const location of SERVICE_LOCATIONS) {
      assert.ok(["PA", "NJ", "NY"].includes(location.state));
    }
  });

  test("nearby-area links all resolve to published pages", () => {
    for (const location of SERVICE_LOCATIONS) {
      for (const slug of location.nearbyAreas ?? []) {
        assert.ok(getLocation(slug), `${location.slug} links to unknown location ${slug}`);
      }
      assert.ok(!nearbyLocations(location).some((entry) => entry.slug === location.slug));
    }
  });

  test("no two locations share meaningfully identical copy", () => {
    for (const a of SERVICE_LOCATIONS) {
      for (const b of SERVICE_LOCATIONS) {
        if (a.slug === b.slug) continue;
        const overlap = copyOverlapRatio(a, b);
        assert.ok(
          overlap <= LOCATION_THRESHOLDS.maxOverlapRatio,
          `${a.slug} and ${b.slug} share ${Math.round(overlap * 100)}% of their distinctive wording`,
        );
      }
    }
  });
});

describe("thin records are rejected", () => {
  test("the canonical thin record — a name and one sentence — fails", () => {
    // This exact shape is the one the whole gate exists for.
    const thin = { name: "Town A", intro: "We sell appliances in Town A" } as unknown as Location;
    assert.equal(isIndexable(thin, SERVICE_LOCATIONS), false);
  });

  test("a missing ZIP fails", () => {
    const issues = validateLocation(goodLocation({ zips: [] }), SERVICE_LOCATIONS);
    assert.ok(issues.some((issue) => issue.field === "zips" && issue.severity === "error"));
  });

  test("a malformed ZIP fails", () => {
    const issues = validateLocation(goodLocation({ zips: ["1899"] }), SERVICE_LOCATIONS);
    assert.ok(issues.some((issue) => issue.field === "zips"));
  });

  test("too few logistics points fails", () => {
    const issues = validateLocation(
      goodLocation({ logistics: ["We deliver here."] }),
      SERVICE_LOCATIONS,
    );
    assert.ok(issues.some((issue) => issue.field === "logistics"));
  });

  test("too few local notes fails", () => {
    const issues = validateLocation(
      goodLocation({ localNotes: ["It is a nice town."] }),
      SERVICE_LOCATIONS,
    );
    assert.ok(issues.some((issue) => issue.field === "localNotes"));
  });

  test("a stub intro fails", () => {
    const issues = validateLocation(
      goodLocation({ intro: "We deliver appliances to Testville." }),
      SERVICE_LOCATIONS,
    );
    assert.ok(issues.some((issue) => issue.field === "intro"));
  });

  test("a quick answer that does not name the town fails", () => {
    const issues = validateLocation(
      goodLocation({
        quickAnswer:
          "Yes, we deliver there from the warehouse and the quote depends on the appliance and whether installation is added to the order.",
      }),
      SERVICE_LOCATIONS,
    );
    assert.ok(issues.some((issue) => issue.field === "quickAnswer"));
  });

  test("a malformed slug fails", () => {
    for (const slug of ["Testville PA", "testville", "testville_pa", "/testville-pa"]) {
      const issues = validateLocation(goodLocation({ slug }), SERVICE_LOCATIONS);
      assert.ok(
        issues.some((issue) => issue.field === "slug"),
        `"${slug}" should be rejected`,
      );
    }
  });

  test("a slug whose state does not match the record fails", () => {
    const issues = validateLocation(
      goodLocation({ slug: "testville-nj", state: "PA" }),
      SERVICE_LOCATIONS,
    );
    assert.ok(issues.some((issue) => issue.field === "slug"));
  });

  test("an unserved state fails", () => {
    const issues = validateLocation(
      goodLocation({ state: "CA" as Location["state"], slug: "testville-ca" }),
      SERVICE_LOCATIONS,
    );
    assert.ok(issues.some((issue) => issue.field === "state"));
  });

  test("a missing or malformed updatedAt fails", () => {
    for (const updatedAt of ["", "August 2026", "2026-13-45"]) {
      const issues = validateLocation(goodLocation({ updatedAt }), SERVICE_LOCATIONS);
      assert.ok(
        issues.some((issue) => issue.field === "updatedAt"),
        `"${updatedAt}" should be rejected`,
      );
    }
  });

  test("a duplicate title fails", () => {
    const existing = SERVICE_LOCATIONS[1];
    const clash = goodLocation({ seo: { title: locationTitle(existing) } });
    const issues = validateLocation(clash, SERVICE_LOCATIONS);
    assert.ok(issues.some((issue) => issue.field === "seo.title"));
  });

  test("a nearby-area link to an unknown town warns but does not de-index", () => {
    const location = goodLocation({ nearbyAreas: ["nowhere-pa"] });
    const issues = validateLocation(location, SERVICE_LOCATIONS);
    const issue = issues.find((entry) => entry.field === "nearbyAreas");
    assert.ok(issue);
    assert.equal(issue.severity, "warning");
    assert.equal(isIndexable(location, SERVICE_LOCATIONS), true);
  });
});

describe("city-name swaps are rejected", () => {
  test("copying a published town's copy and changing the name fails", () => {
    // The specific spam pattern: real prose, real length, every threshold met —
    // and word for word another town's page.
    const source = SERVICE_LOCATIONS[3];
    const swapped = {
      ...source,
      slug: "clonetown-pa",
      name: "Clonetown",
      zips: ["18888"],
      seo: { title: "Appliances Delivered to Clonetown, PA" },
      quickAnswer: source.quickAnswer.replaceAll(source.name, "Clonetown"),
      intro: source.intro.replaceAll(source.name, "Clonetown"),
      summary: source.summary.replaceAll(source.name, "Clonetown"),
    } as Location;

    const issues = validateLocation(swapped, [...SERVICE_LOCATIONS, swapped]);
    assert.ok(
      issues.some((issue) => issue.field === "copy" && issue.severity === "error"),
      "a name-swapped clone must be caught by the duplicate-copy check",
    );
    assert.equal(isIndexable(swapped, [...SERVICE_LOCATIONS, swapped]), false);
  });

  test("the overlap measure is high for a clone and low for real pages", () => {
    const source = SERVICE_LOCATIONS[0];
    const clone = { ...source, slug: "clone-pa", name: "Clone" } as Location;
    assert.ok(copyOverlapRatio(clone, source) > LOCATION_THRESHOLDS.maxOverlapRatio);
    assert.ok(copyOverlapRatio(SERVICE_LOCATIONS[0], SERVICE_LOCATIONS[4]) <= LOCATION_THRESHOLDS.maxOverlapRatio);
  });
});

describe("location FAQs", () => {
  test("every location's answers name the town", () => {
    for (const location of SERVICE_LOCATIONS) {
      for (const faq of locationFaqs(location)) {
        assert.ok(
          faq.question.includes(location.name) || faq.answer.includes(location.name),
          `${location.slug}: "${faq.question}" is not specific to the town`,
        );
      }
    }
  });

  test("no two locations produce an identical question set", () => {
    const sets = SERVICE_LOCATIONS.map((location) =>
      locationFaqs(location)
        .map((faq) => faq.question)
        .join("|"),
    );
    assert.equal(new Set(sets).size, sets.length);
  });

  test("the delivery answer opens with the direct answer", () => {
    for (const location of SERVICE_LOCATIONS) {
      const [first] = locationFaqs(location);
      assert.match(first.question, /^Does KT Appliances deliver to /);
      assert.match(first.answer, /^Yes\./, `${location.slug} does not answer the question first`);
    }
  });

  test("the public phone number is the one offered, and never the Twilio sender", () => {
    for (const location of SERVICE_LOCATIONS) {
      const text = locationFaqs(location)
        .map((faq) => faq.answer)
        .join(" ");
      assert.ok(text.includes("(973) 519-9717"));
      assert.ok(!text.includes("750-0622"));
    }
  });
});
