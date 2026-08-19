import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { leadSchema } from "@/lib/leads/schema";
import { recordLead } from "@/lib/leads/service";

/**
 * Lead capture, at the two points where a lead can be silently lost.
 *
 * `tests/register.mjs` clears the Supabase and provider credentials before any
 * module loads, so this suite runs against exactly the state a misconfigured
 * production deployment is in: no database, no email. That is the state the
 * form used to report as success.
 */

function validLead(overrides: Record<string, string> = {}) {
  const parsed = leadSchema.safeParse({
    name: "Dana Reyes",
    phone: "(570) 555-0142",
    ...overrides,
  });
  assert.ok(parsed.success, "fixture should be a valid lead");
  return parsed.data;
}

describe("lead attribution", () => {
  it("carries the ad click id through validation", () => {
    const lead = validLead({ clickId: "Cj0KCQjw_TEST_GCLID" });
    assert.equal(lead.clickId, "Cj0KCQjw_TEST_GCLID");
  });

  it("defaults the click id to empty rather than undefined", () => {
    // The insert writes `clickId || null`; an undefined here would become the
    // string "undefined" in some paths and a null in others.
    assert.equal(validLead().clickId, "");
  });

  it("caps a click id long enough to be an attack rather than an attribution", () => {
    const parsed = leadSchema.safeParse({
      name: "Dana Reyes",
      phone: "5705550142",
      clickId: "x".repeat(500),
    });
    assert.equal(parsed.success, false);
  });

  it("normalises a phone number to ten digits regardless of how it was typed", () => {
    assert.equal(validLead({ phone: "+1 (570) 555-0142" }).phone, "5705550142");
    assert.equal(validLead({ phone: "570.555.0142" }).phone, "5705550142");
  });

  it("rejects a phone number the business could not call back", () => {
    const parsed = leadSchema.safeParse({ name: "Dana Reyes", phone: "555" });
    assert.equal(parsed.success, false);
  });
});

describe("recording a lead with nothing configured", () => {
  it("reports failure rather than pretending the warehouse has the number", async () => {
    const result = await recordLead(validLead());

    assert.equal(result.persisted, false, "no database is configured in tests");
    assert.equal(result.notified, false, "no email provider is configured in tests");
    assert.equal(
      result.ok,
      false,
      "with neither a row nor an alert, the customer must be told to call instead",
    );
  });

  it("still returns rather than throwing, so the form can render an error", async () => {
    // The failure has to arrive as a value. A thrown error inside a server
    // action reaches the browser as an opaque digest, and the visitor sees a
    // crash instead of the phone number.
    await assert.doesNotReject(() => recordLead(validLead({ email: "dana@example.com" })));
  });
});
