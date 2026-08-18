import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

/**
 * The two-number contract.
 *
 * KT Appliances runs on two numbers that are easy to confuse and expensive to
 * swap:
 *
 *   PUBLIC BUSINESS LINE   +19735199717  — what the site publishes, what
 *                                          customers dial, what Google matches
 *                                          against the business listing (NAP).
 *   TWILIO SENDING NUMBER  +15707500622  — what automated texts go out from.
 *
 * Getting these backwards is not a cosmetic bug. Publishing the Twilio number
 * breaks local-SEO NAP consistency across every indexed page; sending from the
 * business line asks Twilio to originate traffic as a number the account does
 * not own, which the carriers reject. Neither failure is loud, so they are
 * pinned here instead.
 *
 * `NEXT_PUBLIC_BUSINESS_PHONE` is deliberately set to the E.164 form that
 * production uses, before `site-config` is imported: the module reads the
 * environment once at load, and the previous implementation turned exactly this
 * value into `+119735199717`.
 */

const BUSINESS_E164 = "+19735199717";
const BUSINESS_DISPLAY = "(973) 519-9717";
const TWILIO_SENDER = "+15707500622";

process.env.NEXT_PUBLIC_BUSINESS_PHONE = BUSINESS_E164;

const { siteConfig, telHref, smsHref } = await import("@/lib/site-config");
const { localBusinessSchema } = await import("@/lib/seo/jsonld");
const { normalizePhoneDigits, maskPhoneNumber, stripUsCountryCode } = await import(
  "@/lib/sms/phone"
);
const { formatPhoneNumber } = await import("@/lib/utils");
const { customerConfirmationBody, ownerNotificationBody } = await import(
  "@/lib/appointments/messages"
);

describe("public business number", () => {
  test("call links resolve to the business line", () => {
    assert.equal(telHref, `tel:${BUSINESS_E164}`);
    assert.equal(siteConfig.phone.e164, BUSINESS_E164);
  });

  test("customer-visible presentation is (973) 519-9717", () => {
    assert.equal(siteConfig.phone.display, BUSINESS_DISPLAY);
  });

  test("an E.164 environment value does not double the country code", () => {
    // The regression this file exists for. `+1` + `19735199717` produced
    // `tel:+119735199717` on every page and a malformed LocalBusiness telephone.
    assert.equal(siteConfig.phone.digits, "9735199717");
    assert.doesNotMatch(siteConfig.phone.e164, /^\+11/);
    assert.equal(normalizePhoneDigits("+19735199717"), "9735199717");
    assert.equal(normalizePhoneDigits("(973) 519-9717"), "9735199717");
    assert.equal(normalizePhoneDigits("9735199717"), "9735199717");
  });

  test("customer-initiated texts go to the business line, not the Twilio sender", () => {
    // `sms:` hrefs are the customer texting the shop. That conversation belongs
    // on the published line; only outbound automation uses Twilio.
    assert.ok(smsHref().startsWith(`sms:${BUSINESS_E164}`));
    assert.doesNotMatch(smsHref(), /5707500622/);
  });
});

