import { siteConfig } from "@/lib/site-config";
import type { FaqEntry } from "@/lib/seo/jsonld";

/**
 * Answer bank for AI search, assistants and featured snippets.
 *
 * Written as direct, self-contained answers — an assistant quoting any single
 * entry should produce something accurate without the surrounding page. Every
 * claim here matches what the business has actually stated; nothing is inflated
 * into a guarantee ("warranty available", not "every unit is covered").
 */

const phone = siteConfig.phone.display;
const address = `${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state}`;

export const CORE_FAQS: FaqEntry[] = [
  {
    question: "What does KT Appliances sell?",
    answer: `KT Appliances is a scratch & dent appliance warehouse in ${siteConfig.address.city}, ${siteConfig.address.state}. We sell name-brand refrigerators, washers, dryers, washer and dryer sets, ranges and ovens, dishwashers, microwaves and freezers. Most units are new or lightly handled appliances with cosmetic damage — dents, scratches or scuffs — which is why they cost less than the same model at a traditional retailer.`,
  },
  {
    question: "What does scratch and dent mean?",
    answer:
      "A scratch & dent appliance is a unit with cosmetic damage but no functional defect. The damage usually happens in shipping, in a warehouse, or on a showroom floor — a dented side panel, a scratched door, or scuffed trim. The appliance still works as designed. Because retailers cannot sell a marked unit at full price, it is sold at a discount.",
  },
  {
    question: "Are KT Appliances' appliances tested?",
    answer:
      "Yes. Appliances are tested for function at the warehouse before they are listed for sale. Washers are run through a wash cycle, dryers are checked for heat and tumble, refrigerators are checked for cooling, and dishwashers are checked for fill and drain. Each listing describes both the cosmetic condition and what was tested.",
  },
  {
    question: "Is a warranty available on KT Appliances appliances?",
    answer:
      "1-year warranty options are available on qualifying appliances. Coverage is not automatic on every unit and terms vary by appliance, so ask about warranty options for the specific unit you are buying before you complete the purchase.",
  },
  {
    question: "Does KT Appliances deliver?",
    answer: `Yes. Local delivery is available from our ${siteConfig.address.city} warehouse, and same-day delivery may be available for an additional charge. Delivery pricing depends on distance, the appliance, and what services you need. Call or text ${phone} with your ZIP code for a delivery quote.`,
  },
  {
    question: "Does KT Appliances install appliances?",
    // Leads with "Yes" because the question is a yes/no one. The previous
    // opening ("Professional installation options are available…") answered it
    // eventually, which is a different thing from answering it.
    answer:
      "Yes. Installation options are available on most appliances, including laundry hookups and dishwasher installs. Installation is quoted separately from delivery because requirements vary — for example, a gas range or gas dryer needs an existing gas hookup. Ask about installation when you arrange delivery.",
  },
  {
    question: "Does KT Appliances haul away old appliances?",
    answer:
      "Yes. Appliance haul-away is available, so your old unit can be removed when the new one is delivered. Let us know when you schedule delivery so the crew arrives prepared for it.",
  },
  {
    question: "Where is KT Appliances located?",
    answer: `KT Appliances is located at ${address} ${siteConfig.address.postalCode}. Warehouse pickup is available during regular hours, and the phone number is ${phone}.`,
  },
  {
    question: "What are KT Appliances' hours?",
    answer: `The warehouse is open ${siteConfig.hours.regular.label}, ${siteConfig.hours.regular.days}. After-hours visits are available ${siteConfig.hours.afterHours.label} by appointment only.`,
  },
  {
    question: "Are after-hours appointments available at KT Appliances?",
    answer: `Yes. After-hours appointments are available from ${siteConfig.hours.afterHours.label}, ${siteConfig.hours.afterHours.days}. Appointments are required after 5 PM — call or text ${phone} to arrange a time before you drive out.`,
  },
  {
    question: "Does KT Appliances offer financing?",
    answer: `Financing is available, including buy now, pay later options. Terms and approval depend on the provider and your application, so we do not quote rates or terms on the website. Call or text ${phone} to ask what financing options apply to the appliance you want.`,
  },
  {
    question: "What states does KT Appliances serve?",
    answer: `KT Appliances serves ${siteConfig.serviceStates.slice(0, -1).join(", ")} and ${siteConfig.serviceStates.at(-1)}. The warehouse is in ${siteConfig.address.city}, ${siteConfig.address.state}, and delivery availability and cost depend on the distance from the warehouse.`,
  },
];

