import { siteConfig } from "@/lib/site-config";
import type { ApplianceCategory } from "@/lib/inventory/types";

/**
 * Service-area pages.
 *
 * Deliberately a short list. These are places genuinely served from the East
 * Stroudsburg warehouse, and each page carries content specific to that town —
 * how far it is, what the drive is like, what people there tend to be buying.
 * Nothing here is a city-name swap on a shared template, and the list is not
 * expanded into NJ/NY towns until delivery coverage there is confirmed.
 *
 * ADDING A LOCATION IS NOT A CONTENT TASK, IT IS A BUSINESS TASK.
 * `docs/local-seo-locations.md` lists what has to be confirmed with the
 * warehouse before a town can be published, and `src/lib/seo/location-quality.ts`
 * enforces the parts of it a machine can check. A record that fails validation is
 * excluded from the sitemap and rendered `noindex` — it does not quietly become
 * an indexable thin page.
 */

/** Distance band, used for delivery language and for ordering the hub page. */
export type LocationTier = "warehouse" | "close" | "regional";

export interface LocationSeo {
  /** Overrides the generated `<title>`. Keep under ~60 characters. */
  title?: string;
  /** Overrides the generated meta description. Keep under ~160 characters. */
  description?: string;
  /** The one query this page is genuinely the best answer for. */
  primaryKeyword?: string;
  /** Supporting queries the copy legitimately covers. */
  secondaryKeywords?: string[];
}

export interface ServiceLocation {
  slug: string;
  /** Town name only. */
  name: string;
  state: "PA" | "NJ" | "NY";
  county: string;
  tier: LocationTier;
  /** Approximate driving distance from the warehouse, written as prose. */
  distance: string;
  /** Approximate drive time in minutes, for sorting and for the facts table. */
  driveMinutes: number;
  /** ZIPs covered, used in copy, the facts table and the local FAQ. */
  zips: string[];
  /** Short line for the hub page listing. */
  summary: string;
  /** Page intro — must be specific to this town. */
  intro: string;
  /**
   * The direct answer to "do you deliver to X?", rendered at the top of the page
   * and quoted verbatim into the location FAQ. Two sentences at most: an answer
   * engine that lifts only this should still be correct and complete.
   */
  quickAnswer: string;
  /** How delivery and pickup work for this town specifically. */
  logistics: string[];
  /** Genuinely local context, not keyword filler. */
  localNotes: string[];
  /** Roads and interchanges the crew actually uses. Not a landmark name-drop. */
  landmarks?: string[];
  /** What the housing stock means for an appliance that has to get inside. */
  housingContext?: string[];
  /** Constraints worth knowing before a delivery day is booked. */
  deliveryNotes?: string[];
  /** Categories this town asks for most, driving the on-page category links. */
  categoryDemand?: ApplianceCategory[];
  /** Neighbouring published service areas, for lateral internal linking. */
  nearbyAreas?: string[];
  seo?: LocationSeo;
  /** ISO date the copy on this page was last reviewed against the business. */
  updatedAt: string;
}

