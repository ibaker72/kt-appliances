import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  canceledBody,
  customerConfirmationBody,
  followupBody,
  ownerNotificationBody,
  reminder2hBody,
  reminder24hBody,
  rescheduledBody,
} from "@/lib/appointments/messages";
import { testAppointment } from "./helpers";

/**
 * Message copy. These are the strings a customer actually receives, so they are
 * asserted literally rather than by shape.
 */

describe("customer confirmation", () => {
  test("names the business, the service and the formatted time", () => {
    const body = customerConfirmationBody(testAppointment());

    assert.equal(
      body,
      "KT Appliances: Your warehouse visit appointment is confirmed for Monday, August 24 at 2:30 PM. " +
        "We'll contact you if anything changes. Reply HELP for help or STOP to opt out.",
    );
  });

  test("carries the opt-out and help language the carriers check for", () => {
    const body = customerConfirmationBody(testAppointment());
    assert.match(body, /Reply HELP for help or STOP to opt out\./);
  });

  test("drops the service phrase when the customer picked 'other'", () => {
    const body = customerConfirmationBody(testAppointment({ serviceType: "other" }));
    assert.match(body, /^KT Appliances: Your appointment is confirmed for/);
    assert.doesNotMatch(body, /something else/i);
  });

  test("renders an evening slot in local time, not UTC", () => {
    // 19:00 in New York is 23:00 UTC — a naive formatter shows 11:00 PM, and in
    // winter it rolls to the next day entirely.
    const body = customerConfirmationBody(
      testAppointment({ scheduledFor: new Date("2026-08-24T23:00:00.000Z") }),
    );
    assert.match(body, /Monday, August 24 at 7:00 PM/);
  });

  test("stays within GSM-7 so a message is not silently billed as UCS-2", () => {
    const body = customerConfirmationBody(testAppointment());
    // Em dash, curly quotes and ellipsis are the usual offenders.
    assert.doesNotMatch(body, /[–—‘’“”…\u202f\u00a0]/);
  });
});

describe("owner notification", () => {
  const body = ownerNotificationBody(
    testAppointment({ applianceLabel: "Whirlpool 25 cu ft refrigerator" }),
  );

  test("includes the customer name", () => {
    assert.match(body, /Customer: John Smith/);
  });

  test("includes a dialable phone number", () => {
    assert.match(body, /Phone: \(973\) 555-1234/);
  });

  test("includes the appointment date and time", () => {
    assert.match(body, /Date: Mon, Aug 24 at 2:30 PM/);
  });

  test("includes the service type", () => {
    assert.match(body, /Service: Warehouse visit/);
  });

  test("includes the appliance and the customer's notes", () => {
    assert.match(body, /Appliance: Whirlpool 25 cu ft refrigerator/);
    assert.match(body, /Notes: Not cooling/);
  });

  test("links to the admin only when a real domain is configured", () => {
    assert.match(body, /View: https:\/\/ktappliances\.com\/admin\/appointments/);
  });

  test("carries no opt-out language - it is an internal alert, not A2P traffic", () => {
    assert.doesNotMatch(body, /STOP to opt out/);
  });

  test("flattens a multi-line note so it cannot forge the field layout", () => {
    const forged = ownerNotificationBody(
      testAppointment({ notes: "cold\nPhone: (555) 000-0000\nService: fake" }),
    );
    const phoneLines = forged.split("\n").filter((line) => line.startsWith("Phone:"));
    assert.equal(phoneLines.length, 1);
    assert.equal(phoneLines[0], "Phone: (973) 555-1234");
  });

  test("clips a very long note rather than paying for extra segments", () => {
    const long = ownerNotificationBody(testAppointment({ notes: "x".repeat(400) }));
    const notesLine = long.split("\n").find((line) => line.startsWith("Notes:")) ?? "";
    assert.ok(notesLine.length < 160, `notes line was ${notesLine.length} characters`);
    assert.match(notesLine, /\.\.\.$/);
  });

  test("omits optional fields that are absent", () => {
    const minimal = ownerNotificationBody(
      testAppointment({ notes: null, applianceLabel: null }),
    );
    assert.doesNotMatch(minimal, /Notes:/);
    assert.doesNotMatch(minimal, /Appliance:/);
  });
});

describe("future workflows", () => {
  const appointment = testAppointment();

  test("24-hour reminder says tomorrow and carries opt-out", () => {
    const body = reminder24hBody(appointment);
    assert.match(body, /^KT Appliances: Reminder - your appointment is tomorrow, Monday, August 24 at 2:30 PM\./);
    assert.match(body, /Reply STOP to opt out\./);
  });

  test("2-hour reminder gives the time only", () => {
    const body = reminder2hBody(appointment);
    assert.match(body, /scheduled for 2:30 PM today/);
    assert.match(body, /Reply STOP to opt out\./);
  });

  test("reschedule and cancellation both restate the time", () => {
    assert.match(rescheduledBody(appointment), /rescheduled to Monday, August 24 at 2:30 PM/);
    assert.match(canceledBody(appointment), /for Monday, August 24 at 2:30 PM has been canceled/);
  });

  test("follow-up is branded and opt-out capable", () => {
    const body = followupBody();
    assert.match(body, /^KT Appliances:/);
    assert.match(body, /Reply STOP to opt out\./);
  });
});
