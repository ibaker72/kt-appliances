import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/client";

/**
 * A record of which URLs have been announced to search engines, and when.
 *
 * WHY THIS TABLE EXISTS.
 *
 * Without it, "submit everything updated since the last run" has no definition
 * of "last run", and the honest implementations both fail: submitting the whole
 * sitemap every night is exactly the artificial churn this system is supposed to
 * avoid, and keeping the cursor in memory loses it on every cold start, which on
 * serverless means most runs. So the ledger is persisted, keyed by URL, and a
 * URL is only re-announced when its content stamp is genuinely newer than the
 * stamp we last submitted for it.
 *
 * WHEN SUPABASE IS NOT CONFIGURED the ledger degrades to unavailable and the
 * cron reports `persisted: false` and submits nothing, rather than submitting
 * blind. That is the safe direction: a missed notification costs a slower
 * recrawl, a repeated one costs credibility with the endpoint.
 */

const TABLE = "seo_url_submissions";

export interface SubmissionRecord {
  url: string;
  /** The content timestamp that was current when the URL was submitted. */
  contentUpdatedAt: string;
  submittedAt: string;
}

export interface SubmissionCandidate {
  url: string;
  /** ISO timestamp of the underlying content's last real change. */
  contentUpdatedAt: string;
}

export function isSubmissionLogAvailable(): boolean {
  return getSupabaseAdminClient() !== null;
}

/** Previously submitted URLs, as a map for O(1) comparison against candidates. */
export async function loadSubmissions(urls: string[]): Promise<Map<string, SubmissionRecord> | null> {
  const client = getSupabaseAdminClient();
  if (!client || urls.length === 0) return client ? new Map() : null;

  const { data, error } = await client
    .from(TABLE)
    .select("url, content_updated_at, submitted_at")
    .in("url", urls);

  if (error) {
    console.error("[seo] submission log read failed:", error.message);
    return null;
  }

  const map = new Map<string, SubmissionRecord>();
  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    map.set(String(record.url), {
      url: String(record.url),
      contentUpdatedAt: String(record.content_updated_at),
      submittedAt: String(record.submitted_at),
    });
  }
  return map;
}

/**
 * Candidates whose content is newer than what was last announced for them.
 *
 * An unparseable stamp on either side is treated as "not newer" so a bad
 * timestamp cannot cause a URL to be resubmitted on every single run.
 */
export function pendingSubmissions(
  candidates: SubmissionCandidate[],
  submitted: Map<string, SubmissionRecord>,
): SubmissionCandidate[] {
  return candidates.filter((candidate) => {
    const previous = submitted.get(candidate.url);
    if (!previous) return true;
    const current = Date.parse(candidate.contentUpdatedAt);
    const last = Date.parse(previous.contentUpdatedAt);
    if (Number.isNaN(current) || Number.isNaN(last)) return false;
    return current > last;
  });
}

/**
 * Records a successful submission.
 *
 * Upsert on `url`, so re-announcing a page moves its stamp forward rather than
 * growing the table. Only called after the endpoint accepted the batch — a
 * failed submission leaves the ledger untouched so the next run retries it
 * naturally, with no retry bookkeeping of its own.
 */
export async function recordSubmissions(candidates: SubmissionCandidate[]): Promise<boolean> {
  const client = getSupabaseAdminClient();
  if (!client || candidates.length === 0) return false;

  const now = new Date().toISOString();
  const { error } = await client.from(TABLE).upsert(
    candidates.map((candidate) => ({
      url: candidate.url,
      content_updated_at: candidate.contentUpdatedAt,
      submitted_at: now,
    })),
    { onConflict: "url" },
  );

  if (error) {
    console.error("[seo] submission log write failed:", error.message);
    return false;
  }
  return true;
}
