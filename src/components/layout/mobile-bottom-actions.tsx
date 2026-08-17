"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageSquareText, Phone, Scale, Warehouse } from "lucide-react";

import { CallLink, TextLink } from "@/components/contact/contact-links";
import { COMPARE_LIMIT } from "@/lib/inventory/search-params";
import { siteConfig } from "@/lib/site-config";

/**
 * Persistent Call / Text / Inventory bar on mobile.
 *
 * Most paid and Marketplace traffic arrives on a phone, so the three actions
 * that convert are always one thumb-tap away. Hidden inside /admin, where the
 * screen belongs to the inventory tools.
 */
export function MobileBottomActions() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  const itemClass =
    "relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold text-white transition-colors active:bg-ink-800";

  return (
    <>
      {/* Spacer so page content is never hidden behind the fixed bar. */}
      <div aria-hidden className="h-[64px] xl:hidden" />
      <nav
        aria-label="Quick contact"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950 pb-[env(safe-area-inset-bottom)] xl:hidden"
      >
        <div className="on-dark flex items-stretch divide-x divide-ink-800">
          <CallLink
            context="mobile-bar"
            className={itemClass}
            aria-label={`Call ${siteConfig.phone.display}`}
          >
            <Phone aria-hidden className="size-[19px] text-brand-400" strokeWidth={2.5} />
            Call
          </CallLink>
          <TextLink
            context="mobile-bar"
            message={`Hi ${siteConfig.name}, I have a question about your appliances.`}
            className={itemClass}
            aria-label={`Text ${siteConfig.phone.display}`}
          >
            <MessageSquareText aria-hidden className="size-[19px] text-brand-400" strokeWidth={2.5} />
            Text
          </TextLink>
          {/* Isolated behind Suspense: `useSearchParams` opts its whole subtree
              out of prerendering, and without this boundary every static page in
              the site would bail to client rendering just to draw a badge. */}
          <Suspense fallback={null}>
            <CompareTab className={itemClass} />
          </Suspense>
          <Link href="/inventory" className={itemClass}>
            <Warehouse aria-hidden className="size-[19px] text-brand-400" strokeWidth={2.5} />
            Inventory
          </Link>
        </div>
      </nav>
    </>
  );
}

/** Appears only while units are selected for comparison. */
function CompareTab({ className }: { className: string }) {
  const params = useSearchParams();
  const raw = params.get("compare") ?? "";
  const count = raw.split(",").filter(Boolean).slice(0, COMPARE_LIMIT).length;

  if (count === 0) return null;

  return (
    <Link href={`/inventory/compare?ids=${encodeURIComponent(raw)}`} className={className}>
      <span className="relative">
        <Scale aria-hidden className="size-[19px] text-brand-400" strokeWidth={2.5} />
        <span className="absolute -right-2.5 -top-1.5 grid min-w-[16px] place-items-center rounded-pill bg-brand-500 px-1 text-[10px] font-bold leading-4 text-white tnum">
          {count}
        </span>
      </span>
      Compare
    </Link>
  );
}
