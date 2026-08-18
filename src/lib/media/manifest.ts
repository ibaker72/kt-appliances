import type { ApplianceCategory } from "@/lib/inventory/types";
import {
  GENERATED_MEDIA,
  type GeneratedAsset,
  type GeneratedPhoto,
} from "./manifest.generated";

/**
 * The registry of every non-product media asset on the site.
 *
 * Components reference semantic keys, never file paths. A key resolves to a
 * full asset — sources, dimensions, blur placeholder, alt — or to `null`, and
 * `null` is the normal state, not an error: every call site falls back to the
 * flat-color treatment the site shipped with, so the pages look intentional at
 * 0%, 40% and 100% asset coverage.
 *
 * Adding an asset touches exactly one file — this one:
 *
 *   1. Drop the original into `media-source/` named after its key
 *      (`hero.floor-wide.jpg`, `category.refrigerators.jpg`,
 *      `hero.warehouse-walk.mov`). The folder is gitignored; originals never
 *      ship.
 *   2. Run `node scripts/process-media.mjs`. It strips EXIF (including GPS),
 *      resizes, converts, enforces the size budgets, and rewrites
 *      `manifest.generated.ts`.
 *   3. Add the alt text below. An asset without alt text does not render —
 *      `getMedia` returns `null` and the test suite names the missing entry —
 *      because an image whose description is an afterthought is not ready.
 */

export type MediaKey =
  | "hero.warehouse-walk"
  | "hero.floor-wide"
  | "hero.delivery"
  | `category.${ApplianceCategory}`
  | "store.exterior"
  | "store.entrance"
  | "store.interior-a"
  | "store.interior-b"
  | "people.team"
  | "people.testing"
  | `damage.${string}`
  | "footer.strip";

export interface PhotoAsset extends GeneratedPhoto {
  kind: "photo";
  /** Describes the specific thing shown, not the category. */
  alt: string;
}

export interface VideoAsset {
  kind: "video";
  mp4: string;
  webm: string;
  poster: PhotoAsset;
  durationSeconds: number;
}

export type MediaAsset = PhotoAsset | VideoAsset;

/**
 * Alt text, written by a person. Keys without an entry here do not render even
 * if the file exists — see the header comment.
 *
 * For a video, the text describes the poster frame (it is also what a
 * screen-reader user gets instead of the clip).
 */
const ALT: Partial<Record<MediaKey, string>> = {};

/** The one lookup every media call site goes through. */
export function getMedia(key: MediaKey): MediaAsset | null {
  const generated: GeneratedAsset | undefined = GENERATED_MEDIA[key];
  if (!generated) return null;
  const alt = ALT[key]?.trim();
  if (!alt) return null;

  if (generated.kind === "video") {
    const { kind, poster, ...rest } = generated;
    void kind;
    return { kind: "video", ...rest, poster: { kind: "photo", ...poster, alt } };
  }
  const { kind, ...photo } = generated;
  void kind;
  return { kind: "photo", ...photo, alt };
}

/** Narrowed helpers for slots that only make sense with one kind. */
export function getPhoto(key: MediaKey): PhotoAsset | null {
  const asset = getMedia(key);
  return asset?.kind === "photo" ? asset : null;
}

export function getVideo(key: MediaKey): VideoAsset | null {
  const asset = getMedia(key);
  return asset?.kind === "video" ? asset : null;
}

/* -------------------------------------------------------------------------- */
/* Test-facing surface                                                         */
/* -------------------------------------------------------------------------- */

/** Keys present in the generated manifest but missing alt text. Test fodder. */
export function keysMissingAlt(): string[] {
  return Object.keys(GENERATED_MEDIA).filter(
    (key) => !ALT[key as MediaKey]?.trim(),
  );
}

/** Every alt entry, for quality assertions. */
export function allAltEntries(): Array<[string, string]> {
  return Object.entries(ALT).filter((entry): entry is [string, string] => !!entry[1]);
}
