import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin/session";

/**
 * Edge guard for the admin area (Next 16's `proxy` convention, formerly
 * `middleware`).
 *
 * This is the first line of defence, not the only one: every admin page and
 * server action also calls `requireAdmin()`. This keeps unauthenticated requests
 * from ever reaching the route, and stamps a noindex header so no admin URL can
 * end up in a search index.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const secret = process.env.ADMIN_SESSION_SECRET?.trim() ?? "";
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const authenticated = await verifySessionToken(secret, token);

  // The login page is the one admin route reachable without a session.
  if (pathname === "/admin/login") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return withNoIndex(NextResponse.next());
  }

  if (!authenticated) {
    const loginUrl = new URL("/admin/login", request.url);
    // Preserve where they were heading so login can return them there.
    if (pathname !== "/admin") loginUrl.searchParams.set("next", pathname);
    return withNoIndex(NextResponse.redirect(loginUrl));
  }

  return withNoIndex(NextResponse.next());
}

function withNoIndex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
