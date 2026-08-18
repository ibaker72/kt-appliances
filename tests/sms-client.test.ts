import { test, describe, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { sendSms } from "@/lib/sms/client";
import { smsConfigProblem } from "@/lib/sms/config";
import { maskPhoneNumber, normalizePhoneDigits, toE164 } from "@/lib/sms/phone";

/**
 * The Twilio transport, against a stubbed `fetch`.
 *
 * No test in this file may reach the network. `globalThis.fetch` is replaced for
 * the duration and restored afterwards, and any call that escapes the stub fails
 * the test loudly rather than quietly dialling a real number.
 */

const realFetch = globalThis.fetch;

interface CapturedRequest {
  url: string;
  headers: Record<string, string>;
  body: URLSearchParams;
}

let captured: CapturedRequest[] = [];

function stubFetch(responder: () => Response) {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    captured.push({
      url: String(url),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: new URLSearchParams(String(init?.body ?? "")),
    });
    return responder();
  }) as typeof fetch;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function enableSms() {
  process.env.SMS_SENDING_ENABLED = "true";
  process.env.TWILIO_ACCOUNT_SID = "AC_test_account";
  process.env.TWILIO_AUTH_TOKEN = "test_auth_token";
  process.env.TWILIO_MESSAGING_SERVICE_SID = "MG_test_service";
}

function disableSms() {
  process.env.SMS_SENDING_ENABLED = "false";
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_MESSAGING_SERVICE_SID;
  delete process.env.TWILIO_FROM_NUMBER;
  delete process.env.SMS_CUSTOMER_SENDING_ENABLED;
}

