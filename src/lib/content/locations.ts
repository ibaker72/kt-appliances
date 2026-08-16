import { siteConfig } from "@/lib/site-config";

/**
 * Service-area pages.
 *
 * Deliberately a short list. These are places genuinely served from the East
 * Stroudsburg warehouse, and each page carries content specific to that town —
 * how far it is, what the drive is like, what people there tend to be buying.
 * Nothing here is a city-name swap on a shared template, and the list is not
 * expanded into NJ/NY towns until delivery coverage there is confirmed.
 *
 * To add a location: only add one you actually serve, and write real local
 * detail. A thin page is worse than no page.
 */

export interface ServiceLocation {
  slug: string;
  /** Town name only. */
  name: string;
  state: "PA" | "NJ" | "NY";
  county: string;
  /** Approximate driving distance from the warehouse. */
  distance: string;
  /** Short line for the hub page listing. */
  summary: string;
  /** Page intro — must be specific to this town. */
  intro: string;
  /** How delivery and pickup work for this town specifically. */
  logistics: string[];
  /** Genuinely local context, not keyword filler. */
  localNotes: string[];
  /** ZIPs covered, used in copy and the local FAQ. */
  zips: string[];
}

export const SERVICE_LOCATIONS: ServiceLocation[] = [
  {
    slug: "east-stroudsburg-pa",
    name: "East Stroudsburg",
    state: "PA",
    county: "Monroe County",
    distance: "The warehouse is here",
    summary: "Our home base — walk in any day, or same-day pickup on anything in stock.",
    intro:
      "The warehouse is in East Stroudsburg, at 109 Burson St. If you live in town, this is as local as appliance shopping gets: you can look at the actual unit, see exactly where the dent is, and take it home the same day rather than waiting on a delivery window from a big-box store.",
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
    zips: ["18301", "18302"],
  },
  {
    slug: "stroudsburg-pa",
    name: "Stroudsburg",
    state: "PA",
    county: "Monroe County",
    distance: "About 5 minutes from the warehouse",
    summary: "Next door to the warehouse — quick delivery and easy same-day pickup.",
    intro:
      "Stroudsburg sits directly across from East Stroudsburg, which makes it one of the easiest places we deliver. If you are replacing an appliance that has already failed, the short distance means we can usually work you into the schedule quickly rather than booking you a week out.",
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
    zips: ["18360"],
  },
  {
    slug: "bartonsville-pa",
    name: "Bartonsville",
    state: "PA",
    county: "Monroe County",
    distance: "Roughly 10 minutes up Route 611",
    summary: "A short run up Route 611 — easy delivery and a simple drive for pickup.",
    intro:
      "Bartonsville is a straight shot up Route 611 from the warehouse, which keeps delivery cost down and makes pickup practical if you have a truck or trailer. It is close enough that we can usually confirm delivery timing the same day you call.",
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
    zips: ["18321"],
  },
  {
    slug: "mount-pocono-pa",
    name: "Mount Pocono",
    state: "PA",
    county: "Monroe County",
    distance: "About 20 minutes via Route 611",
    summary: "Regular deliveries up the mountain — worth a call to confirm the schedule.",
    intro:
      "Mount Pocono is a regular delivery destination for us. The run is longer than the valley towns, so delivery is quoted accordingly, but it is a route we know well and can usually schedule without much lead time.",
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
    zips: ["18344"],
  },
  {
    slug: "pocono-summit-pa",
    name: "Pocono Summit",
    state: "PA",
    county: "Monroe County",
    distance: "About 25 minutes via Route 611 and I-380",
    summary: "Delivered on the same route as Mount Pocono — call to confirm timing.",
    intro:
      "Pocono Summit sits just past Mount Pocono near the I-380 interchange, and we deliver there on the same route. Because it is one of our longer runs, it is worth calling ahead so we can slot you into a day we are already heading that direction.",
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
    zips: ["18346"],
  },
];

export function getLocation(slug: string): ServiceLocation | null {
  return SERVICE_LOCATIONS.find((location) => location.slug === slug) ?? null;
}

/** Location-specific answers, layered on top of the shared FAQ bank. */
export function locationFaqs(location: ServiceLocation) {
  return [
    {
      question: `Does KT Appliances deliver to ${location.name}, ${location.state}?`,
      answer: `Yes. KT Appliances delivers to ${location.name}, ${location.state} (${location.zips.join(", ")}) from our warehouse at ${siteConfig.address.oneLine}. ${location.distance}. Delivery is quoted based on distance, the appliance and whether you need installation or haul-away — call or text ${siteConfig.phone.display} with your ZIP code for a price.`,
    },
    {
      question: `Can I pick up an appliance instead of having it delivered to ${location.name}?`,
      answer: `Yes. Warehouse pickup is available at ${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state}, open daily ${siteConfig.hours.regular.label} and after hours by appointment. From ${location.name} the drive is ${location.distance.toLowerCase()}. Call or text ahead so the unit is pulled and ready.`,
    },
    {
      question: `What appliances can I buy for a home in ${location.name}?`,
      answer: `The full warehouse inventory is available to ${location.name} customers: refrigerators, washers, dryers, matched laundry sets, ranges and ovens, dishwashers, microwaves and freezers. Every unit is tested before listing, the cosmetic damage is described on the listing, and 1-year warranty options are available on qualifying appliances.`,
    },
  ];
}