/** Compact set used on the homepage; the full set lives on /about and /contact. */
export const HOME_FAQS: FaqEntry[] = [
  CORE_FAQS[1], // what does scratch & dent mean
  CORE_FAQS[2], // are appliances tested
  CORE_FAQS[3], // warranty
  CORE_FAQS[4], // delivery
  CORE_FAQS[8], // hours
  CORE_FAQS[10], // financing
];

/**
 * The canonical answer to the highest-intent question on the site.
 *
 * Rendered as the direct-answer block at the top of `/delivery-installation` AND
 * as the FAQ entry lower down AND into that page's FAQ structured data. One
 * string, so the visible answer and the machine-readable one can never disagree
 * — which is both a correctness requirement for FAQ schema and the reason a
 * reader does not get two subtly different prices.
 */
export const DELIVERY_COST_ANSWER = `Delivery is quoted per order rather than charged at a flat rate. The price depends on how far your address is from the ${siteConfig.address.city} warehouse, which appliance it is, the access at your end (stairs, tight turns, an upper floor), and whether you are adding installation or haul-away. Text or call ${phone} with your ZIP code and the appliance and you will get a real number. Warehouse pickup is free.`;

export const DELIVERY_FAQS: FaqEntry[] = [
  CORE_FAQS[4],
  CORE_FAQS[5],
  CORE_FAQS[6],
  { question: "How much does appliance delivery cost?", answer: DELIVERY_COST_ANSWER },
  {
    question: "Can I pick up an appliance myself?",
    answer: `Yes. Warehouse pickup is available at ${address} during regular hours, ${siteConfig.hours.regular.label} daily. Bring straps and moving blankets, and make sure your vehicle fits the appliance — measure before you come out.`,
  },
];

export const FINANCING_FAQS: FaqEntry[] = [
  CORE_FAQS[10],
  {
    question: "What do I need to apply for financing?",
    answer:
      "Requirements depend on the financing provider. Rather than list requirements that may not apply to your situation, we walk through the options with you directly — call or text us with the appliance you are interested in and we will explain what is available.",
  },
  {
    question: "Can I finance a scratch and dent appliance?",
    answer:
      "Financing options are available on appliances we sell, including scratch & dent units. Availability can depend on the purchase amount and the provider, so ask before you finalize the appliance you want.",
  },
];

export const WARRANTY_FAQS: FaqEntry[] = [
  CORE_FAQS[3],
  CORE_FAQS[2],
  {
    question: "Does a scratch and dent appliance still have a manufacturer warranty?",
    answer:
      "It depends on the unit. Some appliances arrive with manufacturer coverage intact and some do not, and coverage on an open-box or scratch & dent unit is not guaranteed. Ask us about the specific appliance — we will tell you what applies to that unit rather than make a blanket claim.",
  },
  {
    question: "What is not covered by a warranty?",
    answer:
      "Cosmetic damage disclosed at the time of sale is not a defect — the dents and scratches described in a listing are the reason the appliance is discounted and are not covered. Coverage terms for functional issues vary by appliance and by the warranty option selected.",
  },
];

/**
 * Category FAQs.
 *
 * Previously every category page rendered the same five shared answers, which
 * meant seven pages published seven byte-identical `FAQPage` graphs — the
 * duplicate structured data that gets a site's rich results ignored, and
 * seven pages that answered nothing specific to what the shopper was looking at.
 *
 * These are the questions people actually ask about each appliance, and each set
 * appears on exactly one page. Two shared answers are appended at render time
 * (condition and warranty) because those are genuinely the same regardless of
 * category and the shopper needs them here too.
 */
