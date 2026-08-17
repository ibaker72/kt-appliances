"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/** Fixed track widths. Rail items must not flex, or snap points drift. */
const ITEM_WIDTHS = {
  card: "[&>*]:w-[240px]",
  category: "[&>*]:w-[130px]",
  tile: "[&>*]:w-[160px]",
  chip: "",
} as const;

interface RailProps {
  /**
   * Pre-rendered items. Taking `children` rather than a data array is what keeps
   * this component's client boundary from swallowing the cards inside it: a
   * server-rendered `ProductCard` passed in from a Server Component crosses the
   * boundary as finished payload, so the rail gets its scroll behaviour without
   * pulling card markup — or the repository types it imports — into the bundle.
   */
  children: ReactNode;
  /** Accessible name for the scroll region, e.g. "Today's warehouse deals". */
  label: string;
  itemWidth?: keyof typeof ITEM_WIDTHS;
  className?: string;
}

/**
 * Horizontally scrolling, snap-aligned rail with desktop arrow controls.
 *
 * Scrolling is native: CSS scroll-snap does the work, so the rail is usable
 * before hydration and with JavaScript off. The arrows are a pointer-only
 * convenience layered on top — keyboard users tab through the items themselves
 * or scroll the region directly, which is why the buttons stay out of the tab
 * order rather than adding two redundant stops in front of every rail.
 */
export function Rail({ children, label, itemWidth = "card", className }: RailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const sync = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    // Sub-pixel layout means scrollLeft rarely lands exactly on `max`.
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    sync();
    // Content and viewport both change the overflow, so watch the box too.
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A shade under a full viewport keeps one item visible as an anchor.
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduced ? "auto" : "smooth" });
  };

  // Nothing overflows, so the controls would be decoration.
  const hasOverflow = !(atStart && atEnd);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollerRef}
        onScroll={sync}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cn(
          "no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5",
          "sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0",
          "[&>*]:shrink-0 [&>*]:snap-start",
          ITEM_WIDTHS[itemWidth],
        )}
      >
        {children}
      </div>

      {hasOverflow ? (
        <>
          <RailArrow
            direction="prev"
            label={`Scroll ${label} backwards`}
            disabled={atStart}
            onClick={() => scrollByPage(-1)}
          />
          <RailArrow
            direction="next"
            label={`Scroll ${label} forwards`}
            disabled={atEnd}
            onClick={() => scrollByPage(1)}
          />
        </>
      ) : null}
    </div>
  );
}

function RailArrow({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      // Duplicates scrolling the region, which is already reachable, so it is
      // hidden from assistive tech and skipped in the tab order.
      aria-hidden
      tabIndex={-1}
      title={label}
      className={cn(
        "absolute top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-pill border border-line",
        "bg-white text-ink-900 shadow-card transition-[opacity,box-shadow] hover:shadow-hover lg:grid",
        "disabled:pointer-events-none disabled:opacity-0",
        direction === "prev" ? "-left-5" : "-right-5",
      )}
    >
      <Icon aria-hidden className="size-5" strokeWidth={2.5} />
    </button>
  );
}
