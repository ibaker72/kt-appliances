# SEO, AEO and GEO architecture

How organic acquisition works on this site: what is indexed, what is deliberately
not, where the business facts live, and what the scheduled jobs do.

This is a working reference, not a strategy document. If you change a page's
copy, a location record, or the canonical domain, the sections below tell you
what else moves with it.

---

## 1. Canonical domain and the business entity

**Canonical origin:** `https://kt-appliances.com`, set through
`NEXT_PUBLIC_SITE_URL`.

Everything — canonicals, Open Graph URLs, sitemap entries, JSON-LD `@id` values,
`llms.txt`, IndexNow submissions — derives from that one variable via
`absoluteUrl()` in `src/lib/site-config.ts`. No domain is hardcoded anywhere.

**While `NEXT_PUBLIC_SITE_URL` is unset, `robots.txt` disallows all crawling.**
That is deliberate: it stops a preview deployment being indexed ahead of
production. It also means forgetting the variable on production takes the site
out of the index, which is why the health check treats it as a hard failure.

### The published business facts

One source: `src/lib/site-config.ts`. Nothing below is duplicated in a component,
a page or a schema helper — they all import it.

| Fact | Value |
| --- | --- |
| Name | KT Appliances |
| Legal name | KT Appliances, LLC |
| Address | 109 Burson St, East Stroudsburg, PA 18301 |
| **Public phone** | **(973) 519-9717 / +19735199717** |
| Email | ktappliances20@gmail.com |
| Hours | Daily 10:00–17:00; 17:00–21:00 by appointment |
| States served | Pennsylvania, New Jersey, New York |
| Family owned since | 2000 |

### The two-number rule

KT Appliances runs on two phone numbers and they must never be swapped.

- **`+19735199717` — the public business line.** What the site displays, what
  every `tel:`/`sms:` link points at, and the `telephone` on the LocalBusiness
  schema. This is the string Google matches against the Google Business Profile;
  a mismatch costs local ranking silently.
- **`+15707500622` — the Twilio sending number.** Automated texts originate from
  it. It must never appear as a business phone in schema, in indexed copy, or in
  `llms.txt`.

Enforced by `tests/phone-architecture.test.ts`, `tests/seo-schema.test.ts`
(asserts the Twilio number appears nowhere in the LocalBusiness graph) and
`tests/seo-content.test.ts` (asserts it appears in no FAQ answer). The daily
health check re-checks it in production.

---

## 2. Page types

| Type | Route | Rendering | Count today |
| --- | --- | --- | --- |
| Home | `/` | Static, ISR 300s | 1 |
| Inventory listing | `/inventory` | Dynamic (reads filters) | 1 |
| Category | `/refrigerators`, `/washers`, `/dryers`, `/washer-dryer-sets`, `/ranges`, `/dishwashers`, `/other-appliances` | Dynamic (reads filters), ISR 120s data | 7 |
| Product | `/inventory/[slug]` | SSG + ISR 120s, on-demand beyond the first 500 | live catalogue |
| Service area | `/appliances/[location]` | SSG + ISR 600s | 5 |
| Service-area hub | `/service-areas` | Static | 1 |
| Guide | `/guides/[slug]` | SSG, ISR 3600s | 6 |
| Guides index | `/guides` | Static | 1 |
| Campaign | `/deals/[campaign]` | SSG, ISR 120s | 3 |
| Service pages | `/delivery-installation`, `/financing`, `/warranty`, `/schedule` | Static | 4 |
| Company | `/about`, `/contact` | Static | 2 |
| Legal | `/privacy`, `/terms`, `/accessibility` | Static | 3 |
| **Not indexed** | `/admin/*`, `/api/*`, `/inventory/saved`, `/inventory/compare` | — | — |

**Indexable page count today: 34 + the live product catalogue.**

Rendering was not changed by the SEO work. Category and inventory routes were
already dynamic because they read `searchParams`; location pages remain
prerendered with ISR.

---

## 3. Canonicals and the duplicate-content policy

Every indexable route emits an absolute canonical through `pageMetadata()` or
`listingMetadata()` in `src/lib/seo/metadata.ts`. There is no page that builds
its own.

### Faceted navigation

`/inventory` and the seven category routes accept `q`, `category`, `brand`,
`type`, `color`, `min`, `max`, `condition`, `fuel`, `warranty`, `deals`,
`status`, `sort`, `page`, `compare` and `cols`. Left alone that is more URLs
than the warehouse has products. The policy, implemented in `listingMetadata()`
and classified by `listingView()` in `src/lib/inventory/search-params.ts`:

| URL shape | Robots | Canonical |
| --- | --- | --- |
| `/refrigerators` | `index, follow` | itself |
| `/refrigerators?page=3` | `index, follow` | `?page=3` (itself) |
| `/refrigerators?brand=LG` | `noindex, follow` | `/refrigerators` |
| `/inventory?sort=price-asc` | `noindex, follow` | `/inventory` |
| `/inventory?q=lg` | `noindex, follow` | `/inventory` |
| `/inventory?status=sold` | `noindex, follow` | `/inventory` |
| `/inventory?category=refrigerators` | `noindex` | **`/refrigerators`** |
| `?gclid=…`, `?utm_*` | `index, follow` | clean URL |

Three decisions worth knowing:

1. **Pagination stays indexable and self-canonical.** Canonicalising page 3 to
   page 1 is a common mistake — it hides every product only reachable from page 3.
2. **`follow` is kept on every noindex listing.** These pages are the main crawl
   path into individual appliances. Dropping `follow` would orphan the catalogue.
3. **Filtered URLs are handled with meta robots, never a `Disallow`.** A
   disallowed URL is never fetched, so the crawler never reads the `noindex` on
   it and never follows the links beneath it. Blocking is strictly worse here.
4. **`?category=` canonicalises to the dedicated category route**, not back to
   `/inventory` — that consolidates the signal on the page that carries the
   buying guidance and the category FAQ.

Unknown parameters (ad-platform click IDs, UTM tags) do not make a URL filtered,
so a paid landing page is not knocked out of the index by its own tracking.

---

## 4. robots.txt

Generated by `src/app/robots.ts`.

```
User-Agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /inventory/compare
Disallow: /inventory/saved

Sitemap: https://kt-appliances.com/sitemap.xml
```

**`/_next/` is deliberately not blocked.** An earlier version disallowed it,
which blocks the CSS and JavaScript Google renders pages with — the crawler then
assesses an unstyled page, and on mobile often an unusable one. There is a test
asserting this specifically (`tests/seo-sitemap.test.ts`).

Admin routes additionally carry `X-Robots-Tag: noindex, nofollow, noarchive` from
both `next.config.ts` and `src/proxy.ts`, so they stay out of the index even if
robots.txt is ignored.

---

## 5. Sitemap

`src/app/sitemap.ts` delegates to `buildSitemap()` in `src/lib/seo/sitemap.ts`,
which reads the route registry in `src/lib/seo/routes.ts`.

Contains: static routes, the seven categories, campaigns, indexable locations,
guides, and every published non-draft product. Excludes admin, API, and the two
shopper-tool routes. No URL with a querystring is ever listed.

### `lastmod` is honest

The rule: **never stamp `new Date()` on a page that did not change.** A sitemap
where all fifty URLs changed "just now" on every fetch trains crawlers to ignore
the field.

| Source | Where the date comes from |
| --- | --- |
| Products | `appliances.updated_at` |
| Guides | `guide.updated` in `src/lib/content/guides.ts` |
| Locations | `location.updatedAt` in `src/lib/content/locations.ts` |
| Categories | Newest `updated_at` among that category's published products |
| Static & campaigns | `reviewedAt` in `src/lib/seo/routes.ts` — **hand-maintained** |

> **When you materially change a static page's copy, move its `reviewedAt` date
> in `src/lib/seo/routes.ts`.** Leaving it stale costs a slower recrawl of that
> one page. Faking it forward costs credibility on every URL in the file.

`tests/seo-sitemap.test.ts` asserts that no entry claims to have changed within
the last minute.

### Sold products

Stay listed, at a reduced priority (0.4 vs 0.8). Their pages remain live and
useful — they show what the unit sold for and cross-sell current stock — and
dropping a URL that still returns 200 throws away its accumulated equity.

### Growing past one file

`buildSitemap()` returns one flat, deduplicated list and reports
`needsSharding` once it passes 50,000 URLs. At that point `app/sitemap.ts` gains
a `generateSitemaps()` that slices the same list; nothing else changes. The
health check surfaces the threshold before a crawler notices.

---

## 6. Structured data

All JSON-LD comes from `src/lib/seo/jsonld.ts` and renders through
`src/components/seo/json-ld.tsx`.

