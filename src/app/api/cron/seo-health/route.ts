import { authorizeCron, cronDenied, cronResult } from "@/lib/seo/cron-auth";
import { runSeoHealthCheck } from "@/lib/seo/health";

/**
 * Daily SEO health check.
 *
 * Read-only. It changes nothing, publishes nothing and sends nothing — it
 * inspects the application's own data and generators and reports what it found.
 * Safe to run by hand at any time.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET`, which is what Vercel Cron sends
 * when the project has `CRON_SECRET` set. 401 without it, 503 when the variable
 * is missing entirely.
 *
 * The HTTP status carries the verdict so a monitor does not have to parse the
 * body: 200 when everything passes or only warns, 200 with `ok: false` and
 * `status: "fail"` when a check fails — a failing *check* is not a failing
 * *endpoint*, and returning 500 for it would make a real outage indistinguishable
 * from a missing product photo.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const auth = authorizeCron(request);
  if (!auth.ok) return cronDenied(auth);

  try {
    const report = await runSeoHealthCheck();
    // One structured line per run, so the Vercel log is greppable.
    console.log(
      `[cron:seo-health] status=${report.status} sitemap=${report.sitemap.total} locations=${report.locations.indexable}/${report.locations.total} products=${report.inventory.published}`,
    );
    for (const check of report.checks) {
      if (check.status !== "pass") {
        console.warn(`[cron:seo-health] ${check.status}: ${check.name} — ${check.detail}`);
      }
    }
    return cronResult({ ...report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed";
    console.error("[cron:seo-health] threw:", message);
    return cronResult({ ok: false, error: message }, 500);
  }
}
