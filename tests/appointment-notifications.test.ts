import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  sendAppointmentBookedNotifications,
  sendCustomerAppointmentConfirmation,
  sendOwnerAppointmentNotification,
} from "@/lib/appointments/notifications";
import { failingSmsSpy, ledgerSpy, smsSpy, testAppointment } from "./helpers";

const OWNER = "+19735199717";

function deps(sms = smsSpy(), ledger = ledgerSpy(), ownerPhone = OWNER) {
  return {
    spy: sms,
    ledger,
    overrides: {
      sendSms: sms.send,
      claim: ledger.claim,
      record: ledger.record,
      ownerPhone: () => ownerPhone,
    },
  };
}

describe("customer confirmation", () => {
  test("sends when consent was given", async () => {
    const { spy, overrides } = deps();
    const outcome = await sendCustomerAppointmentConfirmation(testAppointment(), overrides);

    assert.equal(outcome.status, "sent");
    assert.equal(spy.sent.length, 1);
    assert.equal(spy.sent[0].to, "9735551234");
    assert.equal(spy.sent[0].audience, "customer");
    assert.match(spy.sent[0].body, /is confirmed for Monday, August 24 at 2:30 PM/);
  });

  test("does not send when consent was withheld", async () => {
    const { spy, ledger, overrides } = deps();
    const outcome = await sendCustomerAppointmentConfirmation(
      testAppointment({ smsConsent: false }),
      overrides,
    );

    assert.equal(outcome.status, "skipped");
    assert.equal(outcome.reason, "consent-withheld");
    assert.equal(spy.sent.length, 0, "no message may be composed without consent");

    // The skip is still recorded, so the admin can say why nothing was sent.
    assert.equal(ledger.records.length, 1);
    assert.deepEqual(ledger.records[0].outcome, {
      status: "skipped",
      reason: "consent-withheld",
    });
  });

  test("does not send when the transport reports SMS disabled", async () => {
    // What production looks like today: consent given, master switch off.
    const disabled = {
      sent: [] as unknown[],
      send: async () => ({
        status: "skipped" as const,
        reason: "sms-disabled" as const,
        detail: "SMS_SENDING_ENABLED is not \"true\"",
      }),
    };
    const ledger = ledgerSpy();
    const outcome = await sendCustomerAppointmentConfirmation(testAppointment(), {
      sendSms: disabled.send,
      claim: ledger.claim,
      record: ledger.record,
      ownerPhone: () => OWNER,
    });

    assert.equal(outcome.status, "skipped");
    assert.equal(outcome.reason, "sms-disabled");
    assert.equal(ledger.records[0].outcome.status, "skipped");
  });

  test("a provider failure is reported, not thrown", async () => {
    const sms = failingSmsSpy("21610", "Attempt to send to unsubscribed recipient");
    const ledger = ledgerSpy();

    const outcome = await sendCustomerAppointmentConfirmation(testAppointment(), {
      sendSms: sms.send,
      claim: ledger.claim,
      record: ledger.record,
      ownerPhone: () => OWNER,
    });

    assert.equal(outcome.status, "failed");
    assert.equal(outcome.reason, "21610");
    assert.equal(ledger.records[0].outcome.status, "failed");
  });
});

describe("owner notification", () => {
  test("goes to the configured owner number as internal traffic", async () => {
    const { spy, overrides } = deps();
    const outcome = await sendOwnerAppointmentNotification(testAppointment(), overrides);

    assert.equal(outcome.status, "sent");
    assert.equal(spy.sent[0].to, OWNER);
    assert.equal(spy.sent[0].audience, "internal");
    assert.equal(spy.sent[0].kind, "internal-alert");
  });

  test("is sent regardless of the customer's SMS consent", async () => {
    // Consent governs marketing to the customer. It has nothing to say about
    // whether the shop may be told about its own booking.
    const { spy, overrides } = deps();
    const outcome = await sendOwnerAppointmentNotification(
      testAppointment({ smsConsent: false }),
      overrides,
    );

    assert.equal(outcome.status, "sent");
    assert.equal(spy.sent.length, 1);
  });

  test("is skipped without crashing when no owner number is configured", async () => {
    const { spy, ledger, overrides } = deps(smsSpy(), ledgerSpy(), "");
    const outcome = await sendOwnerAppointmentNotification(testAppointment(), overrides);

    assert.equal(outcome.status, "skipped");
    assert.equal(outcome.reason, "no-owner-number");
    assert.equal(spy.sent.length, 0);
    assert.deepEqual(ledger.records[0].outcome, { status: "skipped", reason: "no-owner-number" });
  });
});

