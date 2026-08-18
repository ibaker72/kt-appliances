import { indexNowKey } from "@/lib/seo/indexnow";

/**
 * The IndexNow ownership proof.
 *
 * The protocol requires the key to be readable at a URL on this host so the
 * engine can confirm whoever submitted the URLs controls the domain. That makes
 * this file public by design — it is not a credential, and the only thing it
 * authorises is "notify search engines about pages on kt-appliances.com".
 *
 * 404s when no key is configured, so the file never exists as an empty response
 * that an engine would treat as a failed verification.
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });

  return new Response(key, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
      // Useful to a verifier, useless in an index.
      "x-robots-tag": "noindex",
    },
  });
}
