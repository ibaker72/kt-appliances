"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

import { getVideo, type MediaKey } from "@/lib/media/manifest";
import { Scrim, type ScrimStrength } from "@/components/media/scrim";
import { cn } from "@/lib/utils";

interface BackdropVideoProps {
  /** Semantic manifest key — components never pass raw paths. */
  mediaKey: MediaKey;
  /** `sizes` for the poster image's slot. */
  sizes: string;
  /** Set when the poster is (or contains) the LCP element. */
  posterPreload?: boolean;
  /** Text-contrast gradient, chosen per placement against the actual footage. */
  scrim?: ScrimStrength;
  /** Wrapper classes — the caller owns size and position (usually inset-0). */
  className?: string;
  /** Repositions the play/pause control if the default corner is occupied. */
  controlClassName?: string;
}

/** `navigator.connection` is not in TS's lib; read it defensively. */
function connectionBlocksAutoplay(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  return connection.effectiveType === "2g" || connection.effectiveType === "slow-2g";
}

/**
 * Ambient looping background video.
 *
 * The poster is the real content: it renders first, alone, and is what LCP and
 * slow connections see. The video is an upgrade layered on top, and it only
 * mounts after `load` plus one idle callback — the same gate `PromoCarousel`
 * uses, for the same reason: nothing may move or fetch while the browser is
 * still settling paint timings.
 *
 * Autoplay is skipped entirely — poster stays, a play button appears — when the
 * visitor asked for reduced motion, or Save-Data is on, or the connection
 * reports 2g. Playback pauses off-screen and when the tab is hidden, and the
 * control is always available while playing (auto-moving content must be
 * pausable). The clip is muted, inline, and carries no audio track at all —
 * the processing script strips it.
 *
 * Renders `null` when the key has no asset — the slot keeps its flat
 * treatment, same contract as `Photo`.
 */
export function BackdropVideo({
  mediaKey,
  sizes,
  posterPreload = false,
  scrim,
  className,
  controlClassName,
}: BackdropVideoProps) {
  const video = getVideo(mediaKey);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /** load + one idle callback has passed — see PromoCarousel for the why. */
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Read once — Save-Data does not change mid-visit, and nothing below the
  // `ready` gate renders before hydration, so SSR never sees this value.
  const [savingData] = useState(
    () => typeof navigator !== "undefined" && connectionBlocksAutoplay(),
  );
  /** Explicit user choice, either direction, wins over the automatic policy. */
  const [userIntent, setUserIntent] = useState<"play" | "pause" | null>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

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

  const autoplayAllowed = ready && !reducedMotion && !savingData;
  const wantsPlayback = userIntent === "play" || (autoplayAllowed && userIntent !== "pause");
  // The element only exists once something wants it — before that, the page is
  // poster-only and the video bytes are never requested.
  const mounted = ready && (wantsPlayback || userIntent !== null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !mounted) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [mounted]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const apply = () => {
      const shouldPlay = wantsPlayback && inView && !document.hidden;
      if (shouldPlay) void element.play().catch(() => {});
      else element.pause();
    };

    apply();
    document.addEventListener("visibilitychange", apply);
    return () => document.removeEventListener("visibilitychange", apply);
  }, [mounted, wantsPlayback, inView]);

  if (!video) return null;

  const playing = wantsPlayback && inView;

  return (
    <div ref={containerRef} className={cn("absolute inset-0 overflow-hidden", className)}>
      <Image
        src={video.poster.src}
        alt={video.poster.alt}
        fill
        sizes={sizes}
        preload={posterPreload || undefined}
        placeholder={video.poster.blurDataURL ? "blur" : "empty"}
        blurDataURL={video.poster.blurDataURL || undefined}
        className="object-cover"
      />

      {mounted ? (
        // Muted + playsInline are required for autoplay; the file itself has no
        // audio track, so muted is stating a fact, not hiding a sound.
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          poster={video.poster.src}
          aria-hidden
          className="absolute inset-0 size-full object-cover"
        >
          <source src={video.webm} type="video/webm" />
          <source src={video.mp4} type="video/mp4" />
        </video>
      ) : null}

      {scrim ? <Scrim strength={scrim} /> : null}

      <button
        type="button"
        onClick={() => setUserIntent(playing ? "pause" : "play")}
        aria-label={playing ? "Pause background video" : "Play background video"}
        className={cn(
          "absolute bottom-3 right-3 z-10 grid size-8 place-items-center rounded-pill",
          "bg-ink-950/55 text-white/80 backdrop-blur-sm hover:text-white",
          controlClassName,
        )}
      >
        {playing ? (
          <Pause aria-hidden className="size-3.5" strokeWidth={2.5} />
        ) : (
          <Play aria-hidden className="size-3.5" strokeWidth={2.5} />
        )}
      </button>
    </div>
  );
}
