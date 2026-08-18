import "server-only";

import { SITE_URL } from "@/lib/site-config";

/**
 * IndexNow.
 *
 * WHAT THIS DOES AND DOES NOT DO.
 *
 * IndexNow is a notification protocol supported by Bing, Yandex, Seznam and
 * Naver. Submitting a URL tells those engines a page changed so they can
 * schedule a recrawl sooner. It does NOT index anything, it is not a ranking
 * signal, and **Google does not participate** — nothing here affects Google
 * Search in any way. Google discovery is handled the way it actually works: a
 * correct sitemap with honest `lastmod` values, internal linking, and Search
 * Console.
 *
 * It is off unless `INDEXNOW_KEY` is set, and everything below degrades to a
 * no-op rather than an error when it is absent.
 *
 * The key is not a secret in the usual sense — the protocol requires it to be
 * publicly readable at `keyLocation` so the engine can verify the submitter owns
 * the host — but it is still kept server-side and out of `NEXT_PUBLIC_`, because
 * the only thing it authorises is submissions for this domain and there is no
 * reason to ship it in a JavaScript bundle.
 */

/** Where the key file is served from. The protocol requires it to be reachable. */
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

const ENDPOINT = "https://api.indexnow.org/indexnow";

/** The protocol's per-request ceiling. */
export const INDEXNOW_MAX_URLS = 10_000;

/** Our own, much lower, per-run ceiling. See `submitToIndexNow`. */
export const INDEXNOW_BATCH_SIZE = 100;

export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) return null;
  // The protocol allows 8–128 hex-ish characters. A malformed key produces a
  // 422 from the endpoint, so it is rejected here rather than sent.
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) return null;
  return key;
}

export function isIndexNowConfigured(): boolean {
  return indexNowKey() !== null;
}

export type IndexNowOutcome =
  | { status: "skipped"; reason: "not-configured" | "no-urls"; submitted: 0 }
  | { status: "submitted"; submitted: number; httpStatus: number }
  | { status: "failed"; submitted: 0; httpStatus: number | null; error: string };

/**
 * Submits a batch of URLs.
 *
 * Deliberately not retried in a loop. A failed submission is not a lost page —
 * the next scheduled run picks the same URLs back up because they were never
 * recorded as submitted — so hammering a third-party endpoint on a bad day buys
 * nothing. One attempt, a short timeout, and an honest result.
 *
 * Every URL is checked against the canonical origin before it is sent: the
 * endpoint rejects a whole batch if one entry is off-host, and submitting URLs
 * for a domain you do not control is the abuse this protocol guards against.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowOutcome> {
  const key = indexNowKey();
  if (!key) return { status: "skipped", reason: "not-configured", submitted: 0 };

  const host = new URL(SITE_URL).host;
  const urlList = [...new Set(urls)]
    .filter((url) => {
      try {
        return new URL(url).host === host;
      } catch {
        return false;
      }
    })
    .slice(0, Math.min(INDEXNOW_BATCH_SIZE, INDEXNOW_MAX_URLS));

  if (urlList.length === 0) return { status: "skipped", reason: "no-urls", submitted: 0 };

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: new URL(INDEXNOW_KEY_PATH, SITE_URL).toString(),
        urlList,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    // 200 and 202 both mean accepted. Anything else is a real rejection and the
    // URLs must not be marked as submitted.
    if (response.status === 200 || response.status === 202) {
      return { status: "submitted", submitted: urlList.length, httpStatus: response.status };
    }
    return {
      status: "failed",
      submitted: 0,
      httpStatus: response.status,
      error: `IndexNow responded ${response.status}`,
    };
  } catch (error) {
    return {
      status: "failed",
      submitted: 0,
      httpStatus: null,
      error: error instanceof Error ? error.message : "IndexNow request failed",
    };
  }
}
