import Image from "next/image";

import { getPhoto, type MediaKey } from "@/lib/media/manifest";
import { cn } from "@/lib/utils";

interface PhotoProps {
  /** Semantic manifest key — components never pass raw paths. */
  mediaKey: MediaKey;
  /** Real `sizes` for the slot this renders in, not a guess. */
  sizes: string;
  /** Explicit per-slot decision, not a per-call-site default. */
  fit: "cover" | "contain";
  /** Wrapper classes — the caller owns aspect ratio, size and rounding. */
  className?: string;
  /** Set only when this is (or contains) the LCP element. */
  preload?: boolean;
}

/**
 * A manifest-backed photograph.
 *
 * Renders `null` when the key has no asset yet — call sites keep their current
 * flat-color treatment as the fallback, so a missing photo is a design state,
 * never a broken box. Blur placeholder when the pipeline generated one,
 * `bg-bone-100` behind everything while loading.
 */
export function Photo({ mediaKey, sizes, fit, className, preload = false }: PhotoProps) {
  const photo = getPhoto(mediaKey);
  if (!photo) return null;

  return (
    <div className={cn("relative overflow-hidden bg-bone-100", className)}>
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={sizes}
        preload={preload || undefined}
        placeholder={photo.blurDataURL ? "blur" : "empty"}
        blurDataURL={photo.blurDataURL || undefined}
        className={fit === "cover" ? "object-cover" : "object-contain"}
      />
    </div>
  );
}