| Schema | Where it renders | Notes |
| --- | --- | --- |
| `Store` / `HomeGoodsStore` / `LocalBusiness` | Root layout — every page | `@id: {origin}/#store`. Address, phone, hours, `areaServed` (states + published towns), `hasOfferCatalog` (delivery, installation, haul-away) |
| `WebSite` | Root layout — every page | `@id: {origin}/#website`, `publisher` → `#store`, `SearchAction` → `/inventory?q=` |
| `BreadcrumbList` | Every page using `PageHeader` or `Breadcrumbs` | Absolute URLs, 1-based positions |
| `Product` + `Offer` | `/inventory/[slug]` | Real price, USD, real availability, `seller` → `#store` |
| `ItemList` | `/inventory`, categories, campaigns, location pages | Matches the units actually rendered |
| `FAQPage` | Home, about, contact, categories, delivery, financing, warranty, service-areas, locations, guides | **One per page, and no two pages share a set** |
| `Service` | `/appliances/[location]` | `provider` → `#store`, `areaServed` → `City`. No address, no phone, no hours |
| `Article` | `/guides/[slug]` | `author`/`publisher` → `#store` |

### Why there is no separate `Organization` node

`LocalBusiness` is already a subclass of `Organization`. Publishing both for a
single-location business creates two nodes competing to be the same entity —
exactly the ambiguity structured data exists to remove. Everything that needs to
reference the business points at `#store`.

### What is never emitted

- **No `AggregateRating` or `Review`.** The business publishes no ratings, so
  inventing them is both a lie and a manual-action risk. Asserted in tests.
- **No second `PostalAddress`.** There is one building. Service areas are `City`
  nodes under `areaServed` and on the location `Service` node — never addresses,
  which would claim branches that do not exist.
- **No FAQ content that is not visible on the page.** Every `FaqSection` renders
  its answers in the markup inside `<details>`; the schema describes that.
- **No fabricated discounts.** `compareAtPrice` is only rendered when a real
  verified retail price is on record and is genuinely higher.

---

## 7. AEO — answering the question

Direct-answer blocks (`src/components/shared/quick-answer.tsx`) sit above the
fold on the pages people arrive at with one question:

- `/appliances/[location]` — "Does KT Appliances deliver to *town*?"
- `/service-areas` — "Where does KT Appliances deliver appliances?"
- `/delivery-installation` — "How much does appliance delivery cost?"

Each is followed by a `FactGrid` of the extractable facts (address, distance, ZIP
coverage, hours).

Rules the answer copy has to follow, all asserted in `tests/seo-content.test.ts`:

- A yes/no question is answered in the first word.
- Every answer stands alone when quoted with none of its page around it
  (minimum 80 characters, self-contained).
- No marketing throat-clearing — "At KT Appliances we strive to…" fails the test.
- No claim the business has not committed to: no guaranteed same-day, no
  automatic warranty, no "cheapest", no "best appliance store", no awards.

The answer text used in a `QuickAnswer` is the same string used in that page's
FAQ schema. `DELIVERY_COST_ANSWER` in `src/lib/content/faq.ts` is the worked
example: one constant, rendered as the visible answer, the FAQ entry and the
structured data.

### FAQ sets

Each page type has its own set, so no two pages publish the same `FAQPage`:

- `CORE_FAQS` — the shared bank, on `/about` and `/contact`
- `HOME_FAQS`, `DELIVERY_FAQS`, `FINANCING_FAQS`, `WARRANTY_FAQS`
- `CATEGORY_FAQS[slug]` — four questions per category, none repeated across
  categories, plus two shared ones (condition, warranty)
- `locationFaqs(location)` — five questions per town, all naming the town

---

## 8. GEO — machine-readable entity facts

Three surfaces, all fed from `site-config.ts` so they cannot disagree:

1. **`/about#business`** — one paragraph in plain declarative sentences stating
   what the business is, where, what it sells and how you get it, followed by a
   `FactGrid` of the same facts.
2. **LocalBusiness JSON-LD** — the same facts, machine-readable, site-wide.
3. **`/llms.txt`** — a factual index for language models: business facts, a
   "facts worth stating precisely" section that pre-empts the errors a model
   would otherwise make (delivery is quoted not flat-rate; same-day is not
   guaranteed; warranty is optional; no ratings are published), and a link map of
   the public sections.

`llms.txt` is not a ranking mechanism and is not treated as one. It exposes no
admin, API or shopper-tool URLs.

