import assert from "node:assert/strict";
import { describe, test } from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * The media manifest's contract with the rest of the site.
 *
 * The site must look intentional at any level of asset coverage, which means
 * `getMedia` returning `null` is load-bearing: every call site branches on it.
 * These tests pin the two halves of that contract — a missing key is `null`,
 * and an asset without human-written alt text is treated as missing rather
 * than rendered with a placeholder description.
 */

const { getMedia, getPhoto, getVideo, keysMissingAlt, allAltEntries } = await import(
  "@/lib/media/manifest"
);
const { GENERATED_MEDIA } = await import("@/lib/media/manifest.generated");

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("media manifest", () => {
  test("an unknown key resolves to null, not an error", () => {
    assert.equal(getMedia("damage.does-not-exist"), null);
    assert.equal(getPhoto("damage.does-not-exist"), null);
    assert.equal(getVideo("damage.does-not-exist"), null);
  });

  test("every generated asset has human-written alt text", () => {
    assert.deepEqual(
      keysMissingAlt(),
      [],
      "These keys were processed but have no alt text in manifest.ts — add it before they can render.",
    );
  });

  test("alt text is a real description, not a stub", () => {
    for (const [key, alt] of allAltEntries()) {
      assert.ok(alt.trim().length >= 12, `${key}: alt "${alt}" is too short to describe anything`);
      assert.ok(!/\.(jpe?g|png|webp|avif)$/i.test(alt), `${key}: alt looks like a filename`);
    }
  });

  test("every generated file path exists on disk", () => {
    for (const [key, asset] of Object.entries(GENERATED_MEDIA)) {
      const paths =
        asset.kind === "photo"
          ? [asset.src, asset.webp, asset.avif]
          : [asset.mp4, asset.webm, asset.poster.src, asset.poster.webp, asset.poster.avif];
      for (const webPath of paths) {
        assert.ok(
          fs.existsSync(path.join(projectRoot, "public", webPath.replace(/^\//, ""))),
          `${key}: manifest points at ${webPath} but the file is not in public/ — re-run scripts/process-media.mjs`,
        );
      }
    }
  });

  test("photo dimensions are recorded and plausible", () => {
    for (const [key, asset] of Object.entries(GENERATED_MEDIA)) {
      const photo = asset.kind === "photo" ? asset : asset.poster;
      assert.ok(photo.width > 0 && photo.height > 0, `${key}: missing dimensions`);
      assert.ok(photo.blurDataURL.startsWith("data:image/"), `${key}: missing blur placeholder`);
    }
  });
});

describe("public/ media hygiene", () => {
  test("no GIFs anywhere in public/", () => {
    const gifs: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.gif$/i.test(entry.name)) gifs.push(full);
      }
    };
    walk(path.join(projectRoot, "public"));
    assert.deepEqual(gifs, [], "GIFs are banned — convert to mp4+webm via scripts/process-media.mjs");
  });

  test("no committed image carries EXIF GPS data", () => {
    // A JPEG with GPS carries the "GPS" tag name inside its EXIF APP1 segment,
    // which lives in the first kilobytes of the file. sharp strips all EXIF, so
    // any hit here means a file bypassed the pipeline.
    const suspects: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(jpe?g|tiff?)$/i.test(entry.name)) {
          const head = fs.readFileSync(full).subarray(0, 64 * 1024);
          if (head.includes(Buffer.from("Exif\0\0"))) suspects.push(full);
        }
      }
    };
    walk(path.join(projectRoot, "public"));
    assert.deepEqual(
      suspects,
      [],
      "These images carry EXIF segments — run them through scripts/process-media.mjs",
    );
  });
});