export const SERVICE_LOCATIONS: ServiceLocation[] = [
  {
    slug: "east-stroudsburg-pa",
    name: "East Stroudsburg",
    state: "PA",
    county: "Monroe County",
    tier: "warehouse",
    distance: "The warehouse is here",
    driveMinutes: 0,
    zips: ["18301", "18302"],
    summary: "Our home base — walk in any day, or same-day pickup on anything in stock.",
    intro:
      "The warehouse is in East Stroudsburg, at 109 Burson St. If you live in town, this is as local as appliance shopping gets: you can look at the actual unit, see exactly where the dent is, and take it home the same day rather than waiting on a delivery window from a big-box store.",
    quickAnswer:
      "Yes. KT Appliances is in East Stroudsburg — the warehouse at 109 Burson St serves ZIP codes 18301 and 18302 directly, so you can walk in, inspect the unit and take it home the same day. Delivery inside town is the shortest run we make and is quoted per appliance.",
    logistics: [
      "Warehouse pickup is available any day during regular hours, and after 5 PM by appointment.",
      "Delivery within East Stroudsburg is the shortest run we make, so same-day is most often possible here.",
      "Call or text before you come and we will have the unit pulled and ready when you arrive.",
      "Bring straps and blankets if you are picking up — a full-size refrigerator does not fit in most SUVs.",
    ],
    localNotes: [
      "A lot of what moves through here goes into rental turnovers and student housing near East Stroudsburg University, where a working name-brand unit at a warehouse price beats a new budget model.",
      "Older housing stock in town means hookup types vary — check whether your laundry is gas or electric and whether the dryer outlet is 3-prong or 4-prong before you buy.",
      "If you are between apartments and need something immediately, pickup on an in-stock unit is usually faster than any delivery schedule.",
    ],
    landmarks: [
      "The warehouse sits off Burson St, a few minutes from the Route 209 / Route 447 corridor through the borough.",
      "I-80 runs along the south side of town, which is the road most of our longer deliveries start on.",
    ],
    housingContext: [
      "Borough streets include a lot of pre-war homes with narrow interior doorways — measure the tightest point on the path, not just the kitchen opening.",
      "Multi-unit conversions near the university often put laundry in a shared basement, so stair width and the turn at the bottom decide what will physically fit.",
    ],
    deliveryNotes: [
      "Same-day may be available depending on route and inventory — it is never promised until we have looked at the day.",
      "On-street parking on the older blocks can mean a longer carry from the truck; tell us when you book so the crew plans for it.",
    ],
    categoryDemand: ["refrigerators", "washer-dryer-sets", "ranges"],
    nearbyAreas: ["stroudsburg-pa", "bartonsville-pa"],
    seo: {
      title: "Appliances in East Stroudsburg, PA",
      primaryKeyword: "appliances east stroudsburg pa",
      secondaryKeywords: [
        "scratch and dent appliances east stroudsburg",
        "appliance warehouse east stroudsburg pa",
        "used refrigerators east stroudsburg",
      ],
    },
    updatedAt: "2026-08-18",
  },
  {
    slug: "stroudsburg-pa",
    name: "Stroudsburg",
    state: "PA",
    county: "Monroe County",
    tier: "close",
    distance: "About 5 minutes from the warehouse",
    driveMinutes: 5,
    zips: ["18360"],
    summary: "Next door to the warehouse — quick delivery and easy same-day pickup.",
    intro:
      "Stroudsburg sits directly across from East Stroudsburg, which makes it one of the easiest places we deliver. If you are replacing an appliance that has already failed, the short distance means we can usually work you into the schedule quickly rather than booking you a week out.",
    quickAnswer:
      "Yes. KT Appliances delivers to Stroudsburg, PA (18360) from the East Stroudsburg warehouse about five minutes away. Delivery is quoted by appliance and by whether you need installation or haul-away, and same-day may be available depending on the route and what is in stock.",
    logistics: [
      "One of the shortest delivery runs we make, so same-day delivery is often possible for an additional charge.",
      "Pickup is a few minutes' drive to 109 Burson St in East Stroudsburg.",
      "Installation and old-appliance haul-away can be scheduled with the same delivery.",
      "Text us your ZIP and the appliance and we will confirm cost and timing.",
    ],
    localNotes: [
      "Borough housing includes a lot of older homes and converted units, so measure doorways and stairwells before committing to a full-size refrigerator or a laundry pair.",
      "Narrow driveways and street parking downtown can affect how a delivery runs — tell us the access situation when you book so the crew arrives prepared.",
      "Compact and apartment-size units move quickly here; if you need a specific size, text us and we will tell you when one comes in.",
    ],
    landmarks: [
      "Stroudsburg is the Monroe County seat, and the Main Street blocks are the tightest access we deal with regularly.",
      "US 209 and PA 611 both run through town, which is how most deliveries reach the residential streets off Main.",
    ],
    housingContext: [
      "A good share of the older homes downtown have basement laundry reached by a straight, narrow flight — front-load pairs are heavy and unforgiving on that kind of stair.",
      "Second-floor apartments above Main Street storefronts often have a single stairwell with a turn; a 30-inch range usually goes, a French door refrigerator often does not without removing doors.",
    ],
    deliveryNotes: [
      "Downtown blocks have limited loading space, so a delivery window there can be narrower than in the townships.",
      "If your street is permit-parking or the driveway is single-width, say so when you book.",
    ],
    categoryDemand: ["refrigerators", "washers", "dryers"],
    nearbyAreas: ["east-stroudsburg-pa", "bartonsville-pa"],
    seo: {
      title: "Appliances Delivered to Stroudsburg, PA",
      primaryKeyword: "appliances stroudsburg pa",
      secondaryKeywords: [
        "scratch and dent appliances stroudsburg",
        "appliance delivery stroudsburg pa",
        "washers and dryers stroudsburg pa",
      ],
    },
    updatedAt: "2026-08-18",
  },
  {
    slug: "bartonsville-pa",
    name: "Bartonsville",
    state: "PA",
    county: "Monroe County",
    tier: "close",
    distance: "Roughly 10 minutes up Route 611",
    driveMinutes: 10,
    zips: ["18321"],
    summary: "A short run up Route 611 — easy delivery and a simple drive for pickup.",
    intro:
      "Bartonsville is a straight shot up Route 611 from the warehouse, which keeps delivery cost down and makes pickup practical if you have a truck or trailer. It is close enough that we can usually confirm delivery timing the same day you call.",
    quickAnswer:
      "Yes. KT Appliances delivers to Bartonsville, PA (18321), about ten minutes up Route 611 from the East Stroudsburg warehouse. It is a short run, so delivery sits at the lower end of our pricing and same-day is often workable depending on the day.",
    logistics: [
      "Short delivery run — cost is at the lower end of our range.",
      "Straightforward pickup: Route 611 down to East Stroudsburg, about ten minutes.",
      "Same-day delivery may be available depending on the day and the route.",
      "Haul-away of your old appliance can be arranged on the same trip.",
    ],
    localNotes: [
      "Homes in this stretch often have laundry in a basement or garage, so confirm the stair width and the turn at the bottom before buying a front-load pair.",
      "Garage-rated freezers and second refrigerators are a common ask around here — stock in that category turns over fast, so call to check what is in.",
      "If your range is propane rather than natural gas, tell us, because it affects which units will work for you.",
    ],
    landmarks: [
      "Bartonsville sits in Hamilton Township along PA 611, with the I-80 interchange giving the crew a fast way in and out.",
      "Most of the residential streets here run off 611 rather than through a town centre, so truck access is generally easier than downtown Stroudsburg.",
    ],
    housingContext: [
      "Detached homes with attached garages are common, and a garage laundry means checking that the space is rated for the temperatures it actually sees in January.",
      "Split-level homes in this area frequently put the kitchen up half a flight, which is the measurement people forget until the refrigerator is on the porch.",
    ],
    deliveryNotes: [
      "Longer driveways are normal here — if yours is gravel or steep, tell us so the crew brings the right equipment.",
      "Propane is common outside the boroughs; confirm your fuel type before buying a gas range or dryer.",
    ],
    categoryDemand: ["refrigerators", "washer-dryer-sets", "other"],
    nearbyAreas: ["stroudsburg-pa", "east-stroudsburg-pa", "mount-pocono-pa"],
    seo: {
      title: "Appliances Delivered to Bartonsville, PA",
      primaryKeyword: "appliances bartonsville pa",
      secondaryKeywords: [
        "appliance delivery bartonsville pa",
        "scratch and dent appliances bartonsville",
        "freezers bartonsville pa",
      ],
    },
    updatedAt: "2026-08-18",
  },
  {
    slug: "mount-pocono-pa",
    name: "Mount Pocono",
    state: "PA",
    county: "Monroe County",
    tier: "regional",
    distance: "About 20 minutes via Route 611",
    driveMinutes: 20,
    zips: ["18344"],
    summary: "Regular deliveries up the mountain — worth a call to confirm the schedule.",
    intro:
      "Mount Pocono is a regular delivery destination for us. The run is longer than the valley towns, so delivery is quoted accordingly, but it is a route we know well and can usually schedule without much lead time.",
    quickAnswer:
      "Yes. KT Appliances delivers to Mount Pocono, PA (18344), roughly twenty minutes up Route 611 from the East Stroudsburg warehouse. Because it is a longer run than the valley towns, delivery is quoted by ZIP code and appliance — call or text with both for an exact price.",
    logistics: [
      "Delivery is quoted based on the distance up Route 611 — call or text with your ZIP for the actual number.",
      "Same-day may be possible depending on the day; call early if you need it fast.",
      "Pickup at the warehouse is about a twenty-minute drive if you would rather handle transport yourself.",
      "Installation and haul-away are available on this route.",
    ],
    localNotes: [
      "Rental and vacation properties around Mount Pocono turn over appliances often, and a tested scratch & dent unit is a sensible fit for a property you are not living in.",
      "Winter access matters up here — if your driveway is steep or unplowed, tell us when you schedule so the crew plans for it.",
      "Cabin and smaller-home kitchens frequently need apartment-size or 24-inch units rather than standard 30-inch. Ask and we will tell you what we have in that size.",
    ],
    landmarks: [
      "Mount Pocono sits at the junction of PA 611 and PA 940, well above the Stroudsburg valley — the climb is the reason this run is priced differently.",
      "I-380 is the alternate approach when 611 is slow, and it is how we reach the communities north of the borough.",
    ],
    housingContext: [
      "A lot of the housing here is second homes and short-term rentals, where the buying decision is about a working unit at a sensible price rather than a matching kitchen suite.",
      "Cabins and older mountain homes commonly have 24-inch or apartment-size openings; a standard 30-inch range simply will not go in.",
    ],
    deliveryNotes: [
      "Weather is a genuine scheduling factor between roughly November and March — a steep unplowed drive can move a delivery to the next clear day.",
      "If the property is unoccupied, arrange access with us before the delivery day rather than on it.",
    ],
    categoryDemand: ["refrigerators", "ranges", "washer-dryer-sets"],
    nearbyAreas: ["pocono-summit-pa", "bartonsville-pa"],
    seo: {
      title: "Appliances Delivered to Mount Pocono, PA",
      primaryKeyword: "appliances mount pocono pa",
      secondaryKeywords: [
        "appliance delivery mount pocono pa",
        "scratch and dent appliances mount pocono",
        "used refrigerators mount pocono",
      ],
    },
    updatedAt: "2026-08-18",
  },
  {
    slug: "pocono-summit-pa",
    name: "Pocono Summit",
    state: "PA",
    county: "Monroe County",
    tier: "regional",
    distance: "About 25 minutes via Route 611 and I-380",
    driveMinutes: 25,
    zips: ["18346"],
    summary: "Delivered on the same route as Mount Pocono — call to confirm timing.",
    intro:
      "Pocono Summit sits just past Mount Pocono near the I-380 interchange, and we deliver there on the same route. Because it is one of our longer runs, it is worth calling ahead so we can slot you into a day we are already heading that direction.",
    quickAnswer:
      "Yes. KT Appliances delivers to Pocono Summit, PA (18346), about twenty-five minutes from the East Stroudsburg warehouse via Route 611 and I-380. It is one of our longer runs, so it is quoted accordingly and often scheduled alongside other deliveries heading that way.",
    logistics: [
      "Quoted as a longer run — send your ZIP code for exact delivery pricing.",
      "Scheduling alongside other deliveries in the Mount Pocono area often works out better for timing.",
      "Warehouse pickup remains an option and is roughly a twenty-five minute drive.",
      "Installation, haul-away and warranty options are available the same as anywhere else we serve.",
    ],
    localNotes: [
      "Seasonal and second homes are common here, which means appliances often sit unused for stretches — worth checking water lines and hookups before a delivery day rather than during it.",
      "Well water is common in this area and is hard on ice makers and dishwashers over time; a scratch & dent unit at a warehouse price is a reasonable way to handle that reality.",
      "If nobody will be at the property on delivery day, arrange access with us in advance.",
    ],
    landmarks: [
      "Pocono Summit is in Tobyhanna Township, close enough to the I-380 interchange that the highway is the practical route in.",
      "The lake and private-community developments around here often have their own gate or access rules, which is the detail that most often delays a delivery.",
    ],
    housingContext: [
      "Private lake communities make up a lot of the housing, and many were built as seasonal cabins — expect smaller kitchen openings than a modern build.",
      "Where a home is on well water, an ice maker or a dishwasher lives a harder life; buying at a warehouse price rather than a retail one is a reasonable response to that.",
    ],
    deliveryNotes: [
      "Gated or private-road communities need the gate code or a contact name supplied when you book — a crew turned away at a gate is a wasted run for both of us.",
      "Winter conditions on the plateau affect this route the same way they affect Mount Pocono.",
    ],
    categoryDemand: ["refrigerators", "washers", "dishwashers"],
    nearbyAreas: ["mount-pocono-pa"],
    seo: {
      title: "Appliances Delivered to Pocono Summit, PA",
      primaryKeyword: "appliances pocono summit pa",
      secondaryKeywords: [
        "appliance delivery pocono summit pa",
        "scratch and dent appliances pocono summit",
        "dishwashers pocono summit pa",
      ],
    },
    updatedAt: "2026-08-18",
  },
];

