"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import type { DamageSpot } from "@/lib/inventory/types";
import { cn } from "@/lib/utils";

/**
 * The damage map: numbered markers over the product photo at the recorded
 * coordinates, each opening a plain-language callout, with the same spots
 * repeated as a numbered list below the gallery.
 *
 * The list is the canonical copy — complete without JavaScript, readable by
 * screen readers and printers — and the markers are the enhancement on top.
 * A unit with no recorded spots renders NOTHING from this file: no empty map
 * and no "no damage recorded" badge, because absence of data is not a claim
 * of absence (the same line `compareAtPrice` nullability holds).
 */

interface ContentBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Where the pixels of an `object-contain` image actually are inside its
 * container. Spot coordinates are fractions of the photo, not of the layout
 * box, so markers must be laid out against this rectangle — otherwise the
 * letterboxing that `object-contain` adds would shift every marker.
 */
export function useImageContentBox(ref: RefObject<HTMLElement | null>): ContentBox | null {
  const [box, setBox] = useState<ContentBox | null>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const measure = () => {
      const img = container.querySelector("img");
      if (!img || !img.naturalWidth || !img.naturalHeight) {
        setBox(null);
        return;
      }
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
      const width = img.naturalWidth * scale;
      const height = img.naturalHeight * scale;
      setBox({ left: (cw - width) / 2, top: (ch - height) / 2, width, height });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    const img = container.querySelector("img");
    img?.addEventListener("load", measure);
    return () => {
      observer.disconnect();
      img?.removeEventListener("load", measure);
    };
  }, [ref]);

  return box;
}

interface DamageMapProps {
  spots: DamageSpot[];
  /** Fired on marker activation — the gallery uses it to swap in a close-up. */
  onSelectSpot?: (spot: DamageSpot, index: number) => void;
  className?: string;
}

export function DamageMap({ spots, onSelectSpot, className }: DamageMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const box = useImageContentBox(containerRef);
  const markerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  /** Roving tabindex: one tab stop for the group, arrows move inside it. */
  const [focusIndex, setFocusIndex] = useState(0);

  if (spots.length === 0) return null;

  const moveFocus = (next: number) => {
    const target = (next + spots.length) % spots.length;
    setFocusIndex(target);
    markerRefs.current[target]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveFocus(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveFocus(index - 1);
        break;
      case "Home":
        event.preventDefault();
        moveFocus(0);
        break;
      case "End":
        event.preventDefault();
        moveFocus(spots.length - 1);
        break;
      case "Escape":
        setOpenIndex(null);
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={`${spots.length} recorded damage location${spots.length === 1 ? "" : "s"} on this photo`}
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      {box
        ? spots.map((spot, index) => (
            <div
              key={`${spot.x}-${spot.y}-${index}`}
              className="absolute"
              style={{
                left: box.left + spot.x * box.width,
                top: box.top + spot.y * box.height,
              }}
            >
              <button
                type="button"
                ref={(node) => {
                  markerRefs.current[index] = node;
                }}
                tabIndex={index === focusIndex ? 0 : -1}
                onKeyDown={(event) => onKeyDown(event, index)}
                onClick={() => {
                  setOpenIndex(openIndex === index ? null : index);
                  setFocusIndex(index);
                  onSelectSpot?.(spot, index);
                }}
                aria-expanded={openIndex === index}
                aria-label={`Damage location ${index + 1}: ${spot.label}`}
                className={cn(
                  "pointer-events-auto grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center",
                  "rounded-pill text-[11px] font-bold text-white shadow-card ring-2 ring-white transition-colors",
                  openIndex === index ? "bg-brand-500" : "bg-ink-950/85 hover:bg-brand-500",
                )}
              >
                {index + 1}
              </button>

              {openIndex === index ? (
                // The label is already in the button's aria-label; this visual
                // callout is for sighted pointer users, so it is aria-hidden.
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-auto absolute z-10 w-56 max-w-[70vw] border border-line bg-white p-3",
                    "text-[13px] leading-snug text-ink-800 shadow-lift",
                    spot.y > 0.6 ? "bottom-5 mb-1" : "top-5 mt-1",
                    spot.x > 0.66
                      ? "-right-3"
                      : spot.x < 0.34
                        ? "-left-3"
                        : "left-1/2 -translate-x-1/2",
                  )}
                >
                  <span className="font-semibold text-ink-950">#{index + 1}</span> {spot.label}
                  {spot.imageId ? (
                    <span className="mt-1 block text-[12px] text-ink-500">
                      Close-up shown in the gallery.
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))
        : null}
    </div>
  );
}

/**
 * The numbered list under the gallery — the no-JS, screen-reader and print
 * path. It must be complete on its own; the markers above are a convenience.
 */
export function DamageSpotList({ spots, className }: { spots: DamageSpot[]; className?: string }) {
  if (spots.length === 0) return null;

  return (
    <section aria-label="Recorded cosmetic damage" className={className}>
      <h3 className="text-ui font-semibold uppercase tracking-wide text-ink-500">
        Where the damage is
      </h3>
      <ol className="mt-3 space-y-2">
        {spots.map((spot, index) => (
          <li
            key={`${spot.x}-${spot.y}-${index}`}
            className="flex gap-3 text-[14.5px] leading-relaxed text-ink-700"
          >
            <span
              aria-hidden
              className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-pill bg-ink-950 text-[10.5px] font-bold text-white"
            >
              {index + 1}
            </span>
            {spot.label}
          </li>
        ))}
      </ol>
    </section>
  );
}
