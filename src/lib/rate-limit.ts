import "server-only";

/**
 * Fixed-window rate limiter held in process memory.
 *
 * This is deliberately simple. It stops the obvious case — one client hammering
 * a form — without adding an external dependency for launch. Limitation worth
 * knowing: the counter is per server instance, so a horizontally scaled
 * deployment enforces the limit per instance rather than globally. Swapping in
 * a shared store (Upstash Redis, or a Postgres table) only requires reimplementing
 * `checkRateLimit` — no call site changes.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

export function checkRateLimit(key: string, limit = 5, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    // Opportunistic cleanup so a burst of unique keys cannot grow the map forever.
    if (buckets.size > MAX_TRACKED_KEYS) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const retryAfter = Math.ceil((existing.resetAt - now) / 1000);

  if (existing.count > limit) {
    return { ok: false, remaining: 0, retryAfter };
  }
  return { ok: true, remaining: limit - existing.count, retryAfter };
}

/**
 * Best-effort client IP. Behind Vercel/most proxies `x-forwarded-for` is set and
 * the first entry is the client. Falls back to a constant so a missing header
 * degrades to a shared bucket rather than to no limit at all.
 */
export function clientKey(headers: Headers, scope: string): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("cf-connecting-ip")?.trim() ||
    "unknown";
  return `${scope}:${ip}`;
}
