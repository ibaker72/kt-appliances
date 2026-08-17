/**
 * Phone number handling for outbound SMS.
 *
 * Deliberately narrow: the business serves PA/NJ/NY, every number it texts is a
 * US number, and a full libphonenumber build is ~500 KB to solve a problem this
 * codebase does not have. `leadSchema` already normalises input to ten digits —
 * these helpers turn that into what Twilio wants and back into something safe to
 * show a customer.
 *
 * No `server-only` marker: these are pure string functions, and the booking form
 * uses `maskPhoneNumber` client-side to confirm where a text was sent.
 */

/** Ten digits, or "" when the input cannot be a US number. */
export function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  const withoutCountryCode =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return withoutCountryCode.length === 10 ? withoutCountryCode : "";
}

/**
 * E.164 for Twilio: `9735551234` → `+19735551234`.
 *
 * Returns null rather than a best guess when the number cannot be valid. A
 * malformed number must stop before the API call — Twilio charges for rejected
 * requests and the resulting error tells us nothing we could not check here.
 *
 * NANP rules the carriers enforce: neither the area code nor the exchange code
 * may start with 0 or 1, so `0005551234` is rejected instead of being dialled.
 */
export function toE164(value: string): string | null {
  const digits = normalizePhoneDigits(value);
  if (!digits) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return `+1${digits}`;
}

/** `(***) ***-1234` — enough for a customer to recognise their own number. */
export function maskPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "(***) ***-****";
  return `(***) ***-${digits.slice(-4)}`;
}

/**
 * Log-safe form. Never write a full customer number into application logs —
 * they are retained far longer, and read by far more people, than the database.
 */
export function logSafePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? `***${digits.slice(-4)}` : "***";
}
