"use client";

/**
 * Campaign attribution capture.
 *
 * Paid traffic lands on a page carrying UTM parameters (and sometimes `fbclid` /
 * `gclid`), then usually navigates before converting. We snapshot the first touch
 * into sessionStorage so every lead submitted in that session carries the campaign
 * that produced it, and the landing page it started on.
 */

const STORAGE_KEY = "kt_attribution";

export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPage?: string;
  referrer?: string;
  clickId?: string;
}

const UTM_KEYS: Array<[keyof Attribution, string]> = [
  ["utmSource", "utm_source"],
  ["utmMedium", "utm_medium"],
  ["utmCampaign", "utm_campaign"],
  ["utmContent", "utm_content"],
  ["utmTerm", "utm_term"],
];

function readStored(): Attribution | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

/**
 * Records first-touch attribution. Called once on mount from the root layout.
 * A later page view with new UTMs overwrites the campaign fields — that is a new
 * ad click and should be credited to the newer campaign — but the original
 * landing page is preserved.
 */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};

  const existing = readStored() ?? {};
  const params = new URLSearchParams(window.location.search);
  const next: Attribution = { ...existing };

  let sawUtm = false;
  for (const [key, param] of UTM_KEYS) {
    const value = params.get(param);
    if (value) {
      next[key] = value.slice(0, 120);
      sawUtm = true;
    }
  }

  const clickId = params.get("fbclid") ?? params.get("gclid") ?? params.get("ttclid");
  if (clickId) next.clickId = clickId.slice(0, 255);

  if (!next.landingPage) {
    next.landingPage = `${window.location.pathname}${window.location.search}`.slice(0, 500);
  }
  if (!next.referrer && document.referrer && !document.referrer.includes(window.location.host)) {
    next.referrer = document.referrer.slice(0, 500);
  }

  // A fresh ad click with no UTMs shouldn't wipe an earlier campaign.
  if (!sawUtm && !clickId && existing.utmSource) return existing;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private browsing — attribution is best effort */
  }
  return next;
}

/** Current attribution snapshot, for attaching to a lead submission. */
export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  return readStored() ?? captureAttribution();
}

/**
 * Best-guess traffic source when no UTMs are present, derived from the referrer.
 * Keeps organic and direct traffic distinguishable in the leads table.
 */
export function inferredSource(attribution: Attribution): string {
  if (attribution.utmSource) return attribution.utmSource;
  const referrer = attribution.referrer ?? "";
  if (!referrer) return "direct";
  if (/facebook|fb\.com|instagram/i.test(referrer)) return "facebook";
  if (/google/i.test(referrer)) return "google";
  if (/bing|duckduckgo|yahoo/i.test(referrer)) return "search";
  return "referral";
}
