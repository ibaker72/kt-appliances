import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Structured data.
 *
 * The rule this suite enforces is that schema never claims anything the business
 * has not said. Two failure modes matter most:
 *
 *   NAP DRIFT — the published `telephone` or address diverging from what the
 *   site displays. Google matches the business listing on those strings, and a
 *   mismatch quietly costs local ranking with no error anywhere.
 *
 *   INVENTED TRUST SIGNALS — an `aggregateRating`, a `review`, a second
 *   `PostalAddress` for a town with no building in it. Each is a manual-action
 *   risk and each is exactly what a well-meaning "improve our rich results"
 *   change adds.
 */

const ORIGIN = "https://ktappliances.com";
const PUBLIC_PHONE = "+19735199717";
const TWILIO_SENDER = "+15707500622";

process.env.NEXT_PUBLIC_BUSINESS_PHONE = PUBLIC_PHONE;

const {
  localBusinessSchema,
  websiteSchema,
  breadcrumbSchema,
  faqSchema,
  productSchema,
  itemListSchema,
  locationServiceSchema,
  LOCAL_BUSINESS_ID,
} = await import("@/lib/seo/jsonld");
const { SERVICE_LOCATIONS } = await import("@/lib/content/locations");
const { DEMO_APPLIANCES } = await import("@/lib/inventory/demo-data");

type Json = Record<string, unknown>;

/** Every string value anywhere in a graph, for whole-tree assertions. */
function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) allStrings(item, out);
  else if (value && typeof value === "object") {
    for (const item of Object.values(value)) allStrings(item, out);
  }
  return out;
}

/** Every `@type` anywhere in a graph. */
function allTypes(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) for (const item of value) allTypes(item, out);
  else if (value && typeof value === "object") {
    const type = (value as Json)["@type"];
    if (typeof type === "string") out.push(type);
    if (Array.isArray(type)) out.push(...type.filter((entry): entry is string => typeof entry === "string"));
    for (const item of Object.values(value)) allTypes(item, out);
  }
  return out;
}

describe("LocalBusiness", () => {
  const schema = localBusinessSchema(SERVICE_LOCATIONS) as Json;

  test("publishes the public business line", () => {
    assert.equal(schema.telephone, PUBLIC_PHONE);
  });

  test("the Twilio sending number appears nowhere in the graph", () => {
    // Publishing it as the business phone breaks NAP matching against the
    // Google Business Profile, and it is not a number a customer should dial.
    const strings = allStrings(schema);
    assert.ok(
      !strings.some((value) => value.includes(TWILIO_SENDER) || value.includes("5707500622")),
      "the Twilio sender must never appear in LocalBusiness schema",
    );
  });

  test("the address is complete and is the warehouse", () => {
    const address = schema.address as Json;
    assert.equal(address["@type"], "PostalAddress");
    assert.equal(address.streetAddress, "109 Burson St");
    assert.equal(address.addressLocality, "East Stroudsburg");
    assert.equal(address.addressRegion, "PA");
    assert.equal(address.postalCode, "18301");
    assert.equal(address.addressCountry, "US");
  });

  test("there is exactly one PostalAddress in the graph", () => {
    // A second address would assert a second physical location. The service
    // areas are `City` nodes under `areaServed`, never addresses.
    const addresses = allTypes(schema).filter((type) => type === "PostalAddress");
    assert.equal(addresses.length, 1);
  });

  test("no rating or review is fabricated", () => {
    const types = allTypes(schema);
    assert.ok(!types.includes("AggregateRating"), "no AggregateRating without real reviews");
    assert.ok(!types.includes("Review"));
    assert.equal(schema.aggregateRating, undefined);
    assert.equal(schema.review, undefined);
  });

  test("areaServed names the states and the published towns", () => {
    const areas = schema.areaServed as Json[];
    const names = areas.map((area) => String(area.name));
    for (const state of ["Pennsylvania", "New Jersey", "New York"]) {
      assert.ok(names.includes(state), `areaServed missing ${state}`);
    }
    for (const location of SERVICE_LOCATIONS) {
      assert.ok(
        names.includes(`${location.name}, ${location.state}`),
        `areaServed missing ${location.name}`,
      );
    }
  });

  test("it carries a stable @id the rest of the graph points at", () => {
    assert.equal(schema["@id"], LOCAL_BUSINESS_ID);
    assert.equal(LOCAL_BUSINESS_ID, `${ORIGIN}/#store`);
  });

  test("only real social profiles are listed in sameAs", () => {
    // No profile URLs are configured in the test environment, so `sameAs` must
    // be absent rather than an array of empty strings.
    assert.equal(schema.sameAs, undefined);
  });

  test("the services offered are the ones the business performs", () => {
    const catalog = schema.hasOfferCatalog as Json;
    const offered = (catalog.itemListElement as Json[]).map((offer) =>
      String((offer.itemOffered as Json).name),
    );
    assert.deepEqual(offered, [
      "Appliance delivery",
      "Appliance installation",
      "Old appliance haul-away",
    ]);
  });
});