describe("booked fan-out", () => {
  test("sends exactly one customer text and one owner text", async () => {
    const { spy, overrides } = deps();
    const result = await sendAppointmentBookedNotifications(
      { appointment: testAppointment() },
      overrides,
    );

    assert.equal(result.customer.status, "sent");
    assert.equal(result.owner.status, "sent");
    assert.equal(spy.sent.length, 2);
    assert.deepEqual(
      spy.sent.map((message) => message.audience),
      ["customer", "internal"],
    );
  });

  test("owner still gets the alert when the customer text is skipped", async () => {
    const { spy, overrides } = deps();
    const result = await sendAppointmentBookedNotifications(
      { appointment: testAppointment({ smsConsent: false }) },
      overrides,
    );

    assert.equal(result.customer.status, "skipped");
    assert.equal(result.owner.status, "sent");
    assert.equal(spy.sent.length, 1);
  });
});

describe("idempotency", () => {
  test("a repeated booking callback does not send a second customer text", async () => {
    const sms = smsSpy();
    const ledger = ledgerSpy();
    const overrides = {
      sendSms: sms.send,
      claim: ledger.claim,
      record: ledger.record,
      ownerPhone: () => OWNER,
    };
    const appointment = testAppointment();

    const first = await sendAppointmentBookedNotifications({ appointment }, overrides);
    const second = await sendAppointmentBookedNotifications({ appointment }, overrides);

    assert.equal(first.customer.status, "sent");
    assert.equal(second.customer.status, "duplicate");
    assert.equal(second.owner.status, "duplicate");
    assert.equal(sms.sent.length, 2, "the second call must send nothing at all");
  });

  test("concurrent dispatches for one appointment produce one text each", async () => {
    // The realistic double-submit: two requests in flight at once, which an
    // in-process boolean would not catch.
    const sms = smsSpy();
    const ledger = ledgerSpy();
    const overrides = {
      sendSms: sms.send,
      claim: ledger.claim,
      record: ledger.record,
      ownerPhone: () => OWNER,
    };
    const appointment = testAppointment();

    await Promise.all([
      sendAppointmentBookedNotifications({ appointment }, overrides),
      sendAppointmentBookedNotifications({ appointment }, overrides),
      sendAppointmentBookedNotifications({ appointment }, overrides),
    ]);

    assert.equal(sms.sent.length, 2);
  });

  test("a ledger outage suppresses the send rather than risking duplicates", async () => {
    const sms = smsSpy();
    const outcome = await sendCustomerAppointmentConfirmation(testAppointment(), {
      sendSms: sms.send,
      claim: async () => ({ claimed: false, reason: "unavailable" }),
      record: async () => {},
      ownerPhone: () => OWNER,
    });

    assert.equal(outcome.status, "skipped");
    assert.equal(outcome.reason, "unavailable");
    assert.equal(sms.sent.length, 0);
  });
});

describe("resilience", () => {
  test("a transport that throws is contained and reported", async () => {
    const ledger = ledgerSpy();
    const outcome = await sendCustomerAppointmentConfirmation(testAppointment(), {
      sendSms: async () => {
        throw new Error("socket hang up");
      },
      claim: ledger.claim,
      record: ledger.record,
      ownerPhone: () => OWNER,
    });

    assert.equal(outcome.status, "failed");
    assert.equal(outcome.reason, "exception");
  });
});
