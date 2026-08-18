import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

/**
 * Scheduled routes.
 *
 * Three properties are asserted here because all three fail silently in
 * production:
 *
 *   AUTHENTICATION — an unauthenticated cron endpoint is an open endpoint. This
 *   one reports on the catalogue and, in the discovery route's case, fires
 *   requests at a third party, so "it is an obscure URL" is not a control.
 *
 *   FAIL-CLOSED — with `CRON_SECRET` unset the routes must refuse to run rather
 *   than run unauthenticated. A forgotten environment variable should be a loud
 *   503, not a quietly public endpoint.
 *
 *   IDEMPOTENCE — a second run minutes after the first must submit nothing. This
 *   is what stops the discovery job from becoming the artificial-freshness churn
 *   it exists to avoid.
 *
 * Nothing here reaches the network: IndexNow is unconfigured, Supabase is
 * unconfigured, and the one test that exercises submission stubs `fetch`.
 */

const SECRET = "test-cron-secret-value";

const { authorizeCron } = await import("@/lib/seo/cron-auth");
const { pendingSubmissions } = await import("@/lib/seo/submission-log");
const { isIndexNowConfigured, indexNowKey, submitToIndexNow } = await import("@/lib/seo/indexnow");
const seoHealthRoute = await import("@/app/api/cron/seo-health/route");
const searchIndexingRoute = await import("@/app/api/cron/search-indexing/route");

const originalFetch = globalThis.fetch;

afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.INDEXNOW_KEY;
  globalThis.fetch = originalFetch;
});

