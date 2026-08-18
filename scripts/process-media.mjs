/**
 * Media pipeline: originals in, budgeted web assets out.
 *
 *   node scripts/process-media.mjs
 *
 * Reads every file in `media-source/` (gitignored — originals never ship),
 * named after its manifest key:
 *
 *   media-source/hero.warehouse-walk.mov   -> video
 *   media-source/category.refrigerators.jpg -> photo
 *
 * For photos: applies EXIF orientation, strips ALL metadata (sharp emits none
 * unless asked — this includes GPS, which matters because photos shot off-site
 * carry the owner's location), resizes to the slot's width cap, and writes
 * AVIF + WebP + JPEG plus a 20px blur placeholder. For videos: h.264 mp4 +
 * VP9 webm via ffmpeg, audio track removed, metadata stripped, capped at
 * 1280px wide and 8 seconds, poster extracted from the first frame and run
 * through the photo pipeline.
 *
 * Output filenames carry a content hash so the immutable cache header on
 * /img/* and /video/* can never serve a stale asset. The whole of
 * `src/lib/media/manifest.generated.ts` is rewritten each run and orphaned
 * outputs are pruned, so `media-source/` is the single source of truth.
 *
 * Budgets are enforced, not suggested — the script exits non-zero:
 *   - any photo JPEG        > 250 KB
 *   - any video mp4         > 1.2 MB
 *   - homepage above-fold   > 1.6 MB (hero video mp4 + its poster, or the
 *                              hero photo when there is no video)
 *
 * Runs manually only. Never wired into build or CI — a checkout without
 * ffmpeg builds fine because the generated manifest is committed.
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "media-source");
const IMG_OUT = path.join(ROOT, "public", "img", "media");
const VIDEO_OUT = path.join(ROOT, "public", "video");
const MANIFEST_PATH = path.join(ROOT, "src", "lib", "media", "manifest.generated.ts");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff"]);
const VIDEO_EXTENSIONS = new Set([".mov", ".mp4", ".m4v", ".webm", ".avi", ".mkv"]);

const CATEGORY_SLUGS = [
  "refrigerators",
  "washers",
  "dryers",
  "washer-dryer-sets",
  "ranges",
  "dishwashers",
  "other",
];

/** Width caps per key prefix — the widths the slots actually render at. */
const WIDTH_CAPS = [
  { pattern: /^hero\./, width: 1920 },
  { pattern: /^category\./, width: 800 },
  { pattern: /^store\./, width: 1600 },
  { pattern: /^people\./, width: 1600 },
  { pattern: /^damage\./, width: 1200 },
  { pattern: /^footer\./, width: 1920 },
];

const BUDGETS = {
  photoJpegBytes: 250 * 1024,
  videoMp4Bytes: 1.2 * 1024 * 1024,
  homepageAboveFoldBytes: 1.6 * 1024 * 1024,
};

const VIDEO_MAX_WIDTH = 1280;
const VIDEO_MAX_SECONDS = 8;

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exitCode = 1;
}

