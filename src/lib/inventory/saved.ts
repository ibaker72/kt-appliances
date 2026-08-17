/**
 * Saved-appliance list.
 *
 * Stored as a cookie rather than `localStorage` so `/inventory/saved` can render
 * it on the server, and as slugs only — the saved page re-queries the catalogue,
 * so a saved unit always shows its current price and current availability rather
 * than a snapshot from whenever it was saved. A unit that sells shows as sold.
 *
 * Pure module: imported by both the client toggle and the server page.
 */

export const SAVED_COOKIE = "kt_saved";

/** Enough for a kitchen's worth of shortlisting, and well inside the 4KB cookie limit. */
export const SAVED_LIMIT = 40;

/** Slugs are `[a-z0-9-]`, so a comma-joined list needs no escaping. */
export function parseSaved(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((slug) => slug.trim())
        .filter((slug) => /^[a-z0-9-]{1,120}$/.test(slug)),
    ),
  ].slice(0, SAVED_LIMIT);
}

export function serializeSaved(slugs: string[]): string {
  return slugs.slice(0, SAVED_LIMIT).join(",");
}