describe("E.164 to US display formatting", () => {
  /**
   * The admin's SMS SENDER field reads `TWILIO_FROM_NUMBER`, which is stored in
   * E.164 because that is what Twilio requires. Rendering it went straight
   * through `formatPhoneNumber`, which clamped to ten digits *before* removing
   * the country code and produced `(157) 075-0062` — a number that looks real,
   * belongs to nobody, and told the owner the wrong sender.
   */
  test("the Twilio sender displays as (570) 750-0622", () => {
    assert.equal(formatPhoneNumber(TWILIO_SENDER), "(570) 750-0622");
  });

  test("the business line displays as (973) 519-9717 from E.164", () => {
    assert.equal(formatPhoneNumber(BUSINESS_E164), BUSINESS_DISPLAY);
  });

  test("every accepted input shape yields the same display string", () => {
    for (const input of [
      "5707500622",
      "+15707500622",
      "15707500622",
      "(570) 750-0622",
      "570-750-0622",
      "570.750.0622",
      "+1 (570) 750-0622",
    ]) {
      assert.equal(formatPhoneNumber(input), "(570) 750-0622", `failed for input: ${input}`);
    }
  });

  test("the country code is stripped before the ten-digit clamp, not after", () => {
    // The precise ordering bug. Clamping first leaves "1570750062".
    assert.equal(stripUsCountryCode("15707500622"), "5707500622");
    assert.equal(stripUsCountryCode("5707500622"), "5707500622");
    // Only an eleven-digit run beginning with 1 is a country code. NANP forbids
    // an area code starting with 1, so there is nothing else this could be.
    assert.equal(stripUsCountryCode("1570750062"), "1570750062");
    assert.equal(stripUsCountryCode("25707500622"), "25707500622");
  });

  test("the malformed renderings never appear again", () => {
    for (const value of [TWILIO_SENDER, BUSINESS_E164, "15707500622", "19735199717"]) {
      const rendered = formatPhoneNumber(value);
      assert.notEqual(rendered, "(157) 075-0062");
      assert.notEqual(rendered, "(197) 351-9971");
      assert.doesNotMatch(rendered, /^\(1\d\d\)/, `leading country code leaked into ${rendered}`);
    }
    // And the E.164 values themselves are never double-prefixed.
    assert.notEqual(siteConfig.phone.e164, "+119735199717");
    assert.doesNotMatch(`+1${normalizePhoneDigits(TWILIO_SENDER)}`, /^\+11/);
  });

  test("partial input still formats progressively for the live form fields", () => {
    // `formatPhoneNumber` backs the onChange handlers on the lead and appointment
    // phone inputs. Blanking partial input would eat keystrokes mid-typing.
    assert.equal(formatPhoneNumber("9"), "9");
    assert.equal(formatPhoneNumber("973"), "973");
    assert.equal(formatPhoneNumber("9735"), "(973) 5");
    assert.equal(formatPhoneNumber("973519"), "(973) 519");
    assert.equal(formatPhoneNumber("9735199717"), BUSINESS_DISPLAY);
    assert.equal(formatPhoneNumber(""), "");
  });

  test("E.164 is preserved for machine-readable use, not rewritten to ten digits", () => {
    // Display is a boundary concern only. Twilio and schema.org keep E.164.
    assert.equal(siteConfig.phone.e164, BUSINESS_E164);
    assert.equal(telHref, `tel:${BUSINESS_E164}`);
  });
});

describe("structured data", () => {
  test("LocalBusiness telephone is the business line", () => {
    const schema = localBusinessSchema() as Record<string, unknown>;
    assert.equal(schema.telephone, BUSINESS_E164);
  });

  test("the Twilio number never appears in published schema", () => {
    assert.doesNotMatch(JSON.stringify(localBusinessSchema()), /5707500622/);
  });
});

describe("Twilio sender selection", () => {
  const saved = { ...process.env };

  before(() => {
    process.env.SMS_SENDING_ENABLED = "true";
    process.env.TWILIO_ACCOUNT_SID = "AC_test_account";
    process.env.TWILIO_AUTH_TOKEN = "test_auth_token";
    process.env.TWILIO_FROM_NUMBER = TWILIO_SENDER;
  });

  after(() => {
    process.env = { ...saved };
  });

  test("the owned sender is the Twilio number, never the business line", async () => {
    const { getSmsSenderNumber } = await import("@/lib/sms/config");
    assert.equal(getSmsSenderNumber(), TWILIO_SENDER);
    assert.notEqual(getSmsSenderNumber(), BUSINESS_E164);
  });

  test("a Messaging Service still wins over the bare From number", async () => {
    const { getTwilioCredentials } = await import("@/lib/sms/config");
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG_test_service";

    const credentials = getTwilioCredentials();
    // The A2P campaign rides on the Messaging Service. `sms/client.ts` sets
    // `MessagingServiceSid` and omits `From` whenever this is present; the
    // sender number is the fallback for a deployment that has no service.
    assert.equal(credentials.messagingServiceSid, "MG_test_service");
    assert.equal(credentials.fromNumber, TWILIO_SENDER);

    delete process.env.TWILIO_MESSAGING_SERVICE_SID;
  });
});

