"use client";

import { forwardRef } from "react";
import { MessageSquareText, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The bubble, and the nudge.
 *
 * Deliberately the only thing in this feature that ships in the first paint: a
 * button and, at most, one short sentence. The panel and everything it pulls in
 * — forms, product cards, the availability fetch — load on interaction, so a
 * shopper who never opens the assistant downloads none of it.
 *
 * Position clears the mobile action bar (`MobileBottomActions`, 64px plus the
 * safe-area inset, visible below `xl`) so the two never overlap on a phone.
 */

interface ChatLauncherProps {
  open: boolean;
  onToggle: () => void;
  /** The one-line nudge, or null when it should not be shown. */
  teaser: string | null;
  onDismissTeaser: () => void;
}

/** Sits above the mobile bar below `xl`, and in the corner above it. */
export const LAUNCHER_OFFSET =
  "bottom-[calc(64px+env(safe-area-inset-bottom)+12px)] xl:bottom-6";

export const ChatLauncher = forwardRef<HTMLButtonElement, ChatLauncherProps>(
  function ChatLauncher({ open, onToggle, teaser, onDismissTeaser }, ref) {
    return (
      <div
        className={cn(
          "fixed right-4 z-40 flex flex-col items-end gap-2 xl:right-6",
          LAUNCHER_OFFSET,
          // The panel replaces the launcher on a phone, so hide it behind the
          // full-screen sheet rather than leaving a button floating over it.
          open ? "hidden sm:flex" : "flex",
        )}
      >
        {teaser && !open ? (
          <div className="flex max-w-[16rem] items-start gap-1 rounded-md border border-ink-200 bg-white p-3 shadow-lift">
            <button
              type="button"
              onClick={onToggle}
              className="text-left text-[13.5px] font-medium leading-snug text-ink-900 hover:text-brand-500"
            >
              {teaser}
            </button>
            <button
              type="button"
              onClick={onDismissTeaser}
              aria-label="Dismiss"
              className="-mr-1 -mt-1 shrink-0 rounded-sm p-1 text-ink-400 transition-colors hover:bg-bone-100 hover:text-ink-700"
            >
              <X aria-hidden className="size-3.5" strokeWidth={2.5} />
            </button>
          </div>
        ) : null}

        <button
          ref={ref}
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={open ? "Close the KT Appliance Assistant" : "Open the KT Appliance Assistant"}
          className={cn(
            "inline-flex items-center gap-2 rounded-pill border px-4 py-3 font-sans text-[14px] font-semibold shadow-lift",
            "transition-[background-color,border-color,color] duration-150",
            open
              ? "border-ink-950 bg-ink-950 text-white hover:bg-ink-800"
              : "border-brand-500 bg-brand-500 text-white hover:border-brand-600 hover:bg-brand-600",
          )}
        >
          {open ? (
            <X aria-hidden className="size-[18px]" strokeWidth={2.5} />
          ) : (
            <MessageSquareText aria-hidden className="size-[18px]" strokeWidth={2.5} />
          )}
          <span>{open ? "Close" : "Need help?"}</span>
        </button>
      </div>
    );
  },
);