export function getLocation(slug: string): ServiceLocation | null {
  return SERVICE_LOCATIONS.find((location) => location.slug === slug) ?? null;
}

/** Published service areas, nearest first. Ties keep the authored order. */
export function locationsByDistance(): ServiceLocation[] {
  return [...SERVICE_LOCATIONS].sort((a, b) => a.driveMinutes - b.driveMinutes);
}

/** Resolves a location's `nearbyAreas` slugs to records, dropping unknown ones. */
export function nearbyLocations(location: ServiceLocation): ServiceLocation[] {
  return (location.nearbyAreas ?? [])
    .map((slug) => getLocation(slug))
    .filter((entry): entry is ServiceLocation => entry !== null && entry.slug !== location.slug);
}

/** Every ZIP the site claims coverage for, deduplicated and sorted. */
export function servedZips(): string[] {
  return [...new Set(SERVICE_LOCATIONS.flatMap((location) => location.zips))].sort();
}

/** Location-specific answers, layered on top of the shared FAQ bank. */
export function locationFaqs(location: ServiceLocation) {
  const pickup =
    location.tier === "warehouse"
      ? `The warehouse is in ${location.name} itself, at ${siteConfig.address.street}.`
      : `From ${location.name} the drive is ${location.distance.toLowerCase()}.`;

  return [
    {
      question: `Does KT Appliances deliver to ${location.name}, ${location.state}?`,
      answer: `${location.quickAnswer} Call or text ${siteConfig.phone.display} with your ZIP code (${location.zips.join(", ")}) and the appliance you want for a delivery price.`,
    },
    {
      question: `Can I pick up an appliance instead of having it delivered to ${location.name}?`,
      answer: `Yes. Warehouse pickup is available at ${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state}, open daily ${siteConfig.hours.regular.label} and after hours by appointment. ${pickup} Call or text ahead so the unit is pulled and ready, and bring straps and blankets.`,
    },
    {
      question: `What appliances can I buy for a home in ${location.name}?`,
      answer: `The full warehouse inventory is available to ${location.name} customers: refrigerators, washers, dryers, matched laundry sets, ranges and ovens, dishwashers, microwaves and freezers. Every unit is tested before listing, the cosmetic damage is described on the listing, and 1-year warranty options are available on qualifying appliances.`,
    },
    {
      question: `How fast can I get an appliance delivered to ${location.name}?`,
      answer:
        location.tier === "regional"
          ? `${location.name} is one of our longer runs (${location.distance.toLowerCase()}), so delivery is normally scheduled rather than same-day. Call early in the day and we will tell you the next run heading that direction. Warehouse pickup is always faster if you can transport the unit yourself.`
          : `${location.name} is a short run from the warehouse, so same-day delivery may be available depending on the route and what is in stock — it is never guaranteed until we have looked at the day. Pickup on an in-stock unit is usually the fastest option of all.`,
    },
    {
      question: `Will you take away my old appliance in ${location.name}?`,
      answer: `Yes. Haul-away of the old unit can be booked on the same trip as the delivery, and installation can be added at the same time. Tell us when you schedule so the crew arrives with the right equipment — it is not something we can add on the doorstep.`,
    },
  ];
}
