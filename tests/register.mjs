import { register } from "node:module";

/**
 * Installs the resolution hooks, and makes sure no test can ever reach Twilio.
 *
 * `SMS_SENDING_ENABLED` is forced off here and the Twilio credentials are
 * cleared before any test module loads, so a suite run on a developer machine
 * that happens to have real credentials in the environment still cannot send a
 * message. Individual tests opt back in by setting the variables themselves and
 * stubbing `fetch` — never by using a real network.
 */
register("./resolve-hooks.mjs", import.meta.url);

process.env.SMS_SENDING_ENABLED = "false";
delete process.env.TWILIO_ACCOUNT_SID;
delete process.env.TWILIO_AUTH_TOKEN;
delete process.env.TWILIO_MESSAGING_SERVICE_SID;
delete process.env.TWILIO_FROM_NUMBER;
delete process.env.APPOINTMENT_NOTIFICATION_PHONE;

// Supabase must stay unconfigured: the repositories return null clients, so no
// test touches a database either.
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

// A stable canonical origin so message snapshots do not depend on the machine.
process.env.NEXT_PUBLIC_SITE_URL = "https://ktappliances.com";
