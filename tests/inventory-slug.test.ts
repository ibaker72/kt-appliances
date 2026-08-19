import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { slugDecision } from "@/lib/admin/inventory-repo";

/**
 * The URL-stability rule.
 *
 * A listing's slug is the address it is advertised at — in Facebook posts, in
 * texts to customers, in Google's index, in the destination URL of a paid ad.
 * The bug this guards against is quiet: the owner fixes a typo in a title, the
 * slug is regenerated from the new title, and every one of those links starts
 * 404ing days later with nothing in the admin to show what happened.
 */
describe("slug decisions on edit", () => {
  it("keeps the existing URL when the slug field is left blank", () => {
    assert.deepEqual(slugDecision("", "whirlpool-french-door-wrx735"), {
      action: "keep",
      slug: "whirlpool-french-door-wrx735",
    });
  });

  it("keeps the existing URL when the field still holds the current slug", () => {
    assert.deepEqual(slugDecision("whirlpool-french-door-wrx735", "whirlpool-french-door-wrx735"), {
      action: "keep",
      slug: "whirlpool-french-door-wrx735",
    });
  });

  it("does not regenerate from a retyped title — only an explicit slug moves the URL", () => {
    // The realistic edit: title corrected, slug field untouched.
    const decision = slugDecision("", "samsung-28-cu-ft-french-door-refrigerator-rf28t5001sr");
    assert.equal(decision.action, "keep");
  });

  it("honours a slug the owner deliberately typed, after normalising it", () => {
    assert.deepEqual(slugDecision("  LG Front Load Washer!! ", "old-slug"), {
      action: "ensure-unique",
      slug: "lg-front-load-washer",
    });
  });

  it("routes a deliberately changed slug through the uniqueness check", () => {
    // Never a bare rename: another unit may already hold that address, and a
    // raw collision surfaces as an unreadable database constraint error.
    const decision = slugDecision("maytag-washer", "maytag-washer-2");
    assert.equal(decision.action, "ensure-unique");
  });

  it("generates a slug only when the record has none", () => {
    assert.deepEqual(slugDecision("", ""), { action: "generate" });
  });
});
