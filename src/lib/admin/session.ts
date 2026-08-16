/**
 * Admin session tokens.
 *
 * A signed, expiring token stored in an HttpOnly cookie. Signing uses Web Crypto
 * HMAC-SHA256 so the exact same verification runs in middleware (Edge runtime)
 * and in server actions (Node) — the authorization check is never duplicated in
 * two dialects that could drift apart.
 *
 * This module contains no secrets-reading side effects at import time and is
 * safe to import from middleware.
 */

export const ADMIN_COOKIE = "kt_admin_session";

/** Eight hours — long enough for a working day in the warehouse, short enough to matter. */
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

/** Length-independent constant-time string comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

/** Creates `"<expiry>.<signature>"`. */
export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  const expiresAt = now + SESSION_DURATION_MS;
  const payload = String(expiresAt);
  return `${payload}.${await hmac(secret, payload)}`;
}

/**
 * Verifies signature first, then expiry. Any malformed, unsigned or expired
 * token is simply invalid — there is no partial-trust state.
 */
export async function verifySessionToken(
  secret: string,
  token: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!token || !secret) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!/^\d+$/.test(payload)) return false;

  const expected = await hmac(secret, payload);
  if (!timingSafeEqual(signature, expected)) return false;

  return Number(payload) > now;
}

/** Constant-time password check, used by the login action. */
export async function verifyPassword(expected: string, provided: string): Promise<boolean> {
  if (!expected || !provided) return false;
  // Hash both sides first so the comparison is over fixed-length values and the
  // raw length of the submitted password is not observable through timing.
  const [a, b] = await Promise.all([hmac(expected, "pw"), hmac(provided, "pw")]);
  return timingSafeEqual(a, b);
}