function die(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function validKey(key) {
  if (/^category\./.test(key)) return CATEGORY_SLUGS.includes(key.slice("category.".length));
  if (/^damage\.[a-z0-9-]+$/.test(key)) return true;
  return [
    "hero.warehouse-walk",
    "hero.floor-wide",
    "hero.delivery",
    "store.exterior",
    "store.entrance",
    "store.interior-a",
    "store.interior-b",
    "people.team",
    "people.testing",
    "footer.strip",
  ].includes(key);
}

function widthCapFor(key) {
  const entry = WIDTH_CAPS.find(({ pattern }) => pattern.test(key));
  return entry ? entry.width : 1600;
}

function shortHash(buffer) {
  return createHash("sha1").update(buffer).digest("hex").slice(0, 10);
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function webPath(absolute) {
  return "/" + path.relative(path.join(ROOT, "public"), absolute).split(path.sep).join("/");
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    die(
      `${command} ${args.join(" ")}\nfailed: ${result.error?.message ?? result.stderr}`,
    );
  }
  return result.stdout;
}

function hasBinary(name) {
  return spawnSync(name, ["-version"], { encoding: "utf8" }).status === 0;
}

/* -------------------------------------------------------------------------- */
/* Photo pipeline                                                              */
/* -------------------------------------------------------------------------- */

/**
 * @returns {Promise<{src, avif, webp, width, height, blurDataURL, sizes: Record<string, number>}>}
 */
async function processImage(inputBuffer, key, groupDir, baseName) {
  // .rotate() with no argument bakes the EXIF orientation into the pixels;
  // sharp then emits no metadata at all unless .withMetadata() is called,
  // which this pipeline never does. That is the GPS strip.
  let pipeline;
  try {
    pipeline = sharp(inputBuffer).rotate();
    await pipeline.metadata();
  } catch (error) {
    die(
      `Could not read ${key}: ${error.message}\n` +
        `If this is an HEIC file your sharp build cannot decode, convert it first ` +
        `(macOS: sips -s format jpeg in.heic --out out.jpg).`,
    );
  }

  const resized = pipeline.resize({ width: widthCapFor(key), withoutEnlargement: true });

  const [{ data: jpegBuf, info: meta }, webpBuf, avifBuf, blurBuf] = await Promise.all([
    resized.clone().jpeg({ quality: 78, mozjpeg: true }).toBuffer({ resolveWithObject: true }),
    resized.clone().webp({ quality: 72 }).toBuffer(),
    resized.clone().avif({ quality: 55 }).toBuffer(),
    resized.clone().resize({ width: 20 }).webp({ quality: 30 }).toBuffer(),
  ]);

  const hash = shortHash(jpegBuf);
  fs.mkdirSync(groupDir, { recursive: true });

  const out = (ext, buffer) => {
    const file = path.join(groupDir, `${baseName}.${hash}.${ext}`);
    fs.writeFileSync(file, buffer);
    return file;
  };

  const jpegFile = out("jpg", jpegBuf);
  const webpFile = out("webp", webpBuf);
  const avifFile = out("avif", avifBuf);

  if (jpegBuf.length > BUDGETS.photoJpegBytes) {
    fail(
      `${key}: JPEG is ${kb(jpegBuf.length)} — over the ${kb(BUDGETS.photoJpegBytes)} photo budget. ` +
        `The frame is probably busier than the slot needs; crop tighter or shoot again.`,
    );
  }

  return {
    src: webPath(jpegFile),
    avif: webPath(avifFile),
    webp: webPath(webpFile),
    width: meta.width,
    height: meta.height,
    blurDataURL: `data:image/webp;base64,${blurBuf.toString("base64")}`,
    sizes: { jpg: jpegBuf.length, webp: webpBuf.length, avif: avifBuf.length },
  };
}

/* -------------------------------------------------------------------------- */
/* Video pipeline                                                              */
/* -------------------------------------------------------------------------- */

async function processVideo(inputPath, key, baseName) {
  if (!hasBinary("ffmpeg") || !hasBinary("ffprobe")) {
    die("ffmpeg + ffprobe are required for video sources. Install them and re-run.");
  }

  fs.mkdirSync(VIDEO_OUT, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(VIDEO_OUT, ".work-"));

  try {
    // -an drops the audio track entirely; -map_metadata -1 drops container
    // metadata, including GPS. Both formats share the same scale/trim.
    const filters = `scale='min(${VIDEO_MAX_WIDTH},iw)':-2`;
    const shared = ["-y", "-i", inputPath, "-t", String(VIDEO_MAX_SECONDS), "-an", "-map_metadata", "-1", "-vf", filters];

    const mp4Tmp = path.join(scratch, "out.mp4");
    run("ffmpeg", [...shared, "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4Tmp]);

    const webmTmp = path.join(scratch, "out.webm");
    run("ffmpeg", [...shared, "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-row-mt", "1", webmTmp]);

    const posterTmp = path.join(scratch, "poster.png");
    run("ffmpeg", ["-y", "-i", mp4Tmp, "-frames:v", "1", posterTmp]);

    const duration = Number.parseFloat(
      run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4Tmp]).trim(),
    );

    const mp4Buf = fs.readFileSync(mp4Tmp);
    const webmBuf = fs.readFileSync(webmTmp);
    const hash = shortHash(mp4Buf);

    const mp4File = path.join(VIDEO_OUT, `${baseName}.${hash}.mp4`);
    const webmFile = path.join(VIDEO_OUT, `${baseName}.${hash}.webm`);
    fs.writeFileSync(mp4File, mp4Buf);
    fs.writeFileSync(webmFile, webmBuf);

    const poster = await processImage(
      fs.readFileSync(posterTmp),
      key,
      path.join(IMG_OUT, key.split(".")[0]),
      `${baseName}-poster`,
    );

    if (mp4Buf.length > BUDGETS.videoMp4Bytes) {
      fail(
        `${key}: mp4 is ${kb(mp4Buf.length)} — over the ${kb(BUDGETS.videoMp4Bytes)} video budget. ` +
          `Trim the clip shorter or pick a steadier take (motion is what costs bits).`,
      );
    }

    return {
      mp4: webPath(mp4File),
      webm: webPath(webmFile),
      poster,
      durationSeconds: Math.round(duration * 10) / 10,
      sizes: { mp4: mp4Buf.length, webm: webmBuf.length },
    };
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

/* -------------------------------------------------------------------------- */
/* Manifest + prune                                                            */
/* -------------------------------------------------------------------------- */

function writeManifest(assets) {
  const entries = Object.keys(assets)
    .sort()
    .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(assets[key], null, 4).replace(/\n/g, "\n  ")},`)
    .join("\n");

  const header = fs.readFileSync(MANIFEST_PATH, "utf8").split("export const GENERATED_MEDIA")[0];
  fs.writeFileSync(
    MANIFEST_PATH,
    `${header}export const GENERATED_MEDIA: Record<string, GeneratedAsset> = {\n${entries}\n};\n`,
  );
}

function pruneOrphans(referenced) {
  for (const dir of [IMG_OUT, VIDEO_OUT]) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir, { recursive: true, withFileTypes: true })) {
      if (!file.isFile()) continue;
      const absolute = path.join(file.parentPath ?? file.path, file.name);
      if (!referenced.has(webPath(absolute))) {
        fs.rmSync(absolute);
        console.log(`  pruned ${webPath(absolute)}`);
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Main                                                                        */
/* -------------------------------------------------------------------------- */

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    die(`No ${path.relative(ROOT, SOURCE_DIR)}/ directory. Create it and drop originals in, named by manifest key.`);
  }

  const sources = fs
    .readdirSync(SOURCE_DIR)
    .filter((name) => !name.startsWith("."))
    .sort();
  if (sources.length === 0) die(`${path.relative(ROOT, SOURCE_DIR)}/ is empty.`);

  const assets = {};
  const rows = [];

  for (const name of sources) {
    const ext = path.extname(name).toLowerCase();
    const key = path.basename(name, path.extname(name));
    const inputPath = path.join(SOURCE_DIR, name);

    if (!validKey(key)) {
      die(
        `"${name}" does not map to a manifest key. Name files after their key, e.g. ` +
          `hero.warehouse-walk.mov, category.refrigerators.jpg, damage.door-corner-dent.jpg. ` +
          `Category slugs: ${CATEGORY_SLUGS.join(", ")}.`,
      );
    }
    if (assets[key]) die(`Two source files map to the key "${key}". Remove one.`);

    const [group, ...rest] = key.split(".");
    const baseName = rest.join(".");
    const originalBytes = fs.statSync(inputPath).size;

    if (IMAGE_EXTENSIONS.has(ext)) {
      const { sizes, ...photo } = await processImage(
        fs.readFileSync(inputPath),
        key,
        path.join(IMG_OUT, group),
        baseName,
      );
      assets[key] = { kind: "photo", ...photo };
      rows.push({ key, original: originalBytes, output: sizes.jpg, note: `avif ${kb(sizes.avif)}, webp ${kb(sizes.webp)}` });
    } else if (VIDEO_EXTENSIONS.has(ext)) {
      const { sizes, ...video } = await processVideo(inputPath, key, baseName);
      assets[key] = { kind: "video", ...video };
      rows.push({
        key,
        original: originalBytes,
        output: sizes.mp4,
        note: `webm ${kb(sizes.webm)}, ${video.durationSeconds}s`,
      });
    } else {
      die(`"${name}": unsupported extension "${ext}".`);
    }
  }

  // Above-the-fold homepage budget: slide 1 is the only above-fold media the
  // homepage loads — the hero video (mp4 + poster) or the hero photo.
  const heroVideo = assets["hero.warehouse-walk"];
  const heroPhoto = assets["hero.floor-wide"];
  let aboveFold = 0;
  if (heroVideo?.kind === "video") {
    aboveFold =
      fs.statSync(path.join(ROOT, "public", heroVideo.mp4.slice(1))).size +
      fs.statSync(path.join(ROOT, "public", heroVideo.poster.src.slice(1))).size;
  } else if (heroPhoto?.kind === "photo") {
    aboveFold = fs.statSync(path.join(ROOT, "public", heroPhoto.src.slice(1))).size;
  }
  if (aboveFold > BUDGETS.homepageAboveFoldBytes) {
    fail(
      `Homepage above-the-fold media is ${kb(aboveFold)} — over the ${kb(BUDGETS.homepageAboveFoldBytes)} budget.`,
    );
  }

  writeManifest(assets);

  const referenced = new Set();
  for (const asset of Object.values(assets)) {
    if (asset.kind === "photo") {
      referenced.add(asset.src).add(asset.webp).add(asset.avif);
    } else {
      referenced.add(asset.mp4).add(asset.webm);
      referenced.add(asset.poster.src).add(asset.poster.webp).add(asset.poster.avif);
    }
  }
  pruneOrphans(referenced);

  console.log("\n  key                             original      output   ");
  console.log("  ------------------------------- ------------- ---------");
  for (const { key, original, output, note } of rows) {
    console.log(`  ${key.padEnd(31)} ${kb(original).padStart(10)} -> ${kb(output).padStart(8)}  (${note})`);
  }
  console.log(
    `\n  ${rows.length} asset(s) written. Manifest updated: src/lib/media/manifest.generated.ts`,
  );
  console.log("  Next: add alt text for new keys in src/lib/media/manifest.ts.\n");

  if (process.exitCode) {
    console.error("\n  One or more budgets failed — outputs were written so you can inspect them,");
    console.error("  but do not commit until the budget passes.\n");
  }
}

await main();
