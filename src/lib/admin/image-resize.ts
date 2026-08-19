/**
 * Client-side photo downscaling, run before an upload leaves the phone.
 *
 * WHY THIS EXISTS
 *
 * Inventory is photographed on a phone, in a warehouse, on warehouse wifi. A
 * modern phone camera produces 4–12 MB JPEGs, and eight of those is up to 100 MB
 * pushed through a server action — slow enough that the owner assumes it has
 * frozen and reloads, and often over the 10 MB per-file limit the storage bucket
 * enforces, which turns a routine listing into an error message.
 *
 * Downscaling to `MAX_EDGE` on the long side costs nothing visible: the largest
 * the site ever renders a product photo is under 1600px, so the pixels being
 * discarded were never going to reach a shopper. What it buys is uploads that
 * finish, and pages that load on a phone.
 *
 * FAILING SOFT IS THE POINT
 *
 * Every failure path returns the original file rather than throwing. A photo
 * that cannot be decoded, a browser without `createImageBitmap`, a canvas that
 * refuses to encode — none of those are reasons to stop the owner listing an
 * appliance. Worst case the original bytes upload exactly as they did before.
 */

/** Longest edge kept. Comfortably above the largest size the site renders. */
const MAX_EDGE = 2000;

/** JPEG quality. High enough that dents and scratches stay legible. */
const QUALITY = 0.85;

/** Below this, re-encoding is more likely to hurt than help. */
const SKIP_BELOW_BYTES = 400 * 1024;

export interface ResizedPhoto {
  file: File;
  /** Object URL for the preview thumbnail. Revoke it when the preview unmounts. */
  previewUrl: string;
  originalBytes: number;
}

function replaceExtension(name: string, extension: string): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "photo";
  return `${base}.${extension}`;
}

async function decode(file: File): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, QUALITY);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Returns a smaller version of `file`, or `file` itself when shrinking it is not
 * possible or not worth it.
 */
export async function downscaleImage(file: File): Promise<File> {
  // AVIF and anything already small are left alone: re-encoding a small file
  // usually makes it bigger, and canvas cannot reliably write AVIF.
  if (file.size <= SKIP_BELOW_BYTES) return file;
  if (!file.type.startsWith("image/") || file.type === "image/avif") return file;

  const bitmap = await decode(file);
  if (!bitmap) return file;

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    if (width < 1 || height < 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);

    // PNG screenshots of spec plates keep their transparency; photographs go to
    // JPEG, which is dramatically smaller for the same visible quality.
    const targetType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await encode(canvas, targetType);
    if (!blob || blob.size >= file.size) return file;

    const extension = targetType === "image/png" ? "png" : "jpg";
    return new File([blob], replaceExtension(file.name, extension), {
      type: targetType,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap.close?.();
  }
}

/** Downscales a whole selection and builds preview URLs for it. */
export async function preparePhotos(files: File[]): Promise<ResizedPhoto[]> {
  const prepared: ResizedPhoto[] = [];
  for (const original of files) {
    const file = await downscaleImage(original);
    prepared.push({
      file,
      previewUrl: URL.createObjectURL(file),
      originalBytes: original.size,
    });
  }
  return prepared;
}

/** "4.2 MB", "812 KB" — for telling the owner what actually got sent. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
