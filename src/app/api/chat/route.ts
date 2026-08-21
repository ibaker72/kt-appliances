import { headers } from "next/headers";

import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { runAssistant, freeTextAvailable } from "@/lib/chat/assistant";
import { chatRequestSchema } from "@/lib/chat/schema";
import { siteConfig } from "@/lib/site-config";

/**
 * The chat assistant endpoint.
 *
 * Public and unauthenticated, so it is treated as an attack surface first and a
 * feature second. In order:
 *
 *   1. Content type and body size, before anything is parsed.
 *   2. Per-IP rate limit, tighter for the kinds that can reach a paid provider.
 *   3. Zod, against the closed grammar in `chat/schema.ts`.
 *
 * Nothing downstream ever sees an unvalidated value, and no failure mode returns
 * an internal error, a provider message, a database message or a stack trace —
 * every error path returns fixed copy plus a phone number, because a shopper
 * hitting a broken assistant should still end up able to reach the warehouse.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bigger than the largest legitimate request (a max-length message plus ten
 * capped history turns) and far smaller than anything worth parsing twice.
 */
const MAX_BODY_BYTES = 16_000;

/** Guided taps are cheap and frequent. */
const STRUCTURED_LIMIT = { max: 40, windowMs: 60_000 };

/**
 * Typed questions can reach a billable provider, so they get their own, much
 * tighter bucket. A person types a handful of questions a minute; anything past
 * that is a script.
 */
const MESSAGE_LIMIT = { max: 8, windowMs: 60_000 };

function fail(status: number, text: string) {
  return Response.json(
    {
      items: [
        { type: "assistant_message", id: `err-${Date.now()}`, text, tone: "warning" },
        {
          type: "quick_actions",
          id: `err-actions-${Date.now()}`,
          actions: [
            { kind: "call", id: "err-call", label: `Call ${siteConfig.phone.display}`, emoji: "☎️" },
            { kind: "text", id: "err-text", label: "Text the store", emoji: "📱" },
          ],
        },
      ],
      ai: false,
    },
    { status },
  );
}

export async function POST(request: Request): Promise<Response> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return fail(415, "Something went wrong on our end.");
  }

  // Reject on the declared length before reading, then again on the real length
  // after — a missing or lying `content-length` must not buy an unbounded read.
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return fail(413, "That message is too long. Try a shorter one.");
  }

  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > MAX_BODY_BYTES) {
      return fail(413, "That message is too long. Try a shorter one.");
    }
    raw = JSON.parse(body);
  } catch {
    return fail(400, "Something went wrong on our end.");
  }

  const parsed = chatRequestSchema.safeParse(raw);
  if (!parsed.success) {
    // The visitor never sees which field failed: this endpoint is driven by the
    // panel, so a validation error means a malformed or crafted request, and
    // enumerating the schema for it serves nobody.
    return fail(400, "I didn't catch that. Try one of the options below.");
  }

  const requestHeaders = await headers();
  const limit =
    parsed.data.kind === "message"
      ? checkRateLimit(clientKey(requestHeaders, "chat-message"), MESSAGE_LIMIT.max, MESSAGE_LIMIT.windowMs)
      : checkRateLimit(
          clientKey(requestHeaders, "chat"),
          STRUCTURED_LIMIT.max,
          STRUCTURED_LIMIT.windowMs,
        );

  if (!limit.ok) {
    return fail(
      429,
      `Give me a moment to catch up. You can call or text ${siteConfig.phone.display} any time.`,
    );
  }

  try {
    const response = await runAssistant(parsed.data);
    return Response.json({ ...response, freeText: freeTextAvailable() });
  } catch (error) {
    // Logged server-side in full; the browser gets copy and a way to reach a
    // person. Never the message, never the stack.
    console.error("[chat] assistant failed:", error);
    return fail(
      500,
      `I'm having trouble right now. You can still browse inventory, or call or text ${siteConfig.phone.display}.`,
    );
  }
}
