import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_COOKIE,
  SESSION_DURATION_MS,
  createSessionToken,
  verifySessionToken,
} from "./session";

/**
 * Server-side admin authorization.
 *
 * Fails closed in every direction: with no `ADMIN_PASSWORD` or
 * `ADMIN_SESSION_SECRET` configured, nobody can sign in and every admin page
 * renders a setup notice rather than an open dashboard. Middleware performs the
 * same cookie check at the edge, and `requireAdmin()` re-checks inside each page
 * and action — the middleware is a fast rejection, not the only gate.
 */

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

export function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET?.trim() ?? "";
}

/** True only when both admin secrets are present. */
export function isAdminConfigured(): boolean {
  return getAdminPassword().length > 0 && getSessionSecret().length >= 16;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const store = await cookies();
  return verifySessionToken(getSessionSecret(), store.get(ADMIN_COOKIE)?.value);
}

/**
 * Guard for admin pages and actions. Redirects instead of returning, so a
 * missing check in a caller cannot accidentally leak a rendered page.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

export async function startAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, await createSessionToken(getSessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