function request(token?: string): Request {
  return new Request("https://ktappliances.com/api/cron/seo-health", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("cron authentication", () => {
  test("no CRON_SECRET configured means the route is disabled, not open", () => {
    delete process.env.CRON_SECRET;
    const auth = authorizeCron(request(SECRET));
    assert.equal(auth.ok, false);
    assert.equal(auth.ok === false && auth.status, 503);
  });

  test("a missing Authorization header is rejected", () => {
    process.env.CRON_SECRET = SECRET;
    const auth = authorizeCron(request());
    assert.equal(auth.ok, false);
    assert.equal(auth.ok === false && auth.status, 401);
  });

  test("a wrong secret is rejected", () => {
    process.env.CRON_SECRET = SECRET;
    assert.equal(authorizeCron(request("not-the-secret")).ok, false);
  });

  test("a secret of a different length is rejected without throwing", () => {
    // Constant-time comparison throws on unequal buffer lengths if used naively.
    process.env.CRON_SECRET = SECRET;
    assert.equal(authorizeCron(request("short")).ok, false);
    assert.equal(authorizeCron(request(`${SECRET}-longer`)).ok, false);
  });

  test("the correct secret is accepted", () => {
    process.env.CRON_SECRET = SECRET;
    assert.equal(authorizeCron(request(SECRET)).ok, true);
  });

  test("the secret is not accepted from the querystring", () => {
    // A secret in a URL lands in access logs and referrers.
    process.env.CRON_SECRET = SECRET;
    const url = new Request(`https://ktappliances.com/api/cron/seo-health?secret=${SECRET}`);
    assert.equal(authorizeCron(url).ok, false);
  });

  test("a bare token without the Bearer scheme is rejected", () => {
    process.env.CRON_SECRET = SECRET;
    const bare = new Request("https://ktappliances.com/api/cron/seo-health", {
      headers: { authorization: SECRET },
    });
    assert.equal(authorizeCron(bare).ok, false);
  });
});

describe("seo-health route", () => {
  test("unauthorized requests get 401 and no report", async () => {
    process.env.CRON_SECRET = SECRET;
    const response = await seoHealthRoute.GET(request("wrong"));
    assert.equal(response.status, 401);
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(body.ok, false);
    assert.equal(body.checks, undefined);
  });

  test("an unconfigured secret gets 503", async () => {
    delete process.env.CRON_SECRET;
    const response = await seoHealthRoute.GET(request(SECRET));
    assert.equal(response.status, 503);
  });

  test("an authorized request returns a structured report", async () => {
    process.env.CRON_SECRET = SECRET;
    const response = await seoHealthRoute.GET(request(SECRET));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");

    const body = (await response.json()) as Record<string, unknown>;
    assert.ok(Array.isArray(body.checks));
    assert.ok(typeof body.sitemap === "object");
    assert.ok(typeof body.locations === "object");
    assert.ok(typeof body.inventory === "object");
    assert.equal((body.canonicalOrigin as string), "https://ktappliances.com");
  });

  test("it reports on the things it claims to check", async () => {
    process.env.CRON_SECRET = SECRET;
    const response = await seoHealthRoute.GET(request(SECRET));
    const body = (await response.json()) as { checks: Array<{ name: string; status: string }> };
    const names = body.checks.map((check) => check.name);
    for (const expected of [
      "canonical-domain",
      "robots",
      "sitemap",
      "locations",
      "nap-phone",
      "nap-address",
      "inventory-slugs",
      "guides",
    ]) {
      assert.ok(names.includes(expected), `health check is missing "${expected}"`);
    }
  });

  test("the NAP and location checks pass on the current data", async () => {
    process.env.CRON_SECRET = SECRET;
    const response = await seoHealthRoute.GET(request(SECRET));
    const body = (await response.json()) as { checks: Array<{ name: string; status: string; detail: string }> };
    for (const name of ["nap-phone", "nap-address", "locations", "robots", "sitemap"]) {
      const check = body.checks.find((entry) => entry.name === name);
      assert.ok(check);
      assert.notEqual(check.status, "fail", `${name} failed: ${check.detail}`);
    }
  });
});

describe("search-indexing route", () => {
  test("unauthorized requests get 401", async () => {
    process.env.CRON_SECRET = SECRET;
    const response = await searchIndexingRoute.GET(request("wrong"));
    assert.equal(response.status, 401);
  });

  test("with no IndexNow key it succeeds and submits nothing", async () => {
    // The intended state until a key is issued: a clean no-op, not a crash.
    process.env.CRON_SECRET = SECRET;
    delete process.env.INDEXNOW_KEY;
    globalThis.fetch = (() => {
      throw new Error("the discovery route must not make a request when unconfigured");
    }) as typeof fetch;

    const response = await searchIndexingRoute.GET(request(SECRET));
    assert.equal(response.status, 200);
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(body.ok, true);
    assert.equal(body.configured, false);
    assert.equal(body.submitted, 0);
    assert.match(String(body.note), /INDEXNOW_KEY/);
  });

  test("with a key but no ledger it refuses rather than resubmit blind", async () => {
    // Supabase is unconfigured in tests, so the ledger is unavailable. Without
    // it there is no way to know what was already announced, and submitting
    // anyway would mean resubmitting the same URLs on every single run.
    process.env.CRON_SECRET = SECRET;
    process.env.INDEXNOW_KEY = "abcdef0123456789abcdef0123456789";
    globalThis.fetch = (() => {
      throw new Error("must not submit without the ledger");
    }) as typeof fetch;

    const response = await searchIndexingRoute.GET(request(SECRET));
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(body.configured, true);
    assert.equal(body.persisted, false);
    assert.equal(body.submitted, 0);
    assert.match(String(body.note), /ledger/i);
  });
});

describe("IndexNow configuration", () => {
  test("it is off unless a key is set", () => {
    delete process.env.INDEXNOW_KEY;
    assert.equal(isIndexNowConfigured(), false);
    assert.equal(indexNowKey(), null);
  });

  test("a malformed key is treated as unconfigured rather than sent", () => {
    for (const key of ["short", "has spaces in it", "!!!!!!!!!!!!"]) {
      process.env.INDEXNOW_KEY = key;
      assert.equal(indexNowKey(), null, `"${key}" should be rejected`);
    }
  });

  test("submitting with no key is a skip, not an error", async () => {
    delete process.env.INDEXNOW_KEY;
    const outcome = await submitToIndexNow(["https://ktappliances.com/inventory/x"]);
    assert.equal(outcome.status, "skipped");
    assert.equal(outcome.submitted, 0);
  });

  test("URLs on another host are dropped before anything is sent", async () => {
    process.env.INDEXNOW_KEY = "abcdef0123456789abcdef0123456789";
    globalThis.fetch = (() => {
      throw new Error("must not submit a batch of off-host URLs");
    }) as typeof fetch;

    const outcome = await submitToIndexNow([
      "https://example.com/inventory/x",
      "not-a-url",
    ]);
    assert.equal(outcome.status, "skipped");
  });

  test("an accepted submission reports what it sent", async () => {
    process.env.INDEXNOW_KEY = "abcdef0123456789abcdef0123456789";
    const seen: Array<Record<string, unknown>> = [];
    globalThis.fetch = (async (_input: unknown, init?: { body?: string }) => {
      seen.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(null, { status: 202 });
    }) as unknown as typeof fetch;

    const outcome = await submitToIndexNow([
      "https://ktappliances.com/inventory/a",
      "https://ktappliances.com/inventory/b",
      "https://ktappliances.com/inventory/a",
    ]);

    assert.equal(outcome.status, "submitted");
    // Duplicates are collapsed before sending.
    assert.equal(outcome.submitted, 2);
    assert.equal(seen[0].host, "ktappliances.com");
    assert.equal(seen[0].keyLocation, "https://ktappliances.com/indexnow-key.txt");
  });

  test("a rejected submission reports zero submitted", async () => {
    process.env.INDEXNOW_KEY = "abcdef0123456789abcdef0123456789";
    globalThis.fetch = (async () => new Response(null, { status: 422 })) as typeof fetch;

    const outcome = await submitToIndexNow(["https://ktappliances.com/inventory/a"]);
    assert.equal(outcome.status, "failed");
    // Nothing is recorded as submitted, so the next run naturally retries it.
    assert.equal(outcome.submitted, 0);
  });

  test("a network failure is reported rather than thrown", async () => {
    process.env.INDEXNOW_KEY = "abcdef0123456789abcdef0123456789";
    globalThis.fetch = (async () => {
      throw new Error("connection reset");
    }) as typeof fetch;

    const outcome = await submitToIndexNow(["https://ktappliances.com/inventory/a"]);
    assert.equal(outcome.status, "failed");
  });
});

describe("submission idempotence", () => {
  const url = "https://ktappliances.com/inventory/lg-fridge";

  test("a URL never submitted is pending", () => {
    const pending = pendingSubmissions([{ url, contentUpdatedAt: "2026-08-01T00:00:00Z" }], new Map());
    assert.equal(pending.length, 1);
  });

  test("a URL already submitted at the same stamp is not resubmitted", () => {
    // The whole point: running the job twice in a row must send nothing the
    // second time.
    const stamp = "2026-08-01T00:00:00Z";
    const log = new Map([[url, { url, contentUpdatedAt: stamp, submittedAt: stamp }]]);
    assert.deepEqual(pendingSubmissions([{ url, contentUpdatedAt: stamp }], log), []);
  });

  test("a URL whose content genuinely changed is resubmitted", () => {
    const log = new Map([
      [url, { url, contentUpdatedAt: "2026-08-01T00:00:00Z", submittedAt: "2026-08-01T01:00:00Z" }],
    ]);
    const pending = pendingSubmissions([{ url, contentUpdatedAt: "2026-08-05T00:00:00Z" }], log);
    assert.equal(pending.length, 1);
  });

  test("an older content stamp does not trigger a resubmission", () => {
    const log = new Map([
      [url, { url, contentUpdatedAt: "2026-08-10T00:00:00Z", submittedAt: "2026-08-10T01:00:00Z" }],
    ]);
    assert.deepEqual(pendingSubmissions([{ url, contentUpdatedAt: "2026-08-01T00:00:00Z" }], log), []);
  });

  test("an unparseable stamp does not cause an endless resubmit loop", () => {
    const log = new Map([
      [url, { url, contentUpdatedAt: "not-a-date", submittedAt: "2026-08-10T01:00:00Z" }],
    ]);
    assert.deepEqual(pendingSubmissions([{ url, contentUpdatedAt: "also-not-a-date" }], log), []);
  });
});
