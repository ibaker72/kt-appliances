import { SERVICE_LOCATIONS, type ServiceLocation } from "@/lib/content/locations";

/**
 * The gate between "someone added a record" and "Google sees a page".
 *
 * Programmatic location pages fail in one predictable way: a town gets added
 * with a name, a ZIP and a sentence, the route exists the moment the array
 * changes, and the site quietly grows a doorway page. This module is what stops
 * that. Anything that does not clear the bar is rendered `noindex` and left out
 * of the sitemap — it still resolves for anyone with the link, it just does not
 * enter the index.
 *
 * The thresholds below are the machine-checkable half of the standard. The other
 * half — is delivery there actually confirmed with the warehouse — is a human
 * decision documented in `docs/local-seo-locations.md`, and no amount of prose
 * length substitutes for it.
 */

/** Minimum unique-content requirements for an indexable location page. */
export const LOCATION_THRESHOLDS = {
  introMinChars: 180,
  summaryMinChars: 40,
  quickAnswerMinChars: 120,
  minLogistics: 3,
  minLocalNotes: 3,
  minZips: 1,
  /**
   * Share of a location's distinctive words that may also appear in another
   * location's copy before the two read as the same page with the name swapped.
   *
   * Deliberately generous: these pages describe one warehouse serving one
   * county, so words like "delivery", "warehouse" and "appliance" are supposed
   * to recur. What must not recur is the *specific* observation — the stair, the
   * fuel type, the access constraint. Measured on the rarer words only, 0.5 lets
   * shared vocabulary through and still catches a copy-paste.
   */
  maxOverlapRatio: 0.5,
} as const;

export type LocationIssueSeverity = "error" | "warning";

export interface LocationIssue {
  slug: string;
  field: string;
  severity: LocationIssueSeverity;
  message: string;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*-(?:pa|nj|ny)$/;
const ZIP_PATTERN = /^\d{5}$/;
const VALID_STATES = new Set(["PA", "NJ", "NY"]);

/** Words carried by every page here; they say nothing about whether copy is unique. */
const STOP_WORDS = new Set([
  "a","about","above","after","all","also","an","and","any","are","around","as","at","available","be",
  "because","been","before","being","below","between","both","but","by","call","can","cost","delivery",
  "do","does","doing","down","during","each","few","for","from","further","get","had","has","have",
  "having","he","her","here","hers","him","his","how","i","if","in","into","is","it","its","itself",
  "just","kt","me","more","most","my","no","nor","not","now","of","off","on","once","only","or",
  "other","our","ours","out","over","own","pa","same","she","should","so","some","such","text","than",
  "that","the","their","theirs","them","then","there","these","they","this","those","through","to",
  "too","under","until","up","us","very","was","we","were","what","when","where","which","while","who",
  "whom","why","will","with","would","you","your","yours","appliance","appliances","warehouse","unit",
  "units","stroudsburg","east","delivered","deliver","pickup","order","day","days",
]);

/** Every piece of prose on a location page, as one string. */
function locationCopy(location: ServiceLocation): string {
  return [
    location?.summary,
    location?.intro,
    location?.quickAnswer,
    ...(location?.logistics ?? []),
    ...(location?.localNotes ?? []),
    ...(location?.landmarks ?? []),
    ...(location?.housingContext ?? []),
    ...(location?.deliveryNotes ?? []),
  ]
    .filter((entry): entry is string => typeof entry === "string")
    .join(" ");
}

/** Distinctive words in a location's copy — lowercased, stop-words removed. */
function distinctiveWords(location: ServiceLocation): Set<string> {
  const name = (typeof location?.name === "string" ? location.name : "").toLowerCase();
  const own = new Set([name, ...name.split(/\s+/)]);
  return new Set(
    locationCopy(location)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word) && !own.has(word)),
  );
}

/**
 * Fraction of `a`'s distinctive vocabulary that also appears in `b`.
 *
 * Asymmetric on purpose: a short new record pasted from a long existing one
 * should score high (nearly all of its words are borrowed) even though the long
 * one is barely affected. That is the direction the check needs to catch.
 */
export function copyOverlapRatio(a: ServiceLocation, b: ServiceLocation): number {
  const wordsA = distinctiveWords(a);
  if (wordsA.size === 0) return 1;
  const wordsB = distinctiveWords(b);
  let shared = 0;
  for (const word of wordsA) if (wordsB.has(word)) shared += 1;
  return shared / wordsA.size;
}

/**
 * Validates one location.
 *
 * `peers` defaults to the published set, so the duplicate-copy check works
 * without the caller assembling anything; tests pass a fixture list instead.
 */
