import { headers } from "next/headers";

import { getDayAvailability, getUpcomingDays } from "@/lib/appointments/availability";
import { availabilityQuerySchema } from "@/lib/chat/schema";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Open appointment slots.
 *
 * Read-only, public, and deliberately thin: it returns which half-hours on one
 * day are free, and which of the next days have anything at all. It exposes no
 * customer data — not a name, not a phone number, not even how many bookings
 * exist beyond "this slot is taken", which is the minimum a booking UI cannot
 * work without.
 *
 * What it is *not* is the double-booking defence. Two visitors can both be told
 * 1:30 PM is open; the partial unique index in migration 0007 decides which one
 * gets it, and the booking action tells the other to pick again. See
 * `lib/appointments/availability.ts`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Generous — the picker refetches on every date change — but not a free scan. */
const RATE_LIMIT = { max: 60, windowMs: 60_000 };

export async function GET(request: Request): Promise<Response> {
  const requestHeaders = await headers();
  const limit = checkRateLimit(
    clientKey(requestHeaders, "availability"),
    RATE_LIMIT.max,
    RATE_LIMIT.windowMs,
  );
  if (!limit.ok) {
    return Response.json(
      { ok: false, error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const url = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({ date: url.searchParams.get("date") ?? "" });

  if (!parsed.success) {
    return Response.json({ ok: false, error: "Choose a date." }, { status: 400 });
  }

  try {
    const [day, days] = await Promise.all([
      getDayAvailability(parsed.data.date),
      getUpcomingDays(7),
    ]);

    return Response.json({ ok: true, day, days });
  } catch (error) {
    console.error("[appointments] availability route failed:", error);
    return Response.json(
      { ok: false, error: "We couldn't load times right now." },
      { status: 500 },
    );
  }
}