describe("owner appointment alerts", () => {
  const saved = process.env.APPOINTMENT_NOTIFICATION_PHONE;

  after(() => {
    if (saved === undefined) delete process.env.APPOINTMENT_NOTIFICATION_PHONE;
    else process.env.APPOINTMENT_NOTIFICATION_PHONE = saved;
  });

  test("the alert destination is the configured business line", async () => {
    const { getOwnerNotificationPhone } = await import("@/lib/sms/config");
    process.env.APPOINTMENT_NOTIFICATION_PHONE = BUSINESS_E164;
    assert.equal(getOwnerNotificationPhone(), BUSINESS_E164);
  });

  test("an unset destination skips the alert rather than defaulting to the shop", async () => {
    const { getOwnerNotificationPhone } = await import("@/lib/sms/config");
    delete process.env.APPOINTMENT_NOTIFICATION_PHONE;
    // Must stay empty: `notifications.ts` reads "" as no-owner-number and records
    // a skip. Silently falling back would text a number nobody configured.
    assert.equal(getOwnerNotificationPhone(), "");
  });

  test("the admin masks the destination to its last four digits", () => {
    assert.equal(maskPhoneNumber(BUSINESS_E164), "(***) ***-9717");
    assert.doesNotMatch(maskPhoneNumber(BUSINESS_E164), /973/);
    assert.doesNotMatch(maskPhoneNumber(BUSINESS_E164), /519/);
  });
});

describe("appointment SMS copy", () => {
  const appointment = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Dana Reyes",
    phone: "9735551234",
    serviceType: "warehouse-visit" as const,
    scheduledFor: "2026-08-20T14:00:00.000Z",
    timeZone: "America/New_York",
  };

  test("the confirmation names the shop and the number to call back on", () => {
    const body = customerConfirmationBody(appointment);
    assert.match(body, /^KT Appliances:/);
    assert.ok(
      body.includes(BUSINESS_DISPLAY),
      `confirmation should carry the business line, got: ${body}`,
    );
  });

  test("the confirmation keeps its opt-out language", () => {
    const body = customerConfirmationBody(appointment);
    assert.match(body, /Reply HELP for help or STOP to opt out\./);
  });

  test("no customer-facing body advertises the Twilio sender", () => {
    for (const body of [customerConfirmationBody(appointment), ownerNotificationBody(appointment)]) {
      assert.doesNotMatch(body, /5707500622|570.750.0622/);
    }
  });

  test("bodies stay GSM-7, so a segment is 160 characters and not 70", () => {
    // A curly quote, an em dash or an ellipsis character forces UCS-2 and roughly
    // triples the cost. Adding the phone number must not smuggle one in.
    const body = customerConfirmationBody(appointment);
    assert.doesNotMatch(body, /[^\x20-\x7E\n]/);
  });

  test("the confirmation still fits two segments", () => {
    const body = customerConfirmationBody(appointment);
    assert.ok(body.length <= 306, `confirmation is ${body.length} chars, over two GSM-7 segments`);
  });
});

describe("no stale or leaked configuration", () => {
  test("the business line is never used as a Twilio sender in shipped code", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const path = await import("node:path");

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx?$/.test(full)) {
          const text = readFileSync(full, "utf8");
          // A literal business number sitting next to a Twilio sender variable is
          // the specific mistake worth failing the build over.
          if (/TWILIO_FROM_NUMBER[^\n]*9735199717/.test(text)) offenders.push(full);
        }
      }
    };
    walk(path.join(process.cwd(), "src"));

    assert.deepEqual(offenders, []);
  });

  test("no server secret is exposed under a NEXT_PUBLIC_ name", async () => {
    const { readFileSync } = await import("node:fs");
    const example = readFileSync(`${process.cwd()}/.env.example`, "utf8");

    for (const secret of [
      "TWILIO_AUTH_TOKEN",
      "TWILIO_ACCOUNT_SID",
      "SUPABASE_SERVICE_ROLE_KEY",
      "APPOINTMENT_NOTIFICATION_PHONE",
    ]) {
      assert.doesNotMatch(
        example,
        new RegExp(`NEXT_PUBLIC_[A-Z_]*${secret}|NEXT_PUBLIC_${secret}`),
        `${secret} must never be published to the browser`,
      );
    }
  });
});
