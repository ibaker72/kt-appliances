"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Pause, Play } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import type { HeroSlide } from "@/lib/content/campaigns";
import { cn } from "@/lib/utils";

const ADVANCE_MS = 6000;

const TONES: Record<HeroSlide["tone"], { panel: string; head: string; body: string; cta: string }> = {
  ink: {
    panel: "on-dark bg-ink-950",
    head: "text-white",
    body: "text-white/70",
    cta: buttonStyles("white", "md"),
  },
  brand: {
    panel: "on-dark bg-brand-600",
    head: "text-white",
    body: "text-white/80",
    cta: buttonStyles("white", "md"),
  },
  bone: {
    panel: "bg-bone-100",
    head: "text-ink-950",
    body: "text-ink-600",
    cta: buttonStyles("dark", "md"),
  },
};

/**
 * Rotating promotional slot at the top of the homepage.
 *
 * Scrolling is native CSS scroll-snap rather than a transform track, which means
 * touch swipe works with no gesture handling, the slides are readable before
 * hydration, and the whole thing degrades to a horizontal scroller if JavaScript
 * never arrives. Auto-advance is the only part that needs JS.
 */
export function PromoCarousel({ slides }: { slides: HeroSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [interacting, setInteracting] = useState(false);

  // Autoplay starts only after we know motion is welcome. Starting it on and
  // switching off would move the page once before the preference is read.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPlaying(!query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const goTo = useCallback((next: number) => {
    const track = trackRef.current;
    if (!track) return;
    const target = ((next % slides.length) + slides.length) % slides.length;
    track.scrollTo({ left: track.clientWidth * target, behavior: "smooth" });
  }, [slides.length]);

  useEffect(() => {
    if (!playing || interacting || slides.length < 2) return;
    const timer = setInterval(() => goTo(index + 1), ADVANCE_MS);
    return () => clearInterval(timer);
  }, [playing, interacting, index, slides.length, goTo]);

  // Scroll position is the source of truth for which slide is current, so swipe,
  // dot clicks and autoplay all stay in sync without separate bookkeeping.
  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  if (slides.length === 0) return null;

  return (
    <section
      aria-label="Promotions"
      aria-roledescription="carousel"
      className="relative"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={() => setInteracting(false)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {slides.map((slide, position) => {
          const tone = TONES[slide.tone];
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${position + 1} of ${slides.length}`}
              aria-hidden={position !== index}
              className={cn("w-full shrink-0 snap-start", tone.panel)}
            >
              <div className="mx-auto flex min-h-[300px] w-full max-w-[1320px] flex-col justify-center px-5 py-10 sm:px-6 lg:min-h-[340px] lg:px-10">
                <h2
                  className={cn(
                    "max-w-2xl font-display text-[1.9rem] font-extrabold leading-[1.02] sm:text-[2.4rem] lg:text-[2.9rem]",
                    tone.head,
                  )}
                >
                  {slide.headline}
                </h2>
                <p className={cn("mt-4 max-w-xl text-[15px] leading-relaxed sm:text-base", tone.body)}>
                  {slide.subhead}
                </p>
                <div className="mt-7">
                  {/* Inert for the off-screen slides so they are not tab stops. */}
                  <Link
                    href={slide.href}
                    tabIndex={position === index ? undefined : -1}
                    className={cn(tone.cta, "w-full sm:w-auto")}
                  >
                    {slide.ctaLabel}
                    <ChevronRight aria-hidden className="size-4" strokeWidth={2.5} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-pill bg-ink-950/55 px-3 py-2 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? "Pause promotions" : "Play promotions"}
              className="grid size-5 place-items-center text-white/80 hover:text-white"
            >
              {playing ? (
                <Pause aria-hidden className="size-3.5" strokeWidth={2.5} />
              ) : (
                <Play aria-hidden className="size-3.5" strokeWidth={2.5} />
              )}
            </button>
            {slides.map((slide, position) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(position)}
                aria-label={`Show promotion ${position + 1}: ${slide.headline}`}
                aria-current={position === index}
                className={cn(
                  "h-2 rounded-pill transition-all",
                  position === index ? "w-6 bg-white" : "w-2 bg-white/45 hover:bg-white/70",
                )}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