---

## 9. The location engine

### Current service areas

| Town | Slug | County | ZIPs | Distance |
| --- | --- | --- | --- | --- |
| East Stroudsburg | `east-stroudsburg-pa` | Monroe | 18301, 18302 | Warehouse |
| Stroudsburg | `stroudsburg-pa` | Monroe | 18360 | ~5 min |
| Bartonsville | `bartonsville-pa` | Monroe | 18321 | ~10 min |
| Mount Pocono | `mount-pocono-pa` | Monroe | 18344 | ~20 min |
| Pocono Summit | `pocono-summit-pa` | Monroe | 18346 | ~25 min |

Data lives in `src/lib/content/locations.ts`. The route is
`/appliances/[location]`, prerendered with ISR.

### The quality gate

`src/lib/seo/location-quality.ts` decides whether a record may be indexed. A
record that fails **still renders** — anyone with the link gets a working page —
but it is `noindex` and absent from the sitemap, the hub page, the homepage
module and the footer.

Requirements (`LOCATION_THRESHOLDS`):

| Field | Requirement |
| --- | --- |
| `slug` | lowercase-hyphenated, ending in the state (`stroudsburg-pa`) |
| `state` | PA, NJ or NY, matching the slug suffix |
| `county` | present |
| `zips` | at least one, five digits each |
| `summary` | ≥ 40 characters |
| `intro` | ≥ 180 characters |
| `quickAnswer` | ≥ 120 characters, and must name the town |
| `logistics` | ≥ 3 points |
| `localNotes` | ≥ 3 points |
| `updatedAt` | ISO `YYYY-MM-DD` |
| title | unique across all locations |
| copy | ≤ 50% distinctive-word overlap with any other location |

That last one is the anti-spam check: it catches a page copied from a
neighbouring town with the name swapped, which passes every length threshold.
`tests/seo-location-quality.test.ts` proves it does, using a real page cloned and
renamed as the fixture.

**Adding a town is a business decision before it is a content task.** See
`docs/local-seo-locations.md`.

### Why there are no city × category pages

`/appliances/stroudsburg-pa/refrigerators` was evaluated and deliberately **not
built**. There is one warehouse and one inventory, so a city × category page
would contain: the same filtered product grid as `/refrigerators`, the same
category buying guidance, and the same delivery copy as the town page. The only
genuinely new content would be the intersection paragraph — which is the
definition of a thin page, and 5 towns × 7 categories would mean 35 of them.

What was built instead: each location page carries per-category sections drawn
from that town's `categoryDemand`, each with live counts and a deep link into the
real category page. Same intent coverage, no thin pages, and the link equity
consolidates on the category pages that already rank.

This would be worth revisiting only if the business gains genuinely
location-specific inventory or pricing.

---

## 10. Internal linking

```
Home ──┬─→ /inventory ──→ category ──→ product
       ├─→ category (rail)
       ├─→ /service-areas ──→ /appliances/[town] ─┬─→ category
       ├─→ /appliances/[town] (direct chips)      ├─→ /inventory
       ├─→ /guides ──→ /guides/[slug]             ├─→ /delivery-installation
       ├─→ /deals/[campaign]                      ├─→ /warranty, /financing
       └─→ /contact                               └─→ neighbouring town
```

- **Home** links to inventory, all seven categories, every published town, the
  service-area hub, three guides, campaigns and contact. The town and guide
  modules were added specifically so those pages are crawled as primary content
  rather than as footer boilerplate.
- **Service-area hub** links to every indexed town, nearest first, plus every
  category and the delivery and pickup pages.
- **Location pages** link to every category, the relevant category rails, the
  full inventory, delivery, warranty, financing, and neighbouring towns
  (`nearbyAreas`, validated to resolve).
- **Product pages** link to the parent category, delivery, warranty, financing,
  terms, service areas, and related units in the same category.
- **Guides** carry a three-link "Ready to buy?" block into the relevant category,
  delivery and service areas.
- **Footer** carries the standard shop/services/company columns plus the town
  list — deliberately the same short list, not a keyword-stuffed link dump.

---

## 11. Cron jobs

Configured in `vercel.json`. Both are `GET`, Node runtime, `force-dynamic`.

### Authentication (both routes)

`Authorization: Bearer $CRON_SECRET`, which is what Vercel Cron sends when the
project has `CRON_SECRET` set. Compared in constant time
(`src/lib/seo/cron-auth.ts`).