beforeEach(() => {
  captured = [];
  globalThis.fetch = (async () => {
    throw new Error("A test reached the network. Stub fetch before sending.");
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  disableSms();
});

describe("feature gating", () => {
  test("sends nothing while SMS_SENDING_ENABLED is false", async () => {
    disableSms();
    const result = await sendSms({
      kind: "appointment-confirmation",
      audience: "customer",
      to: "9735551234",
      body: "hello",
    });

    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "sms-disabled");
    assert.equal(captured.length, 0, "Twilio must not be called while sending is disabled");
  });

  test("sends nothing when the flag is on but Twilio is not configured", async () => {
    disableSms();
    process.env.SMS_SENDING_ENABLED = "true";

    const result = await sendSms({
      kind: "internal-alert",
      audience: "internal",
      to: "9735551234",
      body: "hello",
    });

    assert.equal(result.status, "skipped");
    assert.equal(captured.length, 0);
  });

  test("SMS_CUSTOMER_SENDING_ENABLED=false stops customer traffic but not internal alerts", async () => {
    enableSms();
    process.env.SMS_CUSTOMER_SENDING_ENABLED = "false";
    stubFetch(() => jsonResponse(201, { sid: "SM123" }));

    const customer = await sendSms({
      kind: "appointment-confirmation",
      audience: "customer",
      to: "9735551234",
      body: "hello",
    });
    assert.equal(customer.status, "skipped");
    assert.equal(customer.reason, "customer-sms-disabled");
    assert.equal(captured.length, 0);

    const internal = await sendSms({
      kind: "internal-alert",
      audience: "internal",
      to: "9735551234",
      body: "hello",
    });
    assert.equal(internal.status, "sent");
    assert.equal(captured.length, 1);
  });

  test("customer sending follows the master switch when the narrow flag is unset", async () => {
    enableSms();
    stubFetch(() => jsonResponse(201, { sid: "SM123" }));

    const result = await sendSms({
      kind: "appointment-confirmation",
      audience: "customer",
      to: "9735551234",
      body: "hello",
    });

    assert.equal(result.status, "sent", "one variable should be enough to go live");
  });
});

describe("request shape", () => {
  beforeEach(() => {
    enableSms();
    stubFetch(() => jsonResponse(201, { sid: "SM_abc123", status: "queued" }));
  });

  test("posts to the account's Messages endpoint with the Messaging Service", async () => {
    const result = await sendSms({
      kind: "appointment-confirmation",
      audience: "customer",
      to: "(973) 555-1234",
      body: "KT Appliances: confirmed",
    });

    assert.equal(result.status, "sent");
    assert.equal(result.sid, "SM_abc123");

    const request = captured[0];
    assert.equal(
      request.url,
      "https://api.twilio.com/2010-04-01/Accounts/AC_test_account/Messages.json",
    );
    assert.equal(request.body.get("To"), "+19735551234", "must be normalised to E.164");
    assert.equal(request.body.get("Body"), "KT Appliances: confirmed");
    assert.equal(
      request.body.get("MessagingServiceSid"),
      "MG_test_service",
      "the Messaging Service carries the A2P campaign registration",
    );
    assert.equal(request.body.get("From"), null, "From must not override the Messaging Service");
  });

  test("authenticates with Basic auth and leaks no credential into the body", async () => {
    await sendSms({
      kind: "internal-alert",
      audience: "internal",
      to: "9735551234",
      body: "new booking",
    });

    const request = captured[0];
    const expected = `Basic ${Buffer.from("AC_test_account:test_auth_token").toString("base64")}`;
    assert.equal(request.headers.Authorization, expected);
    assert.equal(request.body.get("AuthToken"), null);
    assert.doesNotMatch(request.body.toString(), /test_auth_token/);
  });

  test("falls back to a bare From number when no Messaging Service is set", async () => {
    delete process.env.TWILIO_MESSAGING_SERVICE_SID;
    // The Twilio-owned sender, not the published business line. Using the
    // business number here would assert the one arrangement Twilio will not
    // carry: sending as a number the account does not own.
    process.env.TWILIO_FROM_NUMBER = "+15707500622";

    await sendSms({
      kind: "internal-alert",
      audience: "internal",
      to: "9735551234",
      body: "new booking",
    });

    assert.equal(captured[0].body.get("From"), "+15707500622");
  });
});

describe("failure handling", () => {
  beforeEach(enableSms);

  test("a Twilio error becomes a typed failure, not an exception", async () => {
    stubFetch(() =>
      jsonResponse(400, { code: 21610, message: "Attempt to send to unsubscribed recipient" }),
    );

    const result = await sendSms({
      kind: "appointment-confirmation",
      audience: "customer",
      to: "9735551234",
      body: "hello",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.errorCode, "21610");
    assert.match(result.errorMessage, /unsubscribed/);
  });

  test("a transport exception becomes a typed failure", async () => {
    globalThis.fetch = (async () => {
      throw new Error("ECONNRESET");
    }) as typeof fetch;

    const result = await sendSms({
      kind: "appointment-confirmation",
      audience: "customer",
      to: "9735551234",
      body: "hello",
    });

    assert.equal(result.status, "failed");
    assert.match(result.errorMessage, /ECONNRESET/);
  });

  test("a malformed number never reaches Twilio", async () => {
    stubFetch(() => jsonResponse(201, { sid: "SM123" }));

    for (const bad of ["123", "abcdefghij", "0005551234", ""]) {
      const result = await sendSms({
        kind: "appointment-confirmation",
        audience: "customer",
        to: bad,
        body: "hello",
      });
      assert.equal(result.status, "skipped", `"${bad}" should be rejected locally`);
    }

    assert.equal(captured.length, 0, "no request may be made for an invalid number");
  });
});

describe("configuration diagnostics", () => {
  test("names the flag while sending is off, without revealing any secret", () => {
    disableSms();
    const problem = smsConfigProblem() ?? "";
    assert.match(problem, /SMS_SENDING_ENABLED/);
    assert.match(problem, /A2P campaign/);
  });

  test("names the specific missing variable once the flag is on", () => {
    disableSms();
    process.env.SMS_SENDING_ENABLED = "true";
    assert.match(smsConfigProblem() ?? "", /TWILIO_ACCOUNT_SID/);

    process.env.TWILIO_ACCOUNT_SID = "AC_test_account";
    assert.match(smsConfigProblem() ?? "", /TWILIO_AUTH_TOKEN/);

    process.env.TWILIO_AUTH_TOKEN = "test_auth_token";
    assert.match(smsConfigProblem() ?? "", /MESSAGING_SERVICE_SID/);

    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG_test_service";
    assert.equal(smsConfigProblem(), null);
  });

  test("never echoes a credential value", () => {
    disableSms();
    process.env.SMS_SENDING_ENABLED = "true";
    process.env.TWILIO_ACCOUNT_SID = "AC_super_secret";
    process.env.TWILIO_AUTH_TOKEN = "tok_super_secret";

    const problem = smsConfigProblem() ?? "";
    assert.doesNotMatch(problem, /super_secret/);
  });
});

describe("phone helpers", () => {
  test("normalises the formats customers actually type", () => {
    assert.equal(normalizePhoneDigits("(973) 555-1234"), "9735551234");
    assert.equal(normalizePhoneDigits("1-973-555-1234"), "9735551234");
    assert.equal(normalizePhoneDigits("973.555.1234"), "9735551234");
    assert.equal(normalizePhoneDigits("97355512"), "");
  });

  test("E.164 rejects numbers the carriers cannot route", () => {
    assert.equal(toE164("9735551234"), "+19735551234");
    assert.equal(toE164("0735551234"), null, "area code may not start with 0");
    assert.equal(toE164("1735551234"), null, "area code may not start with 1");
    assert.equal(toE164("9731551234"), null, "exchange may not start with 1");
  });

  test("masking keeps only the last four digits", () => {
    assert.equal(maskPhoneNumber("9735551234"), "(***) ***-1234");
    assert.equal(maskPhoneNumber("+19735551234"), "(***) ***-1234");
  });
});
