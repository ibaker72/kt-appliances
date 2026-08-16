"use client";

import { META_EVENT_MAP, type AnalyticsEvent, type AnalyticsPayload } from "./events";

type Gtag = (command: string, ...args: unknown[]) => void;
type Fbq = (command: string, ...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
    fbq?: Fbq;
  }
}

function clean(payload: AnalyticsPayload = {}): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}

/**
 * Fires a conversion event to whichever analytics providers are actually loaded.
 * Safe to call unconditionally — with no provider configured this is a no-op, so
 * call sites never need to check whether tracking is enabled.
 */
export function track(event: AnalyticsEvent, payload: AnalyticsPayload = {}): void {
  if (typeof window === "undefined") return;
  const params = clean(payload);

  try {
    window.gtag?.("event", event, params);
    // Also push to the data layer so Google Tag Manager containers can pick it up
    // without a second gtag install.
    window.dataLayer?.push({ event, ...params });

    const metaEvent = META_EVENT_MAP[event];
    if (window.fbq) {
      if (metaEvent) window.fbq("track", metaEvent, params);
      else window.fbq("trackCustom", event, params);
    }
  } catch {
    // Analytics must never break a conversion path.
  }
}

/**
 * Google Ads conversion. Only fires when a conversion label is configured,
 * so no phantom conversions are reported during setup.
 */
export function trackAdsConversion(value?: number): void {
  if (typeof window === "undefined") return;
  const sendTo = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;
  if (!sendTo || !window.gtag) return;
  try {
    window.gtag("event", "conversion", {
      send_to: sendTo,
      ...(value != null ? { value, currency: "USD" } : {}),
    });
  } catch {
    /* no-op */
  }
}
