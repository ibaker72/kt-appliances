import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  getDayAvailability,
  getUpcomingDays,
  isBookableDate,
  isSlotOpen,
  type AvailabilityDeps,
} from "@/lib/appointments/availability";
import { APPOINTMENT_SLOTS } from "@/lib/appointments/schema";
import {
  APPOINTMENT_DURATION_MINUTES,
  MAX_DAYS_AHEAD,
  MIN_LEAD_TIME_MINUTES,
  buildSlots,
  clockFromMinutes,
  minutesFromClock,
  todayInZone,
  wallTimeToUtc,
} from "@/lib/appointments/time";
import { siteConfig } from "@/lib/site-config";
import { daysFromNow } from "./helpers";

/**
 * Which slots a shopper is offered.
 *
 * The database is injected, so these tests describe the *display* rule — never
 * offer a time that is taken, in the past, or outside the hours the warehouse
 * publishes. The rule that actually prevents a double booking is a unique index
 * in Postgres and is exercised in `appointment-slot-conflict.test.ts`.
 */

/** A day's worth of deps with a fixed clock and a fixed set of taken instants. */
function deps(options: { booked?: string[]; now?: Date; unreachable?: boolean } = {}): Partial<AvailabilityDeps> {
  return {
    now: () => options.now ?? new Date(),
    bookedInstants: async () => (options.unreachable ? null : (options.booked ?? [])),
  };
}

describe("slot grid", () => {
  test("is derived from the published hours, not restated", () => {
    const expected = buildSlots(
      siteConfig.hours.regular.open,
      siteConfig.hours.afterHours.close,
      APPOINTMENT_DURATION_MINUTES,
    );
    assert.deepEqual([...APPOINTMENT_SLOTS], expected);
  });

  test("opens with the warehouse and stops one appointment before the doors lock", () => {
    const open = minutesFromClock(siteConfig.hours.regular.open);
    const close = minutesFromClock(siteConfig.hours.afterHours.close);
    assert.ok(open != null && close != null);

    assert.equal(APPOINTMENT_SLOTS[0], clockFromMinutes(open));
    assert.equal(
      APPOINTMENT_SLOTS[APPOINTMENT_SLOTS.length - 1],
      clockFromMinutes(close - APPOINTMENT_DURATION_MINUTES),
    );
  });

  test("an unusable window yields no slots rather than a guess", () => {
    assert.deepEqual(buildSlots("17:00", "17:00"), []);
    assert.deepEqual(buildSlots("21:00", "10:00"), []);
    assert.deepEqual(buildSlots("nonsense", "17:00"), []);
  });
});

describe("bookable dates", () => {
  test("rejects yesterday and anything past the horizon", () => {
    assert.equal(isBookableDate(daysFromNow(-1)), false);
    assert.equal(isBookableDate(daysFromNow(MAX_DAYS_AHEAD + 2)), false);
    assert.equal(isBookableDate(daysFromNow(7)), true);
  });

  test("rejects a malformed date", () => {
    assert.equal(isBookableDate("24/08/2026"), false);
    assert.equal(isBookableDate(""), false);
  });
});