export const CATEGORY_FAQS: Record<string, FaqEntry[]> = {
  refrigerators: [
    {
      question: "Does KT Appliances sell used refrigerators?",
      // "Used" is how people search, but it is not quite what is sold here, and
      // the answer has to lead with the answer while still being accurate — so
      // it starts with a qualified yes rather than either a flat "Yes" (which
      // would be misleading) or the clarification alone (which reads as a dodge).
      answer: `Yes, with one clarification: these are scratch & dent, open-box and refurbished refrigerators rather than general secondhand units bought from households. Each one is checked for cooling and, where fitted, ice and water function before it is listed, and the listing states where the cosmetic damage is. Prices and current stock are on the refrigerators page; call or text ${phone} to ask what came in this week.`,
    },
    {
      question: "What size refrigerator will fit my kitchen?",
      answer:
        "Measure the opening width, height and depth, then measure every doorway and hallway the unit has to pass through — that second measurement is the one people skip. A standard 36-inch French door refrigerator will not clear a 32-inch door without removing its doors. Leave about an inch of clearance at the sides and top for airflow.",
    },
    {
      question: "Do your refrigerators come with a water line for the ice maker?",
      answer:
        "No — the water line is part of your kitchen, not the appliance. The refrigerator has the connection for it, but if your kitchen has no line run to that spot, one has to be added before a dispenser or ice maker will work. Ask us about the specific unit and we will tell you what it needs.",
    },
    {
      question: "Where is the damage on a scratch and dent refrigerator?",
      answer:
        "It varies by unit and is written on every listing. Damage on a side panel usually disappears once the refrigerator is between cabinets; damage on a door is visible every day, and that difference is normally reflected in the price. Text us and we will send photos of the actual unit before you drive out.",
    },
  ],
  washers: [
    {
      question: "Are your used washers tested before they are sold?",
      answer:
        "Yes. Every washer is run through a test cycle at the warehouse before it is listed, so it is confirmed to fill, agitate, spin and drain. What was checked is written on the listing alongside the cosmetic condition.",
    },
    {
      question: "Should I buy a front load or top load washer?",
      answer:
        "Whichever fits your space — that is genuinely the deciding factor. Front load units can be stacked with a matching dryer and generally use less water; top load units cannot be stacked and are usually easier to load without bending. If your laundry space is a closet or a tight basement corner, the stacking question decides it for you.",
    },
    {
      question: "What hookups does a washer need?",
      answer:
        "Hot and cold water supply, a drain standpipe and a standard outlet. Measure the space including several inches behind the machine for hoses — the published depth of a washer is not the depth it needs once it is plumbed in.",
    },
    {
      question: "Can you install the washer when you deliver it?",
      answer: `Yes, installation is available and quoted separately from delivery. Ask for it when you book the delivery rather than on the day — the crew needs to arrive with the right fittings. Call or text ${phone} to arrange it.`,
    },
  ],
  dryers: [
    {
      question: "Do I need a gas or electric dryer?",
      answer:
        "Whichever your laundry hookup already is — they are not interchangeable. An electric dryer needs a 240V outlet; a gas dryer needs a gas line plus a standard outlet. Converting from one to the other is an electrical or plumbing job, not an appliance swap. The fuel type is listed on every dryer we sell.",
    },
    {
      question: "What is the difference between a 3-prong and 4-prong dryer outlet?",
      answer:
        "It is the age of the wiring. Homes wired before the mid-1990s typically have a 3-prong 240V outlet; newer ones have a 4-prong with a separate ground. The dryer does not care which — you just need the cord that matches your outlet. Cords are inexpensive and swappable, but you need the right one before delivery day.",
    },
    {
      question: "Will a dryer fit in my closet?",
      answer:
        "Only if you measure the depth with the door open, not just closed, and check the vent path. Most dryers vent out the back, and a tight closet install often needs a periscope vent to avoid crushing the duct against the wall. Text us the closet dimensions and the unit you are looking at and we will check it against the specification.",
    },
    {
      question: "Do you take away my old dryer?",
      answer:
        "Yes. Haul-away of the old unit can be booked on the same trip as the delivery. Tell us when you schedule so the crew arrives prepared for it.",
    },
  ],
  "washer-dryer-sets": [
    {
      question: "Is it cheaper to buy a washer and dryer as a set?",
      answer:
        "Usually, yes — buying the matched pair together is normally the cheapest way to replace a whole laundry room, and both units are tested before the set is listed. Current set pricing is on the listings; nothing here carries an invented comparison price.",
    },
    {
      question: "Can I stack the washer and dryer?",
      answer:
        "Only front load pairs stack, and only with the manufacturer's stacking kit for those specific models, which is sold separately. Top load washers cannot be stacked at all. Ask us before you buy if stacking is the plan.",
    },
    {
      question: "What do I need to check before buying a laundry set?",
      answer:
        "Both hookups: hot and cold water plus a drain for the washer, and either a 240V outlet or a gas line for the dryer. Then measure the total footprint side by side and add a few inches behind for hoses and venting. Finally, measure the path in — stairs and turns stop more laundry sets than kitchens do.",
    },
    {
      question: "Do the washer and dryer in a set have to match?",
      answer:
        "No. A washer and a dryer are independent machines and neither needs the other to work. Sets are sold together because they match visually, stack where applicable, and are priced better as a pair. If you only need one, we sell them individually too.",
    },
  ],
  ranges: [
    {
      question: "Do you sell gas and electric ranges?",
      answer:
        "Yes — freestanding and slide-in ranges, wall ovens and cooktops in gas, electric and induction. Fuel type is listed on every unit. Gas needs a gas line, electric needs a 240V outlet, and dual fuel needs both; converting between them is not a small job.",
    },
    {
      question: "What size range do I need?",
      answer:
        "Standard freestanding ranges are 30 inches wide, which is what most kitchens are built for. Slide-in models sit flush with the counter and usually need a specific cutout. Cabins and older homes frequently have 24-inch openings, so measure before assuming standard.",
    },
    {
      question: "Will my cookware work on an induction range?",
      answer:
        "Only if it is magnetic. Hold a fridge magnet to the base of a pan — if it sticks firmly, it will work on induction. Aluminium and most copper and glass cookware will not.",
    },
    {
      question: "Can you install a gas range?",
      answer: `Yes, where there is already a gas hookup to connect to. Installation is available on most appliances and is quoted separately from delivery, but we connect a range to an existing gas line rather than run a new one — if your kitchen has no gas supply, that is a separate job for a plumber first. Ask about the specific unit and your setup when you call ${phone}.`,
    },
  ],
  dishwashers: [
    {
      question: "Will a new dishwasher fit my existing opening?",
      answer:
        "Nearly all built-in dishwashers are built for a standard 24-inch opening, so the width is rarely the problem. The height is — some older counter runs sit lower than standard. Measure the height of your opening before you buy.",
    },
    {
      question: "Are your dishwashers tested?",
      answer:
        "Yes. Dishwashers are run through a fill and drain test before they are listed, and the listing describes both what was checked and where the cosmetic damage is.",
    },
    {
      question: "Do you install dishwashers and remove the old one?",
      answer:
        "Yes. Installation is available if you need the old dishwasher pulled out and the new one plumbed and wired in, and haul-away of the old unit can be added to the same visit. Both are quoted separately from delivery.",
    },
    {
      question: "What is the difference between a built-in and a portable dishwasher?",
      answer:
        "A built-in sits permanently in a cabinet opening and is plumbed in. A portable rolls up to the sink, connects to the faucet and needs no cabinet space at all — useful in a rental or a kitchen with no spare opening. Which one a listing is is stated on the listing.",
    },
  ],
  other: [
    {
      question: "What else does KT Appliances sell besides the main categories?",
      answer:
        "Over-the-range microwaves, chest and upright freezers, wine coolers and whatever else comes through the warehouse. This category turns over faster than any other, so what is on the page is what is genuinely here today.",
    },
    {
      question: "Can I put a freezer in my garage?",
      answer:
        "Only if the unit is rated for it. A freezer that is not garage-rated can stop running properly when the surrounding air gets cold, which is exactly when you need it least. Check the listing or ask us about the specific unit before buying one for an unheated space.",
    },
    {
      question: "What does an over-the-range microwave need to install?",
      answer:
        "A 30-inch cabinet opening above the range, the mounting hardware, and — for a vented install rather than recirculating — a duct path to the outside. Measure the cabinet opening before buying.",
    },
    {
      question: "Can you tell me when a specific appliance comes in?",
      answer: `Yes. Text ${phone} with the appliance, brand or size you are after and we will let you know when something matching comes through the warehouse. Stock in this category in particular moves before it reaches the website.`,
    },
  ],
};

/** The two answers every category shopper still needs, appended to each set. */
export const CATEGORY_SHARED_FAQS: FaqEntry[] = [
  CORE_FAQS[1], // what does scratch & dent mean
  CORE_FAQS[3], // warranty options
];
