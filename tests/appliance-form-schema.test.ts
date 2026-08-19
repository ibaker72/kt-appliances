import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applianceFormSchema } from "@/lib/admin/appliance-schema";

/**
 * What the browser actually posts.
 *
 * The regression these guard against cost the whole admin: an unchecked
 * checkbox is not submitted as "false", it is not submitted at all, and a schema
 * that only *accepts* `undefined` without being optional rejects the missing
 * key. Because "Feature on homepage" is unticked by default, that made every
 * new listing unsaveable, and the failure surfaced as "Check the highlighted
 * fields" with no field highlighted.
 *
 * So these tests build payloads the way a form does — omitting what is not
 * filled in — rather than by spreading a complete object.
 */

/** The shortest listing the form allows: five fields and two default selects. */
function minimalPost(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    brand: "Whirlpool",
    category: "refrigerators",
    title: "25 cu. ft. French Door Refrigerator",
    condition: "scratch-and-dent",
    price: "899",
    quantity: "1",
    status: "available",
    fuelType: "",
    ...overrides,
  };
}

describe("appliance form — checkboxes", () => {
  it("saves when every optional toggle is left unticked", () => {
    const parsed = applianceFormSchema.safeParse(minimalPost());
    assert.ok(
      parsed.success,
      `a minimal listing must save; failed on: ${
        parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")
      }`,
    );
  });

  it("reads an absent checkbox as false rather than rejecting it", () => {
    const parsed = applianceFormSchema.parse(minimalPost());
    assert.equal(parsed.featured, false);
    assert.equal(parsed.published, false);
    assert.equal(parsed.warrantyAvailable, false);
    assert.equal(parsed.haulAwayAvailable, false);
  });

  it('reads a ticked checkbox ("on") as true', () => {
    const parsed = applianceFormSchema.parse(
      minimalPost({ featured: "on", published: "on", deliveryAvailable: "on" }),
    );
    assert.equal(parsed.featured, true);
    assert.equal(parsed.published, true);
    assert.equal(parsed.deliveryAvailable, true);
  });
});

describe("appliance form — pricing", () => {
  it("accepts a price typed with a dollar sign and separators", () => {
    assert.equal(applianceFormSchema.parse(minimalPost({ price: "$1,299" })).price, 1299);
  });

  it("treats a blank retail comparison as no comparison at all", () => {
    // Null, never zero: `savingsFor` renders a markdown from any non-null
    // comparison, so a 0 here would advertise an invented discount.
    assert.equal(applianceFormSchema.parse(minimalPost({ compareAtPrice: "" })).compareAtPrice, null);
  });

  it("rejects a retail comparison that is not actually higher", () => {
    const parsed = applianceFormSchema.safeParse(minimalPost({ price: "899", compareAtPrice: "500" }));
    assert.equal(parsed.success, false);
    assert.equal(parsed.success ? "" : parsed.error.issues[0].path[0], "compareAtPrice");
  });

  it("requires a price", () => {
    assert.equal(applianceFormSchema.safeParse(minimalPost({ price: "" })).success, false);
  });

  it("requires a product name long enough to be one", () => {
    assert.equal(applianceFormSchema.safeParse(minimalPost({ title: "TV" })).success, false);
  });

  it("rejects a category that is not one of ours", () => {
    assert.equal(applianceFormSchema.safeParse(minimalPost({ category: "fridges" })).success, false);
  });
});
