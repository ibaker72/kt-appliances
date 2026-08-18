/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by `node scripts/process-media.mjs`, which reads originals from
 * `media-source/` (gitignored), strips EXIF, resizes, converts, and records the
 * results here. Edit `manifest.ts` for alt text; re-run the script for
 * everything else.
 */

export interface GeneratedPhoto {
  /** JPEG fallback — this is what `next/image` optimizes from. */
  src: string;
  avif: string;
  webp: string;
  width: number;
  height: number;
  /** 20px inline placeholder. */
  blurDataURL: string;
}

export interface GeneratedVideo {
  mp4: string;
  webm: string;
  /** First frame, processed like any photo. */
  poster: GeneratedPhoto;
  durationSeconds: number;
}

export type GeneratedAsset =
  | ({ kind: "photo" } & GeneratedPhoto)
  | ({ kind: "video" } & GeneratedVideo);

export const GENERATED_MEDIA: Record<string, GeneratedAsset> = {};
