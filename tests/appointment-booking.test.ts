import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  AppointmentPersistenceError,
  bookAppointment,
} from "@/lib/appointments/service";
import { appointmentSchema, type AppointmentData } from "@/lib/appointments/schema";
import type { AppointmentBookedNotifications } from "@/lib/appointments/notifications";
import { daysFromNow } from "./helpers";

/**
 * The booking pipeline: persist, commit, then notify.
 *
 * The ordering assertion is the one that matters most. Everything else in this
 * feature is recoverable; texting "your appointment is confirmed" for a booking
 * that then failed to save is not.
 */

function validBooking(overrides: Record<string, string> = {}): AppointmentData {
  const parsed = appointmentSchema.safeParse({
    name: "John Smith",
    phone: "(973) 555-1234",
    date: daysFromNow(7),
    time: "14:30",
    serviceType: "warehouse-visit",
    notes: "Not cooling",
    smsConsent: "on",
    submissionToken: "token-abc",
    ...overrides,
  });

  assert.ok(parsed.success, "fixture must be a valid booking");
  return parsed.data;
}

const noNotifications: AppointmentBookedNotifications = {
  customer: { event: "customer_confirmation", status: "skipped" },
  owner: { event: "owner_notification", status: "skipped" },
};

describe("ordering", () => {
  test("nothing is notified until the appointment is persisted", async () => {
    const calls: string[] = [];

    await bookAppointment(validBooking(), {
      async persist() {
        calls.push("persist");
        return { id: "appointment-1", duplicate: false };
      },
      async notify() {
        calls.push("notify");
        return noNotifications;
      },
    });

    assert.deepEqual(calls, ["persist", "notify"]);
  });

  test("a failed insert aborts before any message is composed", async () => {
    let notified = false;

    await assert.rejects(
      bookAppointment(validBooking(), {
        async persist() {
          throw new AppointmentPersistenceError("insert failed");
        },
        async notify() {
          notified = true;
          return noNotifications;
        },
      }),
      AppointmentPersistenceError,
    );

    assert.equal(notified, false, "a booking that did not save must not be confirmed by text");
  });

  test("the persisted appointment id is handed to the notifier", async () => {
    let seenId: string | undefined;

    await bookAppointment(validBooking(), {
      async persist() {
        return { id: "appointment-42", duplicate: false };
      },
      async notify({ appointment }) {
        seenId = appointment.id;
        return noNotifications;
      },
    });

    assert.equal(seenId, "appointment-42");
  });
});

describe("notification failures never affect the booking", () => {
  test("a notifier that throws still yields a successful booking", async () => {
    const result = await bookAppointment(validBooking(), {
      async persist() {
        return { id: "appointment-1", duplicate: false };
      },
      async notify() {
        throw new Error("Twilio is down");
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.id, "appointment-1");
    assert.equal(result.notifications.customer.status, "failed");
  });

  test("skipped messages still yield a successful booking", async () => {
    const result = await bookAppointment(validBooking(), {
      async persist() {
        return { id: "appointment-1", duplicate: false };
      },
      async notify() {
        return noNotifications;
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.notifications.customer.status, "skipped");
  });
});

describe("consent is carried through to the notifier", () => {
  test("a ticked box reaches the notification target as true", async () => {
    let consent: boolean | undefined;
    await bookAppointment(validBooking({ smsConsent: "on" }), {
      async persist() {
        return { id: "a", duplicate: false };
      },
      async notify({ appointment }) {
        consent = appointment.smsConsent;
        return noNotifications;
      },
    });
    assert.equal(consent, true);
  });

  test("an absent checkbox reaches the notification target as false", async () => {
    let consent: boolean | undefined;
    const booking = appointmentSchema.parse({
      name: "Jane Doe",
      phone: "9735551234",
      date: daysFromNow(3),
      time: "10:00",
    });

    await bookAppointment(booking, {
      async persist() {
        return { id: "a", duplicate: false };
      },
      async notify({ appointment }) {
        consent = appointment.smsConsent;
        return noNotifications;
      },
    });
    assert.equal(consent, false);
  });
});

describe("duplicate submissions", () => {
  test("a resubmitted token resolves to the existing appointment", async () => {
    // What `persistAppointment` does on a unique-violation: return the original
    // id and flag it, so the notification claims find their rows taken.
    const result = await bookAppointment(validBooking(), {
      async persist() {
        return { id: "appointment-1", duplicate: true };
      },
      async notify() {
        return {
          customer: { event: "customer_confirmation" as const, status: "duplicate" as const },
          owner: { event: "owner_notification" as const, status: "duplicate" as const },
        };
      },
    });

    assert.equal(result.duplicate, true);
    assert.equal(result.id, "appointment-1");
    assert.equal(result.notifications.customer.status, "duplicate");
    assert.equal(result.notifications.owner.status, "duplicate");
  });
});