export function validateLocation(
  location: ServiceLocation,
  peers: ServiceLocation[] = SERVICE_LOCATIONS,
): LocationIssue[] {
  const issues: LocationIssue[] = [];

  // Every field is read defensively rather than trusted to the type.
  // TypeScript proves the shape at the call sites inside this repository, but
  // this function is the runtime gate on whether a page is indexable, and a gate
  // that throws on the malformed record it exists to reject is not a gate. The
  // half-filled literal — a name and a sentence, everything else absent — is
  // precisely the input it has to survive and refuse.
  const slug = typeof location?.slug === "string" ? location.slug : "";
  const name = typeof location?.name === "string" ? location.name : "";
  const state = typeof location?.state === "string" ? location.state : "";
  const county = typeof location?.county === "string" ? location.county : "";
  const distance = typeof location?.distance === "string" ? location.distance : "";
  const summary = typeof location?.summary === "string" ? location.summary : "";
  const intro = typeof location?.intro === "string" ? location.intro : "";
  const quickAnswer = typeof location?.quickAnswer === "string" ? location.quickAnswer : "";
  const updatedAt = typeof location?.updatedAt === "string" ? location.updatedAt : "";
  const zips = Array.isArray(location?.zips) ? location.zips : [];
  const logistics = Array.isArray(location?.logistics) ? location.logistics : [];
  const localNotes = Array.isArray(location?.localNotes) ? location.localNotes : [];

  const fail = (field: string, message: string) =>
    issues.push({ slug, field, severity: "error", message });
  const warn = (field: string, message: string) =>
    issues.push({ slug, field, severity: "warning", message });

  if (!SLUG_PATTERN.test(slug)) {
    fail("slug", `"${slug}" must be lowercase words joined by hyphens and end in the state, e.g. "stroudsburg-pa".`);
  }
  if (!name.trim()) fail("name", "Town name is required.");
  if (!VALID_STATES.has(state)) {
    fail("state", `"${state}" is not a served state.`);
  } else if (!slug.endsWith(`-${state.toLowerCase()}`)) {
    fail("slug", `Slug must end in "-${state.toLowerCase()}" to match the state.`);
  }
  if (!county.trim()) fail("county", "County is required — it is published in the page facts.");

  if (zips.length < LOCATION_THRESHOLDS.minZips) {
    fail("zips", "At least one ZIP code is required.");
  }
  for (const zip of zips) {
    if (!ZIP_PATTERN.test(zip)) fail("zips", `"${zip}" is not a five-digit ZIP code.`);
  }

  if (summary.trim().length < LOCATION_THRESHOLDS.summaryMinChars) {
    fail("summary", `Summary must be at least ${LOCATION_THRESHOLDS.summaryMinChars} characters.`);
  }
  if (intro.trim().length < LOCATION_THRESHOLDS.introMinChars) {
    fail("intro", `Intro must be at least ${LOCATION_THRESHOLDS.introMinChars} characters of copy specific to this town.`);
  }
  if (quickAnswer.trim().length < LOCATION_THRESHOLDS.quickAnswerMinChars) {
    fail("quickAnswer", `Quick answer must be at least ${LOCATION_THRESHOLDS.quickAnswerMinChars} characters and answer "do you deliver here?" outright.`);
  }
  if (!name || !quickAnswer.includes(name)) {
    fail("quickAnswer", "Quick answer must name the town — it is quoted on its own by answer engines.");
  }

  if (logistics.length < LOCATION_THRESHOLDS.minLogistics) {
    fail("logistics", `At least ${LOCATION_THRESHOLDS.minLogistics} delivery/pickup points are required.`);
  }
  if (localNotes.length < LOCATION_THRESHOLDS.minLocalNotes) {
    fail("localNotes", `At least ${LOCATION_THRESHOLDS.minLocalNotes} genuinely local observations are required.`);
  }

  if (!Number.isFinite(location?.driveMinutes) || location.driveMinutes < 0) {
    fail("driveMinutes", "Drive time must be a non-negative number of minutes.");
  }
  if (!distance.trim()) fail("distance", "Distance description is required.");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(updatedAt) || Number.isNaN(Date.parse(updatedAt))) {
    fail("updatedAt", "updatedAt must be an ISO date (YYYY-MM-DD) — it is published as the sitemap lastmod.");
  }

  for (const nearby of location?.nearbyAreas ?? []) {
    if (!peers.some((peer) => peer.slug === nearby)) {
      warn("nearbyAreas", `"${nearby}" is not a published service area, so the link would 404.`);
    }
  }

  const title = locationTitle(location);
  for (const peer of peers) {
    if (peer.slug === slug) continue;
    if (locationTitle(peer) === title) {
      fail("seo.title", `Title "${title}" is already used by "${peer.slug}".`);
    }
    const overlap = copyOverlapRatio(location, peer);
    if (overlap > LOCATION_THRESHOLDS.maxOverlapRatio) {
      fail(
        "copy",
        `${Math.round(overlap * 100)}% of this page's distinctive wording also appears on "${peer.slug}" — write copy specific to this town rather than swapping the name.`,
      );
    }
  }

  return issues;
}

/** Duplicate slugs across the whole set, which no per-record check can see. */
export function duplicateSlugs(locations: ServiceLocation[] = SERVICE_LOCATIONS): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const location of locations) {
    if (seen.has(location.slug)) duplicates.add(location.slug);
    seen.add(location.slug);
  }
  return [...duplicates];
}

/** Every issue across every location, plus set-level problems. */
export function auditLocations(locations: ServiceLocation[] = SERVICE_LOCATIONS): LocationIssue[] {
  const issues = locations.flatMap((location) => validateLocation(location, locations));
  for (const slug of duplicateSlugs(locations)) {
    issues.push({
      slug,
      field: "slug",
      severity: "error",
      message: `Slug "${slug}" appears more than once, so two records claim the same URL.`,
    });
  }
  return issues;
}

/**
 * Whether a location may be indexed.
 *
 * Warnings do not block: a stale `nearbyAreas` entry is worth flagging in the
 * health report but is not a reason to de-index a page a customer can use.
 */
export function isIndexable(
  location: ServiceLocation,
  peers: ServiceLocation[] = SERVICE_LOCATIONS,
): boolean {
  return !validateLocation(location, peers).some((issue) => issue.severity === "error");
}

/** The locations that belong in the sitemap, the hub page and internal links. */
export function indexableLocations(
  locations: ServiceLocation[] = SERVICE_LOCATIONS,
): ServiceLocation[] {
  return locations.filter((location) => isIndexable(location, locations));
}

/** The `<title>` for a location page — one place, so uniqueness is checkable. */
export function locationTitle(location: ServiceLocation): string {
  return location?.seo?.title ?? `Appliances in ${location?.name}, ${location?.state}`;
}
