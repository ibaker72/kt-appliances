# Adding a service area

A location page is one object in `src/lib/content/locations.ts`, and the route,
the sitemap entry, the hub card, the homepage chip, the footer link and the
`Service` schema all appear the moment it is added. That is the point of the
architecture, and it is also how a site quietly grows fifty doorway pages.

So the bar is high, and half of it is not a writing task.

---

## The rule

**Do not publish a page for a town KT Appliances has not confirmed it delivers
to, and do not publish a page you cannot write three genuinely specific things
about.**

A thin page is worse than no page. It competes with the pages that do rank, it
dilutes the site's local relevance across towns it cannot serve, and at scale it
is what Google calls a doorway page. If in doubt, leave the town out — the
service-areas hub already invites anyone outside the published list to text their
ZIP code for a quote, which converts perfectly well without a page.

---

## Step 1 — Confirm with the warehouse, before writing anything

Every one of these needs a real answer from the business. Not a guess, not an
inference from a map.

- [ ] **Do we actually deliver there?** Not "could we" — do we.
- [ ] **What does the run cost, roughly?** Enough to write a truthful sentence
      about which end of the range it sits at.
- [ ] **Roughly how long is the drive from 109 Burson St?**
- [ ] **Which ZIP codes are we covering?** All of them, exactly.
- [ ] **What county is it in?**
- [ ] **Is same-day realistic on this route, ever?** If not, the page must not
      imply it.
- [ ] **Are there access constraints the crew has hit there?** Gated
      communities, seasonal roads, steep drives, narrow streets, parking.
- [ ] **What do people there tend to ask for?** Which appliance categories.
- [ ] **Anything about the housing that changes what fits?** Older stock,
      cabins, rentals, second homes, basement laundry, propane instead of
      natural gas, well water.

If the answer to the first question is no, stop. Nothing else matters.

If the answers to the last three are "nothing in particular", stop as well — you
do not have a page, you have a name and a distance, and that is exactly the
record the quality gate is built to reject.

---

## Step 2 — Write the record

```ts
{
  slug: "newtown-pa",              // lowercase-hyphenated, ends in the state
  name: "Newtown",
  state: "PA",
  county: "Monroe County",
  tier: "close",                   // warehouse | close | regional
  distance: "About 12 minutes via Route 611",
  driveMinutes: 12,
  zips: ["18999"],

  summary: "…",                    // ≥ 40 chars — the hub card line
  intro: "…",                      // ≥ 180 chars — specific to this town
  quickAnswer: "Yes. …",           // ≥ 120 chars, must name the town

  logistics: ["…", "…", "…"],      // ≥ 3, about getting an appliance HERE
  localNotes: ["…", "…", "…"],     // ≥ 3, genuinely local observations

  landmarks: ["…"],                // optional — roads and interchanges
  housingContext: ["…"],           // optional — what the housing means
  deliveryNotes: ["…"],            // optional — booking constraints
  categoryDemand: ["refrigerators", "washers"],   // optional
  nearbyAreas: ["stroudsburg-pa"], // optional — must be published slugs

  seo: { title: "Appliances Delivered to Newtown, PA" },  // ≤ 48 chars
  updatedAt: "2026-08-18",         // today
}
```

### What each field has to be

**`quickAnswer`** is the most important string on the page. It is rendered above
the fold and quoted verbatim into the FAQ schema, so an answer engine may lift it
with none of its page around it. Two sentences at most. First word answers the
question. It must name the town. It must not promise same-day unless the business
does.

> Yes. KT Appliances delivers to Newtown, PA (18999) from the East Stroudsburg
> warehouse about twelve minutes away. Delivery is quoted by appliance and by
> whether you need installation or haul-away.

**`logistics`** is about moving an appliance to *this* town: the route, whether
pickup is realistic from here, what can be booked on the same trip, how the
quote works on this run.

**`localNotes`** is where the page earns its right to exist. Three observations
that are true of this town and would be false or irrelevant somewhere else.

Good, because they are specific and useful:

> Winter access matters up here — if your driveway is steep or unplowed, tell us
> when you schedule so the crew plans for it.

> Well water is common in this area and is hard on ice makers and dishwashers
> over time.

> Cabin and smaller-home kitchens frequently need apartment-size or 24-inch units
> rather than standard 30-inch.

Bad, because they are true of anywhere and say nothing:

> Newtown residents deserve quality appliances at affordable prices.

> We are proud to serve the Newtown community with our wide selection.

> Looking for appliances in Newtown? KT Appliances has you covered.

**`updatedAt`** becomes the sitemap `lastmod`. Set it to the day you wrote or
last revised the copy. Move it when you revise. Never move it to look fresh.

---

## Step 3 — Prove it passes

```bash
npm test
```

`tests/seo-location-quality.test.ts` runs `auditLocations()` over every record
and fails on any error. What it checks, from
`src/lib/seo/location-quality.ts`:

| Check | Threshold |
| --- | --- |
| Slug format | lowercase-hyphenated, ends in the state |
| Slug/state agreement | `-pa` slug requires `state: "PA"` |
| State | PA, NJ or NY only |
| County | present |
| ZIPs | at least one, five digits each, not claimed by another town |
| `summary` | ≥ 40 characters |
| `intro` | ≥ 180 characters |
| `quickAnswer` | ≥ 120 characters, names the town |
| `logistics` | ≥ 3 entries |
| `localNotes` | ≥ 3 entries |
| `driveMinutes` | non-negative number |
| `updatedAt` | ISO `YYYY-MM-DD` |
| Title | unique across all locations, ≤ 48 characters |
| **Copy overlap** | **≤ 50% of distinctive words shared with any other town** |
| `nearbyAreas` | *(warning)* each must resolve to a published slug |

### The overlap check is the one that matters

It compares the rarer words in this page's prose against every other location's,
after stripping the shared vocabulary every page here legitimately uses
("delivery", "warehouse", "appliance", "pickup", and so on).

It exists to catch the specific thing that passes every other threshold: a real,
well-written page copied from a neighbouring town with the name swapped. That has
correct length, correct structure and correct grammar, and it is the single most
common form of local-SEO spam.

If you trip it, the fix is not to reword around the checker. The fix is that you
do not yet know enough about the town to publish a page about it — go back to
Step 1.

---

## What happens if a record fails

Nothing breaks and nothing is hidden from users:

- The page still renders at `/appliances/[slug]` for anyone with the link
- It is served `noindex` (`generateMetadata` calls `isIndexable`)
- It is absent from `sitemap.xml`
- It is absent from `/service-areas`, the homepage chips and the footer
- It is absent from `llms.txt` and from the `areaServed` list in the
  LocalBusiness schema
- `/api/cron/seo-health` reports it daily with the specific field that failed

So a half-finished record is safe to commit. It simply does not enter the index
until it is finished.

---

## Removing a service area

If the business stops delivering somewhere:

1. Delete the record from `SERVICE_LOCATIONS`.
2. Remove its slug from every other record's `nearbyAreas` (the audit will warn
   if you forget, and the test suite will fail on the warning).
3. The URL will 404. That is correct — a page claiming delivery to a town that is
   no longer served is worse than a 404. If the page had meaningful traffic,
   consider a redirect to `/service-areas` in `next.config.ts` instead.

---

## Proposed expansion, not yet published

Candidates from the Monroe County / Pocono corridor, in rough order of how
plausible the delivery route is given the existing five. **None of these are
published, and none should be until Step 1 is completed for each one
individually.**

| Town | ZIP(s) | County | Why it is plausible | What has to be confirmed first |
| --- | --- | --- | --- | --- |
| Tannersville | 18372 | Monroe | On the Route 611 corridor already served through Bartonsville and Mount Pocono | Delivery confirmed; access notes; what the housing there needs |
| Marshalls Creek | 18335 | Monroe | Short run north-east on Route 209 from the warehouse | Delivery confirmed; whether the 209 run is regular or occasional |
| Delaware Water Gap | 18327 | Monroe | Minutes from Stroudsburg on the existing route | Delivery confirmed; borough access constraints |
| Saylorsburg | 18353 | Monroe | South on Route 33/209 from the warehouse | Delivery confirmed; drive time; local housing context |
| Effort / Brodheadsville | 18330, 18322 | Monroe | Route 209/West End corridor | Delivery confirmed; whether this is a route we run or a one-off |
| Swiftwater | 18370 | Monroe | On the 611 corridor between Bartonsville and Mount Pocono | Delivery confirmed; overlaps existing routes |
| Tobyhanna | 18466 | Monroe | Same I-380 corridor as Pocono Summit | Delivery confirmed; gated-community access; winter constraints |
| Long Pond | 18334 | Monroe | Near the Pocono Summit route | Delivery confirmed; whether it is genuinely on a route we run |

**Everything in the "Why it is plausible" column is geography, not a delivery
commitment.** A town being on a road we drive is not evidence we deliver there.

New Jersey and New York towns are not listed at all. The business advertises
coverage in both states, but no specific NJ or NY town has confirmed routing,
distances or local context — and a state-level claim on `/service-areas` is not a
basis for a town-level page.

### Recommended order of work

Do one town at a time and let it settle before starting the next. Five
well-researched pages that rank beat twenty that dilute each other, and the
overlap check gets harder to pass — correctly — as the set grows, because there
is less genuinely distinct left to say about towns fifteen minutes apart.

Take Tannersville first: it sits on a corridor already covered by two published
pages, so the delivery question is likely to be a quick yes, and the housing and
access context is likely to differ enough from Bartonsville and Mount Pocono to
clear the overlap check.
