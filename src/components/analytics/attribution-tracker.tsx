"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureAttribution } from "@/lib/analytics/attribution";

/**
 * Snapshots campaign parameters on first load and on every client navigation
 * that carries new UTMs. Renders nothing.
 */
function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureAttribution();
    // `searchParams` is the value that actually changes when an ad link lands.
  }, [pathname, searchParams]);

  return null;
}

export function AttributionTracker() {
  return <Tracker />;
}
