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
  /** Gates rotation on the page having loaded — see the effect below. */
  const [ready, setReady] = useState(false);

  // Autoplay starts only after we know motion is welcome. Starting it on and
  // switching off would move the page once before the preference is read.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPlaying(!query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /*
    Rotation is additionally held until the page has finished loading and the
    main thread has gone idle once.

    `scrollTo({ behavior: "smooth" })` is a compositor-driven scroll, and the
    first one Chrome sees ends its LCP measurement window for good
    (PaintTimingDetector::NotifyScroll -> StopRecordingLargestContentfulPaint).
    A rotation that lands while the browser is still settling paint timings can
    therefore leave a trace carrying a firstContentfulPaint and no
    `largestContentfulPaint::Candidate` at all — the NO_LCP Lighthouse reports.
    Waiting for load plus one idle callback keeps every rotation clear of it.
  */
  useEffect(() => {
    let cancelled = false;

    const arm = () => {
      if (cancelled) return;
      const idle =
        window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 200));
      idle(() => {
        if (!cancelled) setReady(true);
      });
    };

    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", arm);
    };
  }, []);

  const goTo = useCallback((next: number) => {
    const track = trackRef.current;
    if (!track) return;
    const target = ((next % slides.length) + slides.length) % slides.length;
    track.scrollTo({ left: track.clientWidth * target, behavior: "smooth" });
  }, [slides.length]);

  useEffect(() => {
    if (!ready || !playing || interacting || slides.length < 2) return;
    const timer = setInterval(() => goTo(index + 1), ADVANCE_MS);
    return () => clearInterval(timer);
  }, [ready, playing, interacting, index, slides.length, goTo]);

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
      className="relative min-w-0"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={() => setInteracting(false)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto"
      >
        {slides.map((slide, position) => {
          const tone = TONES[slide.tone];
          // The first slide's headline is the page's main heading. It is
          // server-rendered, on screen from the first paint, and never moves
          // before the browser has settled — which is what the LCP measurement
          // needs to latch onto. Identical typography either way.
          const Headline = position === 0 ? "h1" : "h2";
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${position + 1} of ${slides.length}`}
              aria-hidden={position !== index}
              className={cn("w-full min-w-0 shrink-0 basis-full snap-start", tone.panel)}
            >
              <div className="mx-auto flex min-h-[190px] w-full max-w-[1320px] flex-col justify-center px-5 pb-11 pt-6 sm:min-h-[260px] sm:px-6 sm:pb-14 sm:pt-9 lg:min-h-[330px] lg:px-10">
                <Headline
                  className={cn(
                    "max-w-2xl font-display text-[1.4rem] font-extrabold leading-[1.08] sm:text-[2.1rem] sm:leading-[1.02] lg:text-[2.8rem]",
                    tone.head,
                  )}
                >
                  {slide.headline}
                </Headline>
                <p className={cn("clamp-2 mt-2 max-w-xl text-[13.5px] leading-snug sm:mt-4 sm:line-clamp-none sm:text-base sm:leading-relaxed", tone.body)}>
                  {slide.subhead}
                </p>
                <div className="mt-4 sm:mt-7">
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
        <div className="absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-3 sm:bottom-4">
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
