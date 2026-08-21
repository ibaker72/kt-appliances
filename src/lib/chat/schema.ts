import { z } from "zod";

import { APPLIANCE_CATEGORIES } from "@/lib/inventory/types";

/**
 * Everything the chat endpoint will accept.
 *
 * `/api/chat` is a public, unauthenticated POST, so this file is the boundary:
 * nothing past it sees a value that has not been through here. Three rules
 * shape it.
 *
 * 1. **Closed sets wherever a closed set exists.** A category is one of seven
 *    strings, a step is one of a known grammar, a budget is one of five ids. The
 *    schema rejects rather than sanitising, because a category the client made
 *    up is not a typo to be fixed — it is a request to be refused.
 *
 * 2. **Everything is bounded.** Message length, history length, per-turn length,
 *    pathname length. An unbounded field on this route is either a way to run up
 *    a model bill or a way to push something past a downstream limit.
 *
 * 3. **History is advisory.** The client sends back what it was shown, and a
 *    crafted client can send anything. So history never decides what the server
 *    *does* — the step grammar does — and when it reaches the model it is
 *    clearly fenced as untrusted transcript. See `ai.ts`.
 */

/** One message. Long enough for a real question, short enough to bound a prompt. */
export const MAX_MESSAGE_LENGTH = 600;

/** Turns of history the client may replay. Ten exchanges is far more than any flow needs. */
export const MAX_HISTORY_TURNS = 10;

/** Per-turn cap inside the history array. */
const MAX_HISTORY_TURN_LENGTH = 800;

/**
 * The step grammar.
 *
 * `find`, `find:category:refrigerators`, `appointment:purpose:financing`. Kept
 * as a pattern rather than an enum because the leaf segments are ids from the
 * catalogues (categories, purposes, budgets) and re-listing them here would be a
 * second copy to drift. Each segment is validated by the router against the real
 * catalogue; anything unrecognised falls back to the root menu.
 */
const stepSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?::[a-z0-9-]+){0,2}$/, "Unknown step");

const pathnameSchema = z
  .string()
  .trim()
  .max(512)
  .transform((value) => (value.startsWith("/") ? value : "/"));

const searchFiltersSchema = z.object({
  category: z.enum(APPLIANCE_CATEGORIES).optional(),
  preference: z.string().trim().max(40).optional(),
  maxPrice: z.number().int().positive().max(100_000).optional(),
  brand: z.string().trim().max(60).optional(),
  query: z.string().trim().max(80).optional(),
});

const historySchema = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string().trim().max(MAX_HISTORY_TURN_LENGTH),
    }),
  )
  .max(MAX_HISTORY_TURNS)
  // Newer turns are the ones worth keeping when a client sends too many.
  .transform((turns) => turns.slice(-MAX_HISTORY_TURNS))
  .optional()
  .default([]);

export const chatRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("greeting"),
    pathname: pathnameSchema,
  }),
  z.object({
    kind: z.literal("step"),
    step: stepSchema,
    pathname: pathnameSchema,
    filters: searchFiltersSchema.optional(),
  }),
  z.object({
    kind: z.literal("message"),
    message: z.string().trim().min(1, "Type a question").max(MAX_MESSAGE_LENGTH),
    pathname: pathnameSchema,
    history: historySchema,
  }),
]);

export type ChatRequest = z.output<typeof chatRequestSchema>;

/** `GET /api/appointments/availability` — one day at a time. */
export const availabilityQuerySchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
});
