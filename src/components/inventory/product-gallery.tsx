"use client";

import { useState } from "react";
import Image from "next/image";

import { CATEGORIES, type Appliance } from "@/lib/inventory/types";
import { cn } from "@/lib/utils";

/**
 * Product gallery.
 *
 * The first image is server-rendered as the LCP element and marked `priority`;
 * thumbnails swap it client-side. With a single image (or none) the thumbnail
 * strip is omitted entirely rather than rendered as a lonely square.
 */
export function ProductGallery({ appliance }: { appliance: Appliance }) {
  const images =
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
  const active = images[Math.min(activeIndex, images.length - 1)];
  const sold = appliance.status === "sold";

  return (
    <div>
      <div
        className={cn(
          "relative aspect-[4/3] w-full overflow-hidden border border-line bg-bone-100",
          sold ? "grayscale" : "",
        )}
      >
        <Image
          src={active.imageUrl}
          alt={active.altText ?? `${appliance.brand} ${appliance.title}`}
          fill
          priority
          sizes="(min-width: 1024px) 620px, 100vw"
          className={cn("object-contain", sold ? "opacity-60" : "")}
        />
        {sold ? (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-ink-950/90 py-3 text-center font-display text-base font-extrabold uppercase tracking-[0.35em] text-white sm:text-xl">
            Sold
          </span>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul className="mt-3 flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {images.map((image, index) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`View image ${index + 1} of ${images.length}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={cn(
                  "relative block size-20 overflow-hidden border bg-bone-100 transition-colors sm:size-24",
                  index === activeIndex ? "border-ink-950" : "border-line hover:border-ink-400",
                )}
              >
                <Image
                  src={image.imageUrl}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-contain p-1"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {appliance.images.length === 0 ? (
        <p className="mt-3 border border-line bg-bone-50 px-3.5 py-2.5 text-[13px] text-ink-500">
          Photos of this exact unit are on the way. Call or text us and we&apos;ll send you pictures of
          the actual appliance, including the damage.
        </p>
      ) : null}
    </div>
  );
}
