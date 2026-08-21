import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  applianceLabelFor,
  budgetBand,
  chatPreference,
  getChatAppliance,
  getChatCategories,
  searchChatInventory,
  toChatProduct,
} from "@/lib/chat/inventory-tools";
import { DEMO_APPLIANCES } from "@/lib/inventory/demo-data";
import type { Appliance } from "@/lib/inventory/types";

/**
 * What the assistant is allowed to know about inventory.
 *
 * The suite runs with no Supabase credentials (see `tests/register.mjs`), so the
 * repository serves the sample catalogue — which is what makes these assertions
 * meaningful: it contains sold units, and every test below proves they do not
 * reach a shopper as a suggestion.
 *
 * The projection test is the important one. It asserts an exact key set rather
 * than "does not contain X", because the failure this guards against is a future
 * column being added to `appliances` and quietly riding along into a chat
 * response. A whitelist breaks when that happens; a blacklist does not.
 */

const soldSeed = DEMO_APPLIANCES.find((item) => item.status === "sold");

describe("chat product projection", () => {
  test("exposes exactly the public fields and nothing else", () => {
    const product = toChatProduct(DEMO_APPLIANCES[0]);

    assert.deepEqual(
      Object.keys(product).sort(),
      [
        "available",
        "brand",
        "categoryLabel",
        "category",
        "compareAtPriceLabel",
        "conditionLabel",
        "href",
        "id",
        "imageAlt",
        "imageUrl",
        "modelNumber",
        "price",
        "priceLabel",
        "slug",
        "statusLabel",
        "title",
      ].sort(),
    );
  });

  test("carries no internal or condition-prose fields", () => {
    const product = toChatProduct(DEMO_APPLIANCES[0]) as unknown as Record<string, unknown>;

    for (const field of [
      "cosmeticNotes",
      "functionalNotes",
      "damageSpots",
      "quantity",
      "sku",
      "published",
      "soldAt",
      "createdAt",
      "updatedAt",
      "images",
      "isDemo",
    ]) {
      assert.equal(product[field], undefined, `${field} must not reach the browser`);
    }
  });

  test("never invents a comparison price", () => {
    const withoutCompare: Appliance = { ...DEMO_APPLIANCES[0], compareAtPrice: null };
    assert.equal(toChatProduct(withoutCompare).compareAtPriceLabel, null);

    // A comparison price that is not actually higher is not a saving.
    const notASaving: Appliance = {
      ...DEMO_APPLIANCES[0],
      price: 900,
      compareAtPrice: 900,
    };
    assert.equal(toChatProduct(notASaving).compareAtPriceLabel, null);
  });

  test("marks a sold unit as unavailable", () => {
    assert.ok(soldSeed, "sample catalogue must contain a sold unit");
    const product = toChatProduct(soldSeed);
    assert.equal(product.available, false);
    assert.equal(product.statusLabel, "Sold");
  });
});

describe("search", () => {
  test("returns only units that are available to buy", async () => {
    const result = await searchChatInventory({}, 6);

    assert.ok(result.products.length > 0, "sample catalogue should produce matches");
    for (const product of result.products) {
      assert.equal(product.available, true);
      assert.equal(product.statusLabel, "Available");
    }
  });

  test("excludes sold inventory from suggestions", async () => {
    assert.ok(soldSeed);
    const result = await searchChatInventory({ category: soldSeed.category }, 6);
    assert.ok(
      !result.products.some((product) => product.slug === soldSeed.slug),
      "a sold unit must never be suggested",
    );
  });

  test("honours the category filter", async () => {
    const result = await searchChatInventory({ category: "refrigerators" }, 6);
    assert.ok(result.products.length > 0);
    for (const product of result.products) {
      assert.equal(product.category, "refrigerators");
    }
  });

  test("honours the budget filter", async () => {
    const band = budgetBand("under-1000");
    assert.ok(band?.maxPrice);

    const result = await searchChatInventory(
      { category: "refrigerators", maxPrice: band.maxPrice },
      6,
    );
    assert.ok(result.products.length > 0);
    for (const product of result.products) {
      assert.ok(
        product.price <= band.maxPrice,
        `${product.title} at ${product.price} exceeds the ${band.maxPrice} budget`,
      );
    }
  });

  test("an unrecognised preference is ignored rather than passed through", async () => {
    assert.equal(chatPreference("definitely-not-real"), null);

    const withJunk = await searchChatInventory(
      { category: "washers", preference: "definitely-not-real" },
      6,
    );
    const withNone = await searchChatInventory({ category: "washers" }, 6);

    assert.deepEqual(
      withJunk.products.map((product) => product.slug),
      withNone.products.map((product) => product.slug),
    );
  });

  test("caps the number of results regardless of what is asked for", async () => {
    const result = await searchChatInventory({}, 999);
    assert.ok(result.products.length <= 6, "the hard ceiling must hold");
  });

  test("an impossible budget returns an honest empty result, not a substitute", async () => {
    const result = await searchChatInventory({ category: "refrigerators", maxPrice: 1 }, 6);
    assert.equal(result.products.length, 0);
    assert.equal(result.failed, false);
  });

  test("the browse link is a real filtered listing URL", async () => {
    const result = await searchChatInventory({ category: "refrigerators" }, 1);
    if (!result.browseHref) return; // Only when there is more to see.
    assert.ok(result.browseHref.startsWith("/refrigerators"));
  });
});

describe("single unit lookup", () => {
  test("resolves a published unit by slug", async () => {
    const seed = DEMO_APPLIANCES[0];
    const resolved = await getChatAppliance({ slug: seed.slug });
    assert.ok(resolved);
    assert.equal(resolved.product.slug, seed.slug);
    assert.equal(resolved.product.priceLabel, `$${seed.price.toLocaleString("en-US")}`);
  });

  test("resolves by id", async () => {
    const seed = DEMO_APPLIANCES[0];
    const resolved = await getChatAppliance({ id: seed.id });
    assert.ok(resolved);
    assert.equal(resolved.product.id, seed.id);
  });

  test("returns nothing for an unknown reference", async () => {
    assert.equal(await getChatAppliance({ slug: "not-a-real-appliance" }), null);
    assert.equal(await getChatAppliance({ id: "00000000-0000-0000-0000-000000000000" }), null);
    assert.equal(await getChatAppliance({}), null);
  });

  test("a sold unit is still resolvable, so the answer can be honest", async () => {
    assert.ok(soldSeed);
    const resolved = await getChatAppliance({ slug: soldSeed.slug });
    assert.ok(resolved, "a shopper standing on a sold listing must get an answer about it");
    assert.equal(resolved.product.available, false);
  });

  test("the appointment label names brand, title and model", () => {
    const seed = DEMO_APPLIANCES[0];
    const label = applianceLabelFor(toChatProduct(seed));
    assert.ok(label.includes(seed.brand));
    assert.ok(label.includes(seed.title));
    if (seed.modelNumber) assert.ok(label.includes(seed.modelNumber));
    assert.ok(label.length <= 240);
  });
});

describe("categories", () => {
  test("only offers categories that have stock", async () => {
    const categories = await getChatCategories();
    assert.ok(categories.length > 0);
    for (const category of categories) {
      assert.ok(category.count > 0, `${category.label} was offered with nothing in it`);
      assert.ok(category.path.startsWith("/"));
    }
  });
});
