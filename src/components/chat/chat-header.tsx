"use client";

import Image from "next/image";
import { Minus, X } from "lucide-react";

import { ASSISTANT_SUBTITLE } from "@/lib/chat/context";
import { storeStatus } from "@/lib/chat/store-info";
import { siteConfig } from "@/lib/site-config";

/**
 * Panel header.
 *
 * The status line says whether the *warehouse* is open, which is a fact, and
 * never whether anyone is available to chat, which would be a lie — there is no
 * live-agent system behind this. The "Automated assistant" line is the
 * disclosure, stated plainly rather than buried.
 */
export function ChatHeader({
  onClose,
  titleId,
}: {
  onClose: () => void;
  titleId: string;
}) {
  // Rendered on the client only (the panel is lazy-loaded on interaction), so
  // reading the clock here cannot produce a hydration mismatch.
  const status = storeStatus();

  return (
    <header className="flex items-start gap-3 border-b border-ink-800 bg-ink-950 px-4 py-3.5">
      <div className="relative size-9 shrink-0 overflow-hidden rounded-sm bg-white">
        {siteConfig.brand.logoFile ? (
          <Image
            src={siteConfig.brand.logoFile}
            alt=""
            fill
            sizes="36px"
            className="object-contain p-0.5"
          />
        ) : (
          <span className="grid size-full place-items-center bg-brand-500 font-display text-[15px] font-extrabold text-white">
            KT
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h2 id={titleId} className="font-display text-[15px] font-bold leading-tight text-white">
          KT Appliance Assistant
        </h2>
        <p className="mt-0.5 text-[11.5px] leading-snug text-white/60">{ASSISTANT_SUBTITLE}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-white/55">
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${status.open ? "bg-success-600" : "bg-ink-400"}`}
          />
          {status.label}
          <span aria-hidden className="text-white/25">
            ·
          </span>
          <span>Automated assistant</span>
        </p>
      </div>

      <div className="on-dark flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Minimize chat"
          className="hidden rounded-sm p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:block"
        >
          <Minus aria-hidden className="size-4" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="rounded-sm p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X aria-hidden className="size-4" strokeWidth={2.5} />
        </button>
      </div>
    </header>
  );
}