- Wrong or missing credential → **401**
- `CRON_SECRET` not configured → **503**, routes disabled

**Fails closed.** A deploy that forgets the variable produces a loud 503 in the
cron log rather than a quietly public endpoint. The secret is never accepted from
the querystring — a secret in a URL ends up in access logs and referrers.

Responses are always `cache-control: no-store` and `x-robots-tag: noindex,
nofollow`.

### A — `/api/cron/seo-health`

**Schedule:** `17 9 * * *` (daily, 09:17 UTC).

Read-only. Changes nothing, publishes nothing, sends nothing. It inspects the
application's own data and its own generators rather than crawling the live site
— everything that can go wrong here is visible from inside the process.

Checks:

| Check | Fails when |
| --- | --- |
| `canonical-domain` | `NEXT_PUBLIC_SITE_URL` unset or not https |
| `robots` | robots.txt throws, disallows `/`, disallows `/_next`, or omits the sitemap |
| `sitemap` | generation throws, produces zero URLs, or contains duplicates |
| `locations` | any record fails the quality gate |
| `nap-phone` | LocalBusiness `telephone` is not `+19735199717` (explicitly flags the Twilio number) |
| `nap-address` | the published address is incomplete |
| `inventory-slugs` | a published appliance has no slug, or slugs collide |
| `inventory-completeness` | *(warn)* published units with no photo or description |
| `guides` | *(warn)* a guide not reviewed in over a year |
| `search-console` | *(warn)* no verification tag configured |

**Failure behaviour:** returns **200** with `ok: false` and `status: "fail"` when
a check fails — a failing check is not a failing endpoint, and returning 500
would make a real outage indistinguishable from a missing product photo. An
unhandled exception returns 500. Every non-passing check is logged with
`console.warn`.

### B — `/api/cron/search-indexing`

**Schedule:** `47 10 * * *` (daily, 10:47 UTC).

Announces URLs whose content genuinely changed since they were last announced,
via IndexNow.

Candidates: **product pages, service-area pages and guides** — the three things
with a real content timestamp behind them. The homepage, categories and listings
are excluded on purpose: they change composition constantly without their content
changing, and announcing them nightly would be exactly the fake-freshness churn
this is designed not to produce.

Idempotence comes from the `seo_url_submissions` ledger, not from application
memory: a URL is re-announced only when its content stamp is newer than the one
recorded against it. Running the job twice in a row submits nothing the second
time.

**Failure behaviour, in order of precedence:**

| State | Result |
| --- | --- |
| No `INDEXNOW_KEY` | 200, `configured: false`, nothing sent |
| Key set, ledger unavailable | 200, `ok: false`, nothing sent — refuses to resubmit blind |
| Endpoint rejects the batch | 200, `ok: false`, nothing recorded, retried next run |
| Network failure | Same — reported, not thrown |
| Ledger write fails after a successful send | `ok: false` and a note; the URLs are re-sent next run |

Batched at 100 URLs per run, newest first; the remainder is reported as
`deferred` and picked up on the next run. Off-host URLs are dropped before
anything is sent.

> **IndexNow reaches Bing, Yandex, Seznam and Naver. Google does not use it.**
> Nothing in this route affects Google Search. Google discovery here is the
> sitemap, honest `lastmod` values, internal linking and Search Console.

### Inventory freshness (no separate job)

Deliberately not a cron. Real inventory changes — a new listing, a price change,
a sold unit, a new photo — already move `appliances.updated_at`, which flows into
the sitemap `lastmod`, the Product schema availability, the category page
`lastmod`, and the search-discovery candidate set. Nothing needs to be rewritten
on a schedule to make a page look fresh, and doing so would be the churn this
architecture rejects.

---

## 12. Environment variables

Set in Vercel → Project → Settings → Environment Variables.

### Required for SEO

| Variable | Scope | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Production | `https://kt-appliances.com` (no trailing slash) |
| `NEXT_PUBLIC_BUSINESS_PHONE` | All | `+19735199717` |
| `CRON_SECRET` | Production | Server-only. `openssl rand -base64 32` |

### Optional