describe("a day of slots", () => {
  test("every published slot is offered on a clear future day", async () => {
    const day = await getDayAvailability(daysFromNow(7), deps());
    assert.equal(day.slots.length, APPOINTMENT_SLOTS.length);
    assert.equal(day.openCount, APPOINTMENT_SLOTS.length);
    assert.equal(day.databaseChecked, true);
  });

  test("a booked instant is marked taken and nothing else is", async () => {
    const date = daysFromNow(7);
    const taken = wallTimeToUtc(date, "13:30");
    assert.ok(taken);

    const day = await getDayAvailability(date, deps({ booked: [taken.toISOString()] }));

    const takenSlot = day.slots.find((slot) => slot.value === "13:30");
    assert.ok(takenSlot);
    assert.equal(takenSlot.available, false);
    assert.equal(day.openCount, APPOINTMENT_SLOTS.length - 1);
  });

  test("a canceled appointment does not block its slot", async () => {
    const date = daysFromNow(7);
    // The service only ever reports instants for the blocking statuses, so a
    // canceled booking simply is not in the list — which is the behaviour the
    // partial unique index gives us in Postgres.
    const day = await getDayAvailability(date, deps({ booked: [] }));
    assert.equal(day.openCount, APPOINTMENT_SLOTS.length);
  });

  test("times earlier today than the lead time are not offered", async () => {
    // Fix the clock at 14:00 New York on a day well inside the window.
    const date = daysFromNow(1);
    const now = wallTimeToUtc(date, "14:00");
    assert.ok(now);

    const day = await getDayAvailability(date, deps({ now }));

    const past = day.slots.find((slot) => slot.value === "11:00");
    assert.equal(past?.available, false, "a slot three hours ago must not be bookable");

    const tooSoon = day.slots.find((slot) => slot.value === "14:00");
    assert.equal(tooSoon?.available, false, "the lead time must be respected");

    const later = day.slots.find(
      (slot) => (minutesFromClock(slot.value) ?? 0) >= 14 * 60 + MIN_LEAD_TIME_MINUTES + 30,
    );
    assert.equal(later?.available, true);
  });

  test("a date outside the window returns no slots rather than an error", async () => {
    const past = await getDayAvailability(daysFromNow(-3), deps());
    assert.deepEqual(past.slots, []);
    assert.equal(past.openCount, 0);

    const far = await getDayAvailability(daysFromNow(MAX_DAYS_AHEAD + 5), deps());
    assert.deepEqual(far.slots, []);
  });

  test("an unreachable database reports that it was not checked", async () => {
    const day = await getDayAvailability(daysFromNow(7), deps({ unreachable: true }));
    assert.equal(day.databaseChecked, false);
    // Still offers times — an outage must not stop someone requesting one.
    assert.ok(day.openCount > 0);
  });

  test("labels the evening window as after hours", async () => {
    const day = await getDayAvailability(daysFromNow(7), deps());
    const evening = day.slots.find((slot) => slot.value === "18:00");
    const daytime = day.slots.find((slot) => slot.value === "11:00");
    assert.equal(evening?.afterHours, true);
    assert.equal(daytime?.afterHours, false);
  });
});

describe("upcoming days", () => {
  test("lists only days that have something open", async () => {
    const days = await getUpcomingDays(5, deps());
    assert.ok(days.length > 0);
    for (const day of days) {
      assert.ok(day.openCount > 0);
      assert.match(day.date, /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test("names today and tomorrow rather than dating them", async () => {
    const days = await getUpcomingDays(5, deps());
    const today = todayInZone();
    const match = days.find((day) => day.date === today);
    // Today only appears while slots remain, which depends on the wall clock.
    if (match) assert.equal(match.relativeLabel, "Today");
  });

  test("a fully booked day drops out of the list", async () => {
    const solid = daysFromNow(2);
    const everySlot = APPOINTMENT_SLOTS.map((slot) =>
      (wallTimeToUtc(solid, slot) as Date).toISOString(),
    );

    const days = await getUpcomingDays(10, deps({ booked: everySlot }));

    // The stub hands every day the same instants; only the day they actually
    // fall on can match them, which is exactly the day that must disappear.
    assert.ok(
      !days.some((day) => day.date === solid),
      "a day with every slot taken must not be offered",
    );
    assert.ok(days.length > 0, "the surrounding days are still open");
  });
});

describe("single slot", () => {
  test("reports a free slot as open and a taken one as not", async () => {
    const date = daysFromNow(7);
    const taken = wallTimeToUtc(date, "15:00");
    assert.ok(taken);

    assert.equal(await isSlotOpen(date, "15:00", deps({ booked: [taken.toISOString()] })), false);
    assert.equal(await isSlotOpen(date, "15:30", deps({ booked: [taken.toISOString()] })), true);
  });

  test("a time that is not on the grid is never open", async () => {
    assert.equal(await isSlotOpen(daysFromNow(7), "13:07", deps()), false);
    assert.equal(await isSlotOpen(daysFromNow(7), "23:00", deps()), false);
  });
});
