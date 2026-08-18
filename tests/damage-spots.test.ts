import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * The damage-spot data path: what the jsonb column may hold, what the admin
 * editor may save, and the honesty rule that absence of data renders nothing.
 */

const { parseDamageSpots } = await import("@/lib/inventory/types");
const { damageSpotsSchema, MAX_DAMAGE_SPOTS } = await import("@/lib/admin/appliance-schema");
const { DEMO_APPLIANCES } = await import("@/lib/inventory/demo-data");

describe("parseDamageSpots", () => {
  test("passes well-formed spots through", () => {
    const spots = parseDamageSpots([
      { x: 0.25, y: 0.5, label: "Dent, lower left door — 2 inches", imageId: "img-1" },
    ]);
    assert.deepEqual(spots, [
      { x: 0.25, y: 0.5, label: "Dent, lower left door — 2 inches", imageId: "img-1" },
    ]);
  });

  test("clamps coordinates into the photo box", () => {
    const [spot] = parseDamageSpots([{ x: -0.4, y: 1.7, label: "Scuff" }]);
    assert.equal(spot.x, 0);
    assert.equal(spot.y, 1);
  });

  test("drops entries without a usable label rather than rendering wrong", () => {
    const spots = parseDamageSpots([
      { x: 0.5, y: 0.5, label: "   " },
      { x: 0.5, y: 0.5 },
      { x: "left", y: 0.5, label: "Dent" },
      null,
      "junk",
      { x: 0.1, y: 0.1, label: "Real dent" },
    ]);
    assert.equal(spots.length, 1);
    assert.equal(spots[0].label, "Real dent");
  });

  test("a malformed column yields an empty array, which renders nothing", () => {
    assert.deepEqual(parseDamageSpots(null), []);
    assert.deepEqual(parseDamageSpots("not json"), []);
    assert.deepEqual(parseDamageSpots({ x: 0.5 }), []);
  });

  test("normalizes an absent close-up reference to null", () => {
    const [spot] = parseDamageSpots([{ x: 0.5, y: 0.5, label: "Dent", imageId: "" }]);
    assert.equal(spot.imageId, null);
  });
});

describe("damageSpotsSchema (admin save path)", () => {
  test("an empty array is a valid save — it clears the map", () => {
    assert.ok(damageSpotsSchema.safeParse([]).success);
  });

  test("rejects a spot without a real description", () => {
    const result = damageSpotsSchema.safeParse([{ x: 0.5, y: 0.5, label: "ok" }]);
    assert.equal(result.success, false);
  });

  test("rejects out-of-range coordinates instead of guessing", () => {
    const result = damageSpotsSchema.safeParse([{ x: 1.5, y: 0.5, label: "Dent on top" }]);
    assert.equal(result.success, false);
  });

  test("caps the number of spots", () => {
    const many = Array.from({ length: MAX_DAMAGE_SPOTS + 1 }, (_, index) => ({
      x: 0.5,
      y: 0.5,
      label: `Spot number ${index}`,
    }));
    assert.equal(damageSpotsSchema.safeParse(many).success, false);
    assert.ok(damageSpotsSchema.safeParse(many.slice(0, MAX_DAMAGE_SPOTS)).success);
  });
});

describe("honesty guard", () => {
  test("every appliance carries damageSpots, defaulting to the empty array", () => {
    for (const appliance of DEMO_APPLIANCES) {
      assert.ok(Array.isArray(appliance.damageSpots), `${appliance.slug} lacks damageSpots`);
    }
  });

  test("a demo unit with spots tells the same story as its cosmetic notes", () => {
    const withSpots = DEMO_APPLIANCES.filter((appliance) => appliance.damageSpots.length > 0);
    for (const appliance of withSpots) {
      assert.ok(
        appliance.cosmeticNotes && appliance.cosmeticNotes.length > 0,
        `${appliance.slug} has damage spots but no cosmetic notes — the map must never say more than the listing text`,
      );
    }
  });
});
