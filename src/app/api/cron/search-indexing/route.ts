import { authorizeCron, cronDenied, cronResult } from "@/lib/seo/cron-auth";
import { runSearchDiscovery } from "@/lib/seo/search-discovery";

/**
 * Search-discovery notification.
 *
 * Announces URLs whose content genuinely changed since they were last announced,
 * via IndexNow. Idempotent by construction: the submission ledger records what
 * was sent and with which content stamp, so a second run minutes later submits
 * nothing.
 *
 * IndexNow reaches Bing, Yandex, Seznam and Naver. **Google does not use it** —
 * Google discovery here is the sitemap, honest `lastmod` values, internal
 * linking and Search Console, none of which this route touches.
 *
 * With `INDEXNOW_KEY` unset the route succeeds and reports `configured: false`
 * without sending anything, which is the intended state until a key is issued.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const auth = authorizeCron(request);
  if (!auth.ok) return cronDenied(auth);

  try {
    const report = await runSearchDiscovery();
    console.log(
      `[cron:search-indexing] configured=${report.configured} persisted=${report.persisted} candidates=${report.candidates} pending=${report.pending} submitted=${report.submitted} deferred=${report.deferred}`,
    );
    if (report.note) console.warn(`[cron:search-indexing] ${report.note}`);
    return cronResult({ ...report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search discovery failed";
    console.error("[cron:search-indexing] threw:", message);
    return cronResult({ ok: false, error: message }, 500);
  }
}
