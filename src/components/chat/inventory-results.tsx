"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { ChatBrowseLink, ChatProduct } from "@/lib/chat/types";

/**
 * Product cards inside the panel.
 *
 * Rendered from the server's own database read, never from anything a language
 * model wrote. Price, condition and listing status are the same values the
 * listing page would print this second, and the card links to that page rather
 * than trying to be it — the full condition write-up, the damage map and the
 * gallery all live there, and summarising them in a 380px bubble would be the
 * one place this site starts overstating a unit.
 */

function ResultCard({
  product,
  onNavigate,
  position,
}: {
  product: ChatProduct;
  onNavigate: () => void;
  position: number;
}) {
  return (
    <a
      href={product.href}
      className="flex gap-3 rounded-sm border border-ink-200 bg-white p-2.5 shadow-card transition-colors hover:border-ink-900"
      onClick={() => {
        // Category and price band only — nothing that identifies the visitor.
        track(ANALYTICS_EVENTS.chatInventoryResultClicked, {
          category: product.category,
          position,
          price: product.price,
        });
        track(ANALYTICS_EVENTS.productView, {
          context: "chat",
          category: product.category,
        });
        onNavigate();
      }}
    >
      <div className="relative size-[72px] shrink-0 overflow-hidden bg-bone-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            sizes="72px"
            className="object-contain"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500">
          {product.brand}
        </p>
        <p className="clamp-2 text-[13.5px] font-semibold leading-snug text-ink-950">
          {product.title}
        </p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="font-display text-[16px] font-extrabold text-ink-950 tnum">
            {product.priceLabel}
          </span>
          {/* Only when a verified comparison price is on record. */}
          {product.compareAtPriceLabel ? (
            <span className="text-[12px] text-ink-500 line-through tnum">
              {product.compareAtPriceLabel}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-600">
          {product.conditionLabel} · {product.statusLabel}
        </p>
      </div>
    </a>
  );
}

export function InventoryResults({
  products,
  browse,
  isDemo,
  onNavigate,
}: {
  products: ChatProduct[];
  browse: ChatBrowseLink | null;
  isDemo: boolean;
  onNavigate: () => void;
}) {
  if (products.length === 0) return null;

  return (
    <div className="mt-2 grid grid-cols-1 gap-1.5">
      {/* The same disclosure the rest of the site carries when no database is
          connected. A shopper must never be shown sample data as if it were the
          floor. */}
      {isDemo ? (
        <p className="rounded-sm border border-ink-200 bg-bone-100 px-3 py-2 text-[12px] font-semibold text-ink-700">
          Sample listings — this site is not connected to live inventory yet.
        </p>
      ) : null}

      {products.map((product, index) => (
        <ResultCard
          key={product.id}
          product={product}
          position={index + 1}
          onNavigate={onNavigate}
        />
      ))}

      {browse ? (
        <a
          href={browse.href}
          className="inline-flex items-center gap-1.5 px-1 py-1.5 text-[13.5px] font-semibold text-ink-700 underline underline-offset-4 hover:text-brand-500"
          onClick={onNavigate}
        >
          {browse.label}
          <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
        </a>
      ) : null}
    </div>
  );
}

/** The one-unit variant, used when the panel is attached to a listing. */
export function ApplianceSummary({ product }: { product: ChatProduct }) {
  return (
    <div className="flex items-center gap-2.5 rounded-sm border border-ink-200 bg-bone-50 p-2.5">
      <div className="relative size-10 shrink-0 overflow-hidden bg-white">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt=""
            fill
            sizes="40px"
            className="object-contain"
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="clamp-2 text-[13px] font-semibold leading-snug text-ink-950">
          {product.brand} {product.title}
        </p>
        <p className="text-[12px] text-ink-600 tnum">
          {product.priceLabel} · {product.statusLabel}
        </p>
      </div>
    </div>
  );
}
