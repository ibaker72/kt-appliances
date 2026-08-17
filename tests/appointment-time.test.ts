import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  formatAppointmentDateTime,
  formatAppointmentShort,
  formatAppointmentTime,
  formatSlotLabel,
  wallTimeToUtc,
} from "@/lib/appointments/time";

/**
 * Timezone handling.
 *
 * The warehouse keeps New York wall-clock hours; the server does not. Every one
 * of these cases is a way an appointment could otherwise be stored or displayed
 * an hour or a day away from the slot the customer picked.
 */

describe("wall time to UTC", () => {
  test("converts a summer slot at EDT (-04:00)", () => {
    assert.equal(wallTimeToUtc("2026-08-24", "14:30")?.toISOString(), "2026-08-24T18:30:00.000Z");
  });

  test("converts a winter slot at EST (-05:00)", () => {
    assert.equal(wallTimeToUtc("2026-01-12", "10:00")?.toISOString(), "2026-01-12T15:00:00.000Z");
  });

  test("handles the slot either side of the spring-forward transition", () => {
    // 2026-03-08: clocks jump 02:00 -> 03:00 local.
    assert.equal(wallTimeToUtc("2026-03-08", "01:30")?.toISOString(), "2026-03-08T06:30:00.000Z");
    assert.equal(wallTimeToUtc("2026-03-08", "03:30")?.toISOString(), "2026-03-08T07:30:00.000Z");
  });

  test("handles the ambiguous hour at fall-back without drifting a day", () => {
    // 2026-11-01: 01:00-02:00 local happens twice. Either instant is defensible;
    // what matters is that it stays on 1 November and inside that hour.
    const resolved = wallTimeToUtc("2026-11-01", "01:30");
    assert.ok(resolved);
    assert.match(resolved.toISOString(), /^2026-11-01T0[56]:30:00\.000Z$/);
  });

  test("round-trips: a converted instant formats back to the slot that was picked", () => {
    for (const [date, time, label] of [
      ["2026-08-24", "14:30", "2:30 PM"],
      ["2026-01-12", "10:00", "10:00 AM"],
      ["2026-12-31", "20:30", "8:30 PM"],
    ] as const) {
      const instant = wallTimeToUtc(date, time);
      assert.ok(instant);
      assert.equal(formatAppointmentTime(instant), label, `${date} ${time}`);
    }
  });

  test("rejects malformed and non-existent dates", () => {
    assert.equal(wallTimeToUtc("not-a-date", "14:30"), null);
    assert.equal(wallTimeToUtc("2026-08-24", "2:30"), null);
    assert.equal(wallTimeToUtc("2026-02-31", "10:00"), null, "February 31 must not roll into March");
    assert.equal(wallTimeToUtc("2026-13-01", "10:00"), null);
    assert.equal(wallTimeToUtc("2026-08-24", "25:00"), null);
  });
});

describe("display formats", () => {
  const instant = wallTimeToUtc("2026-08-24", "14:30") as Date;

  test("long form reads as a person would say it", () => {
    assert.equal(formatAppointmentDateTime(instant), "Monday, August 24 at 2:30 PM");
  });

  test("short form is compact enough for the owner's alert", () => {
    assert.equal(formatAppointmentShort(instant), "Mon, Aug 24 at 2:30 PM");
  });

  test("accepts an ISO string as well as a Date, since the database returns strings", () => {
    assert.equal(
      formatAppointmentDateTime(instant.toISOString()),
      "Monday, August 24 at 2:30 PM",
    );
  });

  test("uses a plain space before AM/PM, not U+202F", () => {
    const formatted = formatAppointmentTime(instant);
    assert.equal(formatted, "2:30 PM");
    assert.doesNotMatch(formatted, /[\u202f\u00a0]/);
  });

  test("degrades to an empty string rather than 'Invalid Date'", () => {
    assert.equal(formatAppointmentDateTime("nonsense"), "");
    assert.equal(formatAppointmentTime("nonsense"), "");
  });
});

describe("slot labels", () => {
  test("renders 24-hour slots as 12-hour labels", () => {
    assert.equal(formatSlotLabel("10:00"), "10:00 AM");
    assert.equal(formatSlotLabel("12:00"), "12:00 PM");
    assert.equal(formatSlotLabel("12:30"), "12:30 PM");
    assert.equal(formatSlotLabel("17:00"), "5:00 PM");
    assert.equal(formatSlotLabel("20:30"), "8:30 PM");
  });

  test("passes anything unrecognised straight through", () => {
    assert.equal(formatSlotLabel("nope"), "nope");
  });
});