describe("WebSite", () => {
  const schema = websiteSchema() as Json;

  test("it is published by the one business entity", () => {
    assert.deepEqual(schema.publisher, { "@id": LOCAL_BUSINESS_ID });
  });

  test("the search action points at a real search URL", () => {
    const action = schema.potentialAction as Json;
    const target = action.target as Json;
    assert.match(String(target.urlTemplate), /\/inventory\?q=\{search_term_string\}$/);
  });
});

describe("location Service schema", () => {
  for (const location of SERVICE_LOCATIONS) {
    test(`${location.slug} claims a service area, not a second branch`, () => {
      const schema = locationServiceSchema(location) as Json;
      assert.equal(schema["@type"], "Service");
      // The provider is the one warehouse. No address, no phone, no hours here —
      // those would assert a building in a town where there is none.
      assert.deepEqual(schema.provider, { "@id": LOCAL_BUSINESS_ID });
      assert.equal(schema.address, undefined);
      assert.equal(schema.telephone, undefined);
      assert.equal(schema.openingHoursSpecification, undefined);
      assert.ok(!allTypes(schema).includes("PostalAddress"));

      const area = schema.areaServed as Json;
      assert.equal(area["@type"], "City");
      assert.equal(area.name, `${location.name}, ${location.state}`);
    });
  }
});

describe("BreadcrumbList", () => {
  const schema = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Inventory", path: "/inventory" },
    { name: "Refrigerators", path: "/refrigerators" },
  ]) as Json;

  test("positions are 1-based and sequential", () => {
    const items = schema.itemListElement as Json[];
    assert.deepEqual(
      items.map((item) => item.position),
      [1, 2, 3],
    );
  });

  test("items are absolute URLs", () => {
    const items = schema.itemListElement as Json[];
    for (const item of items) {
      assert.ok(String(item.item).startsWith(`${ORIGIN}/`), `${item.item} is not absolute`);
    }
    assert.equal(items[2].item, `${ORIGIN}/refrigerators`);
  });
});

describe("FAQPage", () => {
  test("questions and answers survive intact", () => {
    const entries = [{ question: "Do you deliver?", answer: "Yes, from East Stroudsburg." }];
    const schema = faqSchema(entries) as Json;
    const main = schema.mainEntity as Json[];
    assert.equal(main[0].name, entries[0].question);
    assert.equal((main[0].acceptedAnswer as Json).text, entries[0].answer);
  });
});

describe("Product and Offer", () => {
  const available = DEMO_APPLIANCES.find((item) => item.status === "available");
  const sold = DEMO_APPLIANCES.find((item) => item.status === "sold");

  test("an available unit is InStock at its real price in USD", () => {
    assert.ok(available, "demo data should contain an available unit");
    const schema = productSchema(available) as Json;
    const offer = schema.offers as Json;
    assert.equal(offer.availability, "https://schema.org/InStock");
    assert.equal(offer.priceCurrency, "USD");
    assert.equal(offer.price, available.price);
    assert.equal(offer.url, `${ORIGIN}/inventory/${available.slug}`);
  });

  test("a sold unit is SoldOut rather than dropped", () => {
    assert.ok(sold, "demo data should contain a sold unit");
    const schema = productSchema(sold) as Json;
    assert.equal((schema.offers as Json).availability, "https://schema.org/SoldOut");
  });

  test("the seller is the one business entity", () => {
    assert.ok(available);
    const offer = productSchema(available).offers as Json;
    assert.deepEqual(offer.seller, { "@id": LOCAL_BUSINESS_ID });
  });

  test("no product invents a rating, a review or a discount", () => {
    for (const appliance of DEMO_APPLIANCES) {
      const schema = productSchema(appliance) as Json;
      assert.equal(schema.aggregateRating, undefined, `${appliance.slug} has an aggregateRating`);
      assert.equal(schema.review, undefined, `${appliance.slug} has a review`);
      const offer = schema.offers as Json;
      // `price` must be the price actually charged. A comparison price belongs
      // in the UI as a struck-through figure, never as the offer price.
      assert.equal(offer.price, appliance.price);
    }
  });

  test("condition maps to a schema.org condition for every unit", () => {
    for (const appliance of DEMO_APPLIANCES) {
      const schema = productSchema(appliance) as Json;
      assert.match(String(schema.itemCondition), /^https:\/\/schema\.org\/\w+Condition$/);
    }
  });
});

describe("ItemList", () => {
  test("positions match the rendered order and URLs are absolute", () => {
    const items = DEMO_APPLIANCES.slice(0, 3);
    const schema = itemListSchema(items, "Test list") as Json;
    assert.equal(schema.numberOfItems, 3);
    const listed = schema.itemListElement as Json[];
    assert.deepEqual(
      listed.map((entry) => entry.position),
      [1, 2, 3],
    );
    assert.equal(listed[0].url, `${ORIGIN}/inventory/${items[0].slug}`);
  });
});
