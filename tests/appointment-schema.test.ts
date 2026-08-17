import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { appointmentSchema, APPOINTMENT_SLOTS, SMS_CONSENT_TEXT } from "@/lib/appointments/schema";
import { daysFromNow } from "./helpers";

/** Server-side validation. Everything the browser sends is untrusted. */

function parse(input: Record<string, unknown>) {
  return appointmentSchema.safeParse({
    name: "John Smith",
    phone: "(973) 555-1234",
    date: daysFromNow(7),
    time: "14:30",
    ...input,
  });
}

function messageFor(result: ReturnType<typeof parse>, field: string): string | undefined {
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("consent", () => {
  test("defaults to false when the checkbox is absent", () => {
    const result = parse({});
    assert.ok(result.success);
    assert.equal(result.data.smsConsent, false);
  });

  test("is true only when the box was actually ticked", () => {
    assert.equal(parse({ smsConsent: "on" }).data?.smsConsent, true);
    assert.equal(parse({ smsConsent: "" }).data?.smsConsent, false);
    assert.equal(parse({ smsConsent: "off" }).data?.smsConsent, false);
    assert.equal(parse({ smsConsent: "maybe" }).data?.smsConsent, false);
  });

  test("is never required to book", () => {
    const result = parse({});
    assert.ok(result.success, "a booking without consent must still validate");
  });

  test("the stored disclosure names the business and the opt-out keywords", () => {
    assert.match(SMS_CONSENT_TEXT, /KT Appliances/);
    assert.match(SMS_CONSENT_TEXT, /Reply STOP to opt out or HELP for help/);
    assert.match(SMS_CONSENT_TEXT, /Consent is not required/);
  });
});

describe("phone", () => {
  test("accepts common US formats and normalises to ten digits", () => {
    for (const input of ["9735551234", "(973) 555-1234", "973-555-1234", "+1 973 555 1234"]) {
      const result = parse({ phone: input });
      assert.ok(result.success, `${input} should be accepted`);
      assert.equal(result.data.phone, "9735551234");
    }
  });

  test("rejects a number that is not ten digits", () => {
    assert.match(messageFor(parse({ phone: "97355512" }), "phone") ?? "", /10-digit/);
    assert.match(messageFor(parse({ phone: "" }), "phone") ?? "", /phone number/);
  });
});

describe("date and time", () => {
  test("accepts a slot the form actually offers", () => {
    for (const slot of ["10:00", "14:30", "20:30"]) {
      assert.ok(parse({ time: slot }).success, `${slot} should be bookable`);
      assert.ok(APPOINTMENT_SLOTS.includes(slot));
    }
  });

  test("rejects a time outside the published slots", () => {
    // 09:00 is before opening and 21:00 is after the last start - neither is
    // selectable in the UI, so both can only arrive from a crafted request.
    assert.match(messageFor(parse({ time: "09:00" }), "time") ?? "", /available time/);
    assert.match(messageFor(parse({ time: "21:00" }), "time") ?? "", /available time/);
    assert.match(messageFor(parse({ time: "14:17" }), "time") ?? "", /available time/);
  });

  test("rejects a date in the past", () => {
    assert.match(messageFor(parse({ date: daysFromNow(-1) }), "date") ?? "", /at least/);
  });

  test("rejects a date beyond the booking window", () => {
    assert.match(messageFor(parse({ date: daysFromNow(120) }), "date") ?? "", /within the next/);
  });

  test("rejects a calendar date that does not exist", () => {
    assert.ok(!parse({ date: "2026-02-31" }).success);
  });

  test("resolves the slot to a UTC instant plus the business timezone", () => {
    const result = parse({ date: "2026-08-24", time: "14:30" });
    assert.ok(result.success);
    assert.equal(result.data.scheduledFor.toISOString(), "2026-08-24T18:30:00.000Z");
    assert.equal(result.data.timeZone, "America/New_York");
  });
});

describe("other fields", () => {
  test("requires a name", () => {
    assert.match(messageFor(parse({ name: "J" }), "name") ?? "", /Enter your name/);
  });

  test("email and ZIP are optional but validated when present", () => {
    assert.ok(parse({ email: "" }).success);
    assert.ok(parse({ email: "someone@example.com" }).success);
    assert.match(messageFor(parse({ email: "not-an-email" }), "email") ?? "", /valid email/);
    assert.match(messageFor(parse({ zip: "123" }), "zip") ?? "", /5-digit/);
  });

  test("an unknown service type is rejected rather than silently defaulted", () => {
    assert.ok(!parse({ serviceType: "free-appliance" }).success);
  });
});
