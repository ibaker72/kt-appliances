"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/** Fixed track widths. Rail items must not flex, or snap points drift. */
const ITEM_WIDTHS = {
  card: "[&>*]:w-[240px]",
  category: "[&>*]:w-[104px] sm:[&>*]:w-[130px]",
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

  // Edge fades signal "there is more" on exactly the side where there is.
  // A mask fades the content itself, so it reads correctly on any section
  // background; it disappears entirely when the rail has no overflow, and
  // before hydration (both flags start true), so no-JS never sees a fade.
  const fade = "44px";
  const maskImage =
    atStart && atEnd
      ? undefined
      : atStart
        ? `linear-gradient(to right, black calc(100% - ${fade}), transparent)`
        : atEnd
          ? `linear-gradient(to right, transparent, black ${fade})`
          : `linear-gradient(to right, transparent, black ${fade}, black calc(100% - ${fade}), transparent)`;

  return (
    <div className={cn("group/rail relative", className)}>
      <div
        ref={scrollerRef}
        onScroll={sync}
        role="region"
        aria-label={label}
        tabIndex={0}
        style={{ maskImage, WebkitMaskImage: maskImage }}
        className={cn(
          // No smooth scroll-behaviour on the container itself. It would apply
          // to the browser's own scroll-snap adjustment during load, which runs
          // on the compositor and permanently ends Chrome's LCP measurement
          // window if it lands before the first LCP candidate. The arrows pass
          // `behavior: "smooth"` themselves, so pointer scrolling still
          // animates.
          "no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5",
          "sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0",
          // Snap lands items on the same gutter the container padding draws,
          // so a snapped card sits flush with the page grid, not under the
          // bleed. Positive, not floaty: mandatory snap plus matched padding.
          "scroll-pl-5 sm:scroll-pl-6 lg:scroll-pl-0",
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
        "bg-white text-ink-900 shadow-card transition-[opacity,box-shadow] duration-200 hover:shadow-hover lg:grid",
        // Present only while the pointer is over the rail — they are a
        // pointer-only convenience, so they appear for the pointer.
        disabled ? "pointer-events-none opacity-0" : "opacity-0 group-hover/rail:opacity-100",
        direction === "prev" ? "-left-5" : "-right-5",
      )}
    >
      <Icon aria-hidden className="size-5" strokeWidth={2.5} />
    </button>
  );
}
