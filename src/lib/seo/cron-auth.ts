import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * Authentication for scheduled routes.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is
 * set on the project, and that is the only accepted credential here. It is never
 * read from the querystring: a secret in a URL ends up in access logs, in
 * referrers and in anyone's browser history.
 *
 * FAILS CLOSED. With no `CRON_SECRET` configured the routes refuse to run at all
 * rather than running unauthenticated. A deploy that forgets the variable
 * produces a loud 503 in the cron log; the alternative — an open endpoint that
 * happily reports on the catalogue and fires submissions to third parties — is
 * the failure mode worth designing against.
 */

export type CronAuth =
  | { ok: true }
  | { ok: false; status: 401 | 503; reason: string };

/** Constant-time string comparison that does not leak length through timing. */
function secretsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  // `timingSafeEqual` throws on a length mismatch, which would itself be a
  // timing signal, so unequal lengths are compared against a fixed-size digest
  // of themselves instead: always the same amount of work, always false.
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function authorizeCron(request: Request): CronAuth {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return {
      ok: false,
      status: 503,
      reason: "CRON_SECRET is not configured. Scheduled routes are disabled until it is set.",
    };
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !secretsMatch(token, secret)) {
    return { ok: false, status: 401, reason: "Missing or invalid cron credentials." };
  }

  return { ok: true };
}

/** The response an unauthorized or unconfigured cron request gets. */
export function cronDenied(auth: Extract<CronAuth, { ok: false }>): Response {
  return Response.json(
    { ok: false, error: auth.reason },
    {
      status: auth.status,
      headers: { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
    },
  );
}

/** Standard success envelope: never cached, never indexed. */
export function cronResult(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
  });
}
