"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";

import { DamageMap } from "@/components/inventory/damage-map";
import { CATEGORIES, type Appliance, type ApplianceImage } from "@/lib/inventory/types";
import { cn } from "@/lib/utils";

/**
 * Product gallery.
 *
 * Thumbnails run vertically beside the main image from `lg` and horizontally
 * beneath it below that, which is the arrangement shoppers already know from
 * every large retailer. The first image is the LCP element and stays `priority`;
 * the rest are lazy, since a shopper reaches them only by choosing to.
 *
 * Arrow keys move between images while the gallery has focus, and clicking the
 * main image opens a zoom overlay. With a single image (or none) the strip is
 * omitted rather than rendered as a lonely square.
 */
export function ProductGallery({ appliance }: { appliance: Appliance }) {
  const images: ApplianceImage[] =
    appliance.images.length > 0
      ? appliance.images
      : [
          {
            id: "placeholder",
            applianceId: appliance.id,
            imageUrl: CATEGORIES[appliance.category].artwork,
            altText: `${appliance.brand} ${appliance.title}`,
            sortOrder: 0,
            isPrimary: true,
          },
        ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const index = Math.min(activeIndex, images.length - 1);
  const active = images[index];
  const sold = appliance.status === "sold";
  const label = `${appliance.brand} ${appliance.title}`;

  const step = (delta: number) =>
    setActiveIndex((current) => (current + delta + images.length) % images.length);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (images.length < 2) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      step(-1);
    }
  };

  return (
    <div
      className="flex flex-col-reverse gap-3 lg:flex-row"
      onKeyDown={onKeyDown}
      role="group"
      aria-label={`${label} images`}
    >
      {images.length > 1 ? (
        <ul className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {images.map((image, position) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveIndex(position)}
                aria-label={`View image ${position + 1} of ${images.length}`}
                aria-current={position === index ? "true" : undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-sm border bg-bone-50 transition-colors sm:size-20",
                  position === index ? "border-ink-950" : "border-line hover:border-ink-400",
                )}
              >
                <Image src={image.imageUrl} alt="" fill sizes="80px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="relative">
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label={`Zoom image ${index + 1} of ${images.length}`}
            className={cn(
              "group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-md border border-line bg-bone-50",
              sold ? "grayscale" : "",
            )}
          >
            <Image
              src={active.imageUrl}
              alt={active.altText ?? label}
              fill
              priority
              sizes="(min-width: 1024px) 560px, 100vw"
              className={cn("object-contain", sold ? "opacity-60" : "")}
            />
            {sold ? (
              <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-ink-950/90 py-3 text-center font-display text-base font-extrabold uppercase tracking-[0.35em] text-white sm:text-xl">
                Sold
              </span>
            ) : (
              <span
                aria-hidden
                className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-pill border border-line bg-white/95 text-ink-700 opacity-0 shadow-card transition-opacity group-hover:opacity-100"
              >
                <ZoomIn className="size-4" strokeWidth={2.5} />
              </span>
            )}
          </button>

          {/* Spots are recorded against the primary photo, so the overlay only
              renders while that photo is showing. Activating a spot with a
              close-up swaps the gallery to it; the numbered list below the
              gallery (DamageSpotList, rendered by the page) stays the complete
              no-JS record either way. */}
          {appliance.images.length > 0 && active.isPrimary && !zoomed ? (
            <DamageMap
              spots={appliance.damageSpots}
              onSelectSpot={(spot) => {
                if (!spot.imageId) return;
                const target = images.findIndex((image) => image.id === spot.imageId);
                if (target >= 0) setActiveIndex(target);
              }}
            />
          ) : null}
        </div>

        {appliance.images.length === 0 ? (
          <p className="mt-3 rounded-sm border border-line bg-bone-50 px-3.5 py-2.5 text-ui text-ink-600">
            Photos of this exact unit are on the way. Call or text us and we&apos;ll send you
            pictures of the actual appliance, including the damage.
          </p>
        ) : null}
      </div>

      {zoomed ? (
        <ZoomOverlay
          image={active}
          label={label}
          position={index}
          count={images.length}
          onClose={() => setZoomed(false)}
          onStep={step}
        />
      ) : null}
    </div>
  );
}

/** Full-bleed view. Escape closes, arrows move, and focus returns on close. */
function ZoomOverlay({
  image,
  label,
  position,
  count,
  onClose,
  onStep,
}: {
  image: ApplianceImage;
  label: string;
  position: number;
  count: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onStep(1);
      if (event.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, onStep]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${label} — image ${position + 1} of ${count}`}
      className="on-dark fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/95 p-4"
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid size-11 place-items-center rounded-pill border border-white/30 text-white hover:bg-white hover:text-ink-950"
      >
        <X aria-hidden className="size-5" strokeWidth={2.5} />
        <span className="sr-only">Close zoom</span>
      </button>
      <div className="relative h-full max-h-[85vh] w-full max-w-5xl">
        <Image
          src={image.imageUrl}
          alt={image.altText ?? label}
          fill
          sizes="100vw"
          className="object-contain"
        />
      </div>
      {count > 1 ? (
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-ui text-white/70 tnum">
          {position + 1} / {count}
        </p>
      ) : null}
    </div>
  );
}