| Variable | Effect when absent |
| --- | --- |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | No HTML verification tag. Not needed if you verify by DNS |
| `INDEXNOW_KEY` | Discovery cron reports `configured: false` and sends nothing |
| `NEXT_PUBLIC_FACEBOOK_URL` / `_INSTAGRAM_URL` / `_MARKETPLACE_URL` | `sameAs` omitted from LocalBusiness entirely |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID` | That provider's script does not load |

**`CRON_SECRET` and `INDEXNOW_KEY` must not be prefixed `NEXT_PUBLIC_`.** They are
server-only.

---

## 13. Search Console

`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` holds the *content* value of the HTML tag,
not the whole tag. It is rendered by `rootMetadata.verification.google`.

DNS/domain-property verification needs no application variable and is the better
option — it covers every subdomain and survives a deploy.

Verification cannot be automated from here; it needs Google account access.

---

## 14. IndexNow setup

1. Generate a key: 8–128 characters, letters, digits and hyphens.
   `openssl rand -hex 16` produces a suitable one.
2. Set `INDEXNOW_KEY` in Vercel (production, server-only).
3. Redeploy. The key becomes readable at
   `https://kt-appliances.com/indexnow-key.txt`, which is what the protocol
   requires for ownership verification. Confirm it returns the key as plain text.
4. Run the migration below so the submission ledger exists.
5. Trigger `/api/cron/search-indexing` manually once and confirm
   `configured: true`, `persisted: true`.

The key file is public by design — it is the ownership proof, and the only thing
it authorises is notifying search engines about pages on this domain.

---

## 15. Database

One additive migration: `supabase/migrations/0004_seo_url_submissions.sql`.

Creates `public.seo_url_submissions` (one row per URL: the URL, the content
timestamp submitted, and when). RLS enabled with no policies, privileges revoked
from `anon` and `authenticated`, granted only to `service_role` — the same model
as `leads` and `appointments`.

Idempotent and safe to re-run. Dropping it costs only the submission history:
the cron detects the missing ledger and reports `persisted: false` rather than
failing.

Nothing else in the database changed.

---

## 16. Tests

```bash
npm test        # node --test over tests/**/*.test.ts
npm run typecheck
npm run lint
npm run build
```

SEO-specific suites:

| File | Covers |
| --- | --- |
| `tests/seo-metadata.test.ts` | Canonicals, noindex/follow, pagination, filtered-view classification, title uniqueness |
| `tests/seo-sitemap.test.ts` | Inclusion, exclusion, no duplicates, no querystrings, honest `lastmod`, robots policy |
| `tests/seo-schema.test.ts` | NAP correctness, Twilio number absence, one PostalAddress, no fabricated ratings, Product availability, breadcrumbs |
| `tests/seo-location-quality.test.ts` | The quality gate, including a name-swapped clone as a fixture |
| `tests/seo-content.test.ts` | Answer quality, FAQ set uniqueness, route registry, guide metadata |
| `tests/seo-cron.test.ts` | Auth (401/503), fail-closed, IndexNow no-op when unconfigured, submission idempotence |

Nothing in the suite reaches the network or a database: Supabase and Twilio
credentials are cleared in `tests/register.mjs`, and the one test that exercises
IndexNow submission stubs `fetch`.

---

## 17. Deployment

1. Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BUSINESS_PHONE` and `CRON_SECRET`.
2. Run `supabase/migrations/0004_seo_url_submissions.sql` (only needed if you
   intend to use IndexNow).
3. Deploy. `vercel.json` registers both cron jobs automatically.
4. Verify:
   - `https://kt-appliances.com/robots.txt` — allows `/`, references the sitemap,
     does **not** disallow `/_next`
   - `https://kt-appliances.com/sitemap.xml` — has products in it, and `lastmod`
     values that are not all today
   - `https://kt-appliances.com/llms.txt` — correct address and phone
   - View source on any page — one canonical, one LocalBusiness block
   - `curl -H "Authorization: Bearer $CRON_SECRET" https://kt-appliances.com/api/cron/seo-health`
     — `status` should be `pass` or `warn`, never `fail`
5. Submit `sitemap.xml` in Google Search Console and in Bing Webmaster Tools.

---

## 18. What this system will not do

Enforced by tests and by the architecture, not by good intentions:

- No city pages without confirmed delivery and real local content
- No city-name-swapped copy (caught by the overlap check)
- No `LocalBusiness` address for a town with no building in it
- No fabricated reviews, ratings, awards or years in business
- No "best" or "cheapest" claims
- No FAQ structured data for content that is not on the page
- No duplicate `FAQPage` graphs across pages
- No `lastmod` churn to simulate freshness
- No AI-generated content published by a cron job
