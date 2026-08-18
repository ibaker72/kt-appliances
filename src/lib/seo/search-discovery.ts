import "server-only";

import { getIndexableProducts } from "@/lib/inventory/repository";
import { guideRouteEntries, locationRouteEntries } from "@/lib/seo/routes";
import {
  INDEXNOW_BATCH_SIZE,
  isIndexNowConfigured,
  submitToIndexNow,
  type IndexNowOutcome,
} from "@/lib/seo/indexnow";
import {
  isSubmissionLogAvailable,
  loadSubmissions,
  pendingSubmissions,
  recordSubmissions,
  type SubmissionCandidate,
} from "@/lib/seo/submission-log";
import { absoluteUrl } from "@/lib/site-config";

/**
 * What gets announced to search engines when it genuinely changes.
 *
 * The candidate set is narrow on purpose: product pages, service-area pages and
 * guides. Those are the three things with a real content timestamp behind them.
 * The homepage, the category pages and the listing pages are excluded — they
 * change composition constantly without their *content* changing, and announcing
 * them nightly would be exactly the fake-freshness churn this system is built
 * not to produce. Those are discovered through the sitemap and internal links,
 * which is how they should be.
 */

export interface DiscoveryReport {
  ok: boolean;
  ranAt: string;
  configured: boolean;
  persisted: boolean;
  candidates: number;
  pending: number;
  submitted: number;
  batchSize: number;
  /** Pending URLs left for the next run once the batch cap was reached. */
  deferred: number;
  outcome: IndexNowOutcome | null;
  note?: string;
}

/** Everything with an honest "last changed" stamp, as submission candidates. */
export async function discoveryCandidates(): Promise<SubmissionCandidate[]> {
  const products = await getIndexableProducts();

  const productUrls = products.map((product) => ({
    url: absoluteUrl(`/inventory/${product.slug}`),
    contentUpdatedAt: product.updatedAt,
  }));

  const contentUrls = [...locationRouteEntries(), ...guideRouteEntries()].map((entry) => ({
    url: absoluteUrl(entry.path),
    contentUpdatedAt: entry.lastModified.toISOString(),
  }));

  return [...productUrls, ...contentUrls].filter((candidate) => {
    const parsed = Date.parse(candidate.contentUpdatedAt);
    return !Number.isNaN(parsed);
  });
}

/**
 * One discovery run.
 *
 * Nothing is recorded as submitted unless the endpoint accepted it, so a failed
 * run simply leaves the same URLs pending for next time — no retry queue, no
 * backoff state, no way to drift out of sync with what was actually announced.
 *
 * Ordering is newest-first, so when there are more pending URLs than fit in a
 * batch, the ones announced are the ones that changed most recently.
 */
export async function runSearchDiscovery(): Promise<DiscoveryReport> {
  const ranAt = new Date().toISOString();
  const configured = isIndexNowConfigured();
  const persisted = isSubmissionLogAvailable();

  const candidates = await discoveryCandidates();

  const base: DiscoveryReport = {
    ok: true,
    ranAt,
    configured,
    persisted,
    candidates: candidates.length,
    pending: 0,
    submitted: 0,
    batchSize: INDEXNOW_BATCH_SIZE,
    deferred: 0,
    outcome: null,
  };

  if (!configured) {
    return {
      ...base,
      note: "INDEXNOW_KEY is not set. Nothing was submitted. Google does not use IndexNow, so this affects Bing-family engines only.",
    };
  }

  if (!persisted) {
    // Submitting without the ledger would mean resubmitting the same URLs on
    // every run forever, which is the behaviour the ledger exists to prevent.
    return {
      ...base,
      ok: false,
      note: "Submission ledger unavailable (Supabase service-role credentials not configured). Skipped rather than resubmit blind.",
    };
  }

  const submissions = await loadSubmissions(candidates.map((candidate) => candidate.url));
  if (!submissions) {
    return { ...base, ok: false, note: "Submission ledger could not be read. Nothing was submitted." };
  }

  const pending = pendingSubmissions(candidates, submissions).sort(
    (a, b) => Date.parse(b.contentUpdatedAt) - Date.parse(a.contentUpdatedAt),
  );

  if (pending.length === 0) {
    return { ...base, note: "Nothing has changed since the last run." };
  }

  const batch = pending.slice(0, INDEXNOW_BATCH_SIZE);
  const outcome = await submitToIndexNow(batch.map((candidate) => candidate.url));

  if (outcome.status === "submitted") {
    const recorded = await recordSubmissions(batch);
    return {
      ...base,
      pending: pending.length,
      submitted: outcome.submitted,
      deferred: pending.length - batch.length,
      outcome,
      ...(recorded
        ? {}
        : {
            ok: false,
            note: "URLs were submitted but the ledger write failed, so they will be submitted again next run.",
          }),
    };
  }

  return {
    ...base,
    ok: outcome.status !== "failed",
    pending: pending.length,
    deferred: pending.length,
    outcome,
    note:
      outcome.status === "failed"
        ? "Submission was rejected. Nothing was recorded, so the same URLs are retried on the next run."
        : undefined,
  };
}
