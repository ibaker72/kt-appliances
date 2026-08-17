"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Rail } from "@/components/ui/rail";
import { ModuleHeader, Section } from "@/components/ui/section";
import {
  readRecentlyViewed,
  type RecentlyViewedEntry,
} from "@/components/inventory/product-view-tracker";

const EMPTY: RecentlyViewedEntry[] = [];

// `useSyncExternalStore` demands a stable snapshot reference or it re-renders
// forever, so the parsed list is memoised against the raw cookie string.
let cachedRaw: string | null = null;
let cachedValue: RecentlyViewedEntry[] = EMPTY;

function getSnapshot(): RecentlyViewedEntry[] {
  const raw = document.cookie;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = readRecentlyViewed();
  }
  return cachedValue;
}

/** Nothing mutates the cookie mid-render except our own tracker, on mount. */
function subscribe(): () => void {
  return () => {};
}

/**
 * Rail of units this shopper opened recently.
 *
 * Reads its cookie after mount rather than on the server, and that is a
 * deliberate trade: the product page is prerendered with `generateStaticParams`,
 * and touching `cookies()` in it would turn every listing page dynamic — a real
 * cost on the pages search traffic lands on, to render a convenience rail below
 * the fold. Nothing above it depends on this, so it renders nothing until the
 * cookie is read and never shifts content that matters.
 *
 * Tiles carry no price. See `RecentlyViewedEntry` for why.
 */
export function RecentlyViewed({ excludeSlug }: { excludeSlug?: string }) {
  const all = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  // The unit currently being viewed is filtered out rather than shown back.
  const entries = all.filter((entry) => entry.slug !== excludeSlug);

  if (entries.length === 0) return null;

  return (
    <Section tone="flat">
      <Container>
        <ModuleHeader title="Recently viewed" href="/inventory" />
        <Rail label="Recently viewed" itemWidth="tile">
          {entries.map((entry) => (
            <Link
              key={entry.slug}
              href={`/inventory/${entry.slug}`}
              className="group flex flex-col overflow-hidden rounded-md border border-line bg-white shadow-card transition-shadow hover:shadow-hover"
            >
              <span className="relative block aspect-square overflow-hidden bg-bone-50">
                {entry.image ? (
                  <Image
                    src={entry.image}
                    alt=""
                    fill
                    sizes="160px"
                    className="object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : null}
              </span>
              <span className="p-2.5">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  {entry.brand}
                </span>
                <span className="mt-1 block clamp-2 text-[13px] font-semibold leading-snug text-ink-950 group-hover:text-brand-500">
                  {entry.title}
                </span>
              </span>
            </Link>
          ))}
        </Rail>
      </Container>
    </Section>
  );
}
