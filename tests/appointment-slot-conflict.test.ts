import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  AppointmentPersistenceError,
  AppointmentSlotTakenError,
  bookAppointment,
} from "@/lib/appointments/service";
import { appointmentSchema, type AppointmentData } from "@/lib/appointments/schema";
import type { AppointmentBookedNotifications } from "@/lib/appointments/notifications";
import type { AppointmentEmailOutcomes } from "@/lib/appointments/email";
import { daysFromNow } from "./helpers";

/**
 * Two people, one slot.
 *
 * The guarantee is a partial unique index in Postgres
 * (`appointments_active_slot_idx`, migration 0007), so what is testable here is
 * the half that lives in application code: that a slot collision is told apart
 * from every other unique violation, that it surfaces as its own error type
 * rather than as a generic failure, and that a booking which loses the race
 * produces no confirmation and no notification.
 *
 * The distinction matters because both failures arrive as Postgres 23505 and
 * they mean opposite things — a repeated submission token is the *same* booking
 * and must resolve to it; a slot conflict is a *different* booking and must be
 * refused.
 */

function validBooking(overrides: Record<string, string> = {}): AppointmentData {
  const parsed = appointmentSchema.safeParse({
    name: "Dana Reyes",
    phone: "(973) 555-8890",
    date: daysFromNow(5),
    time: "13:30",
    serviceType: "warehouse-visit",
    purpose: "view-appliance",
    submissionToken: "token-slot-test",
    ...overrides,
  });
  assert.ok(parsed.success, "fixture must be a valid booking");
  return parsed.data;
}

const noNotifications: AppointmentBookedNotifications = {
  customer: { event: "customer_confirmation", status: "skipped" },
  owner: { event: "owner_notification", status: "skipped" },
};

const noEmails: AppointmentEmailOutcomes = {
  owner: { status: "skipped", reason: "email-not-configured" },
  customer: { status: "skipped", reason: "email-not-configured" },
};

describe("a slot that was just taken", () => {
  test("aborts before anything is notified", async () => {
    const calls: string[] = [];

    await assert.rejects(
      bookAppointment(validBooking(), {
        async persist() {
          calls.push("persist");
          throw new AppointmentSlotTakenError();
        },
        async notify() {
          calls.push("notify");
          return noNotifications;
        },
        async email() {
          calls.push("email");
          return noEmails;
        },
      }),
      AppointmentSlotTakenError,
    );

    assert.deepEqual(calls, ["persist"], "no message may be composed for a booking that failed");
  });

  test("is a distinct type from a persistence failure", async () => {
    const slotTaken = new AppointmentSlotTakenError();
    const broken = new AppointmentPersistenceError("connection refused");

    assert.ok(slotTaken instanceof AppointmentSlotTakenError);
    assert.ok(!(slotTaken instanceof AppointmentPersistenceError));
    assert.ok(!(broken instanceof AppointmentSlotTakenError));
  });

  test("carries copy a customer can act on, not a constraint name", () => {
    const error = new AppointmentSlotTakenError();
    assert.ok(!/idx|constraint|23505|postgres/i.test(error.message), error.message);
    assert.match(error.message, /booked/i);
  });
});

describe("a repeated submission", () => {
  test("resolves to the existing booking and sends nothing further", async () => {
    const emailCalls: number[] = [];

    const result = await bookAppointment(validBooking(), {
      async persist() {
        // What `persistAppointment` returns when the submission token already
        // produced an appointment.
        return { id: "appointment-1", duplicate: true };
      },
      async notify() {
        return noNotifications;
      },
      async email() {
        emailCalls.push(1);
        return noEmails;
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.duplicate, true);
    assert.equal(emailCalls.length, 0, "a resubmitted booking must not re-alert the owner");
    assert.equal(result.emails.owner.status, "skipped");
    assert.equal(result.emails.owner.reason, "duplicate-submission");
  });
});

describe("a first booking", () => {
  test("persists, then notifies, then emails", async () => {
    const calls: string[] = [];

    const result = await bookAppointment(validBooking(), {
      async persist() {
        calls.push("persist");
        return { id: "appointment-2", duplicate: false };
      },
      async notify() {
        calls.push("notify");
        return noNotifications;
      },
      async email() {
        calls.push("email");
        return noEmails;
      },
    });

    assert.deepEqual(calls, ["persist", "notify", "email"]);
    assert.equal(result.ok, true);
    assert.equal(result.id, "appointment-2");
  });

  test("a thrown email dispatch cannot undo a committed booking", async () => {
    const result = await bookAppointment(validBooking(), {
      async persist() {
        return { id: "appointment-3", duplicate: false };
      },
      async notify() {
        return noNotifications;
      },
      async email() {
        throw new Error("provider exploded");
      },
    });

    assert.equal(result.ok, true, "the appointment exists; email is best effort");
    assert.equal(result.emails.owner.status, "failed");
  });

  test("carries the purpose and the appliance through to the notification context", async () => {
    let seenPurpose: string | null | undefined;

    await bookAppointment(
      validBooking({ purpose: "financing", applianceLabel: "Samsung French Door" }),
      {
        async persist() {
          return { id: "appointment-4", duplicate: false };
        },
        async notify() {
          return noNotifications;
        },
        async email(appointment) {
          seenPurpose = appointment.purpose;
          assert.equal(appointment.applianceLabel, "Samsung French Door");
          return noEmails;
        },
      },
    );

    assert.equal(seenPurpose, "financing");
  });
});
