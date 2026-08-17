import type { ApplianceCategory } from "@/lib/inventory/types";
import type { FaqEntry } from "@/lib/seo/jsonld";

/**
 * Buying guides.
 *
 * Six articles, not fifty. Each one answers a question a real customer asks at
 * the warehouse, and each is written to be useful on its own — the kind of page
 * that earns a link and gets quoted by an assistant, rather than filler built
 * around a keyword. Adding a seventh should mean somebody had a seventh question
 * worth answering properly.
 */

export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  listTitle?: string;
  list?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  /** Card blurb on the guides index. */
  excerpt: string;
  readMinutes: number;
  /** ISO date, surfaced as the article's published/updated date. */
  updated: string;
  category?: ApplianceCategory;
  intro: string;
  sections: GuideSection[];
  faqs?: FaqEntry[];
}

export const GUIDES: Guide[] = [
  {
    slug: "what-does-scratch-and-dent-mean",
    title: "What does scratch & dent actually mean?",
    metaTitle: "What Does Scratch & Dent Mean on an Appliance?",
    description:
      "A scratch & dent appliance has cosmetic damage but no functional defect. Here is where the damage comes from, what it does and does not affect, and what to check before buying one.",
    excerpt:
      "Where the damage comes from, what it affects, and the questions that separate a good scratch & dent buy from a bad one.",
    readMinutes: 5,
    updated: "2026-01-15",
    intro:
      "\"Scratch & dent\" is one of those retail phrases that sounds like it might be hiding something. It is not. It describes an appliance with cosmetic damage and no functional defect — and understanding exactly where that damage comes from is the difference between a confident purchase and a nervous one.",
    sections: [
      {
        heading: "Where the damage comes from",
        paragraphs: [
          "Appliances get marked long before anyone cooks with them. A refrigerator is loaded and unloaded several times between the factory and a showroom floor, and each handling is a chance for a corner to catch a forklift, a door to scuff against a wall, or a panel to dent against another crate.",
          "The rest happens in stores. A unit gets used as a floor model, a customer's return is opened and cannot be resold as new, a delivery is refused at the door because the buyer noticed a scratch. All of it produces the same result: an appliance that works exactly as designed but cannot be sold at full price next to an unmarked one.",
        ],
      },
      {
        heading: "What the damage does and does not affect",
        paragraphs: [
          "The distinction that matters is between the cabinet and the mechanicals. A dent in a side panel is sheet metal. It does not touch the compressor, the motor, the control board, the seals or the wiring. A scratch in a door finish is the finish.",
          "Damage that would affect function is a different category and should not be sold as scratch & dent at all — a bent door frame that breaks the seal, a cracked interior liner, a damaged control panel. That is why the location of the damage matters more than the fact of it.",
        ],
        listTitle: "Damage worth understanding before you buy",
        list: [
          "Side panels: usually invisible once installed between cabinets or against a wall. The best value in scratch & dent.",
          "Doors and front faces: visible every day. Fine if you do not mind, but it should be discounted more than side damage.",
          "Corners and edges: cosmetic, though worth checking that the door still closes squarely and the seal sits flat.",
          "Interior liner cracks: a real problem in a refrigerator or freezer. Ask specifically.",
          "Control panels and glass: check that everything lights, responds and reads correctly.",
        ],
      },
      {
        heading: "What happens to a unit before it reaches the floor",
        paragraphs: [
          "A marked appliance arriving at the warehouse is not put straight out for sale. It is checked for function first — a washer is run through a cycle, a dryer is checked for heat and tumble, a refrigerator is checked for cooling and for its ice and water function, a dishwasher is checked for fill and drain. What was tested goes on the listing.",
          "Then the damage is written down: not just that there is some, but where it is, because that is what decides whether you will look at it every day or never see it again once the unit is installed. The mark comes off the price, not off the performance — which is the whole reason the appliance is cheaper than the identical unmarked one.",
        ],
        listTitle: "What a listing should tell you",
        list: [
          "Where the cosmetic damage is, specifically enough that you can picture it in your kitchen.",
          "Which functions were tested, rather than a blanket claim that the unit works.",
          "Whether a warranty option is available on that particular unit.",
          "The price, and a comparison price only where a verified retail price for the same model is on record.",
        ],
      },
      {
        heading: "Scratch & dent is not the same as used or refurbished",
        paragraphs: [
          "A used appliance has been installed and run in someone's home, sometimes for years. A refurbished appliance has been repaired — something failed and was fixed. A scratch & dent unit generally has neither history: it is a new or barely handled appliance that got marked in transit or on a floor.",
          "The categories overlap in practice, which is exactly why the listing should tell you which one you are looking at. Ours says the condition on every unit, along with what was tested.",
        ],
      },
      {
        heading: "What to ask before you buy one",
        listTitle: "Five questions that tell you what you are actually getting",
        list: [
          "Where exactly is the damage, and can I see a photo of the actual unit?",
          "What was tested, and what were the results?",
          "Is this new, open box, used or refurbished?",
          "Is a warranty option available on this specific unit, and what does it cover?",
          "What is the return position if something is wrong on arrival?",
        ],
        paragraphs: [
          "A seller who answers all five clearly is a seller you can buy from. A seller who is vague about where the damage is has told you something important.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is a scratch and dent appliance new?",
        answer:
          "Usually it is either new or nearly new — a unit that was damaged cosmetically in shipping, used as a floor model, or returned unopened. It is different from a used appliance that ran in someone's home, and different from a refurbished one that was repaired after a failure. The listing should tell you which it is.",
      },
      {
        question: "Does scratch and dent damage get worse over time?",
        answer:
          "Cosmetic damage to a painted or stainless panel does not spread. A dent stays the same dent. The exception is damage that breaks a protective coating in a wet environment, which can rust over years — worth checking on a washer base or a dishwasher tub edge.",
      },
    ],
  },
  {
    slug: "are-scratch-and-dent-appliances-worth-it",
    title: "Are scratch & dent appliances worth it?",
    metaTitle: "Are Scratch & Dent Appliances Worth It?",
    description:
      "When a scratch & dent appliance is the smart buy and when it is not — a straight comparison against new retail, budget new models, and used appliances.",
    excerpt:
      "An honest comparison against new retail, cheap new models and used units — including the cases where scratch & dent is the wrong call.",
    readMinutes: 6,
    updated: "2026-01-20",
    intro:
      "The short answer is usually yes, and the useful answer is: it depends on what you are comparing it to. A scratch & dent appliance competes with three other options, and it wins against two of them most of the time.",
    sections: [
      {
        heading: "Against the same model at full retail",
        paragraphs: [
          "This is the comparison scratch & dent wins easily. Identical model, identical mechanicals, identical capacity — the only difference is a mark on the cabinet. If that mark ends up facing a wall, you have paid several hundred dollars less for the exact appliance you wanted.",
          "The saving is real only if the comparison price is real. Be sceptical of a seller who shows a struck-through price on every unit; a genuine comparison price is one you can go verify on a retailer's site for the same model number. Where we do not have a verified comparison price, we do not show one.",
        ],
      },
      {
        heading: "Against a cheaper new appliance",
        paragraphs: [
          "This is the comparison most people should actually be making, and it is the strongest argument for scratch & dent. For the price of an entry-level new refrigerator, you are often looking at a mid or upper-tier scratch & dent unit — better compressor, better capacity, better shelving, longer expected life.",
          "The trade is straightforward: a dent you can see, versus a cheaper build you cannot. Over ten years the dent is the better deal.",
        ],
      },
      {
        heading: "Against a used appliance",
        paragraphs: [
          "A used appliance from a marketplace listing has unknown run hours, no testing, no warranty option and no recourse. It might be fine. You have no way to know, and no one to call if it is not.",
          "A scratch & dent unit that has been function-tested, has its condition documented, and has a warranty option available occupies a genuinely different risk category — for a price difference that is usually smaller than people expect.",
        ],
      },
      {
        heading: "When scratch & dent is the wrong choice",
        listTitle: "Be honest with yourself about these",
        list: [
          "The appliance is going somewhere highly visible and the damage is on the front. If it will bother you every day, it will bother you every day.",
          "You need a precise built-in fit — a specific panel-ready or counter-depth unit for existing cabinetry. Scratch & dent stock is what came in, not what you specify.",
          "You need a matched suite in one finish, right now. That takes stock luck and possibly some waiting.",
          "You cannot inspect it or get photos of the actual unit before committing. Never buy cosmetic-damage stock sight unseen.",
        ],
      },
      {
        heading: "How to judge a specific unit",
        paragraphs: [
          "Look up the model number before you buy. It takes two minutes and tells you the original tier, the real retail price, the capacity and the features. Then compare that against the warehouse price and decide whether the mark is worth the difference to you.",
          "That is the entire calculation. There is nothing else hidden in it.",
        ],
      },
    ],
    faqs: [
      {
        question: "How much can you save on a scratch and dent appliance?",
        answer:
          "It varies by unit and depends on where the damage is and how severe it is — front-panel damage is discounted more than a mark on a hidden side. Rather than quote a blanket percentage, compare the listed price against the current retail price for that exact model number, which is the only comparison that means anything.",
      },
    ],
  },
  {
    slug: "how-appliance-delivery-works",
    title: "How appliance delivery works",
    metaTitle: "How Appliance Delivery Works — What to Expect",
    description:
      "What happens between buying an appliance and having it working in your home: scheduling, access, installation, haul-away, and how to prepare.",
    excerpt:
      "Scheduling, access, install, haul-away and the preparation that keeps delivery day from going sideways.",
    readMinutes: 5,
    updated: "2026-02-02",
    intro:
      "Most delivery problems are avoidable and almost all of them are measurement or access problems discovered on the day. Here is how the process actually runs and what to sort out beforehand.",
    sections: [
      {
        heading: "1. Quoting",
        paragraphs: [
          "Delivery is priced per order rather than at a flat rate, because the honest cost depends on distance, the appliance, and what has to happen at your end. A dishwasher going into a ground-floor kitchen ten minutes away and a refrigerator going up two flights of stairs forty minutes away are not the same job.",
          "Give the ZIP code, the appliance, the floor it is going to, and whether there are stairs or a tight turn. You will get a real number instead of a range.",
        ],
      },
      {
        heading: "2. Scheduling",
        paragraphs: [
          "Same-day delivery may be possible for an extra charge, depending on the day and whether a truck is already heading your direction. Calling early in the day materially improves the odds.",
          "You will get a delivery window rather than an exact minute. Somebody over eighteen needs to be there to let the crew in and sign for the unit.",
        ],
      },
      {
        heading: "3. Preparing the space",
        listTitle: "Do these before delivery day, not during",
        list: [
          "Measure the opening, then measure every doorway, hallway and stair turn the appliance has to pass through. The path is what fails, not the opening.",
          "Clear the path completely — rugs, furniture, the box in the hallway you have been meaning to move.",
          "Empty and defrost the old appliance if it is being hauled away. A freezer full of water is not going anywhere.",
          "Disconnect the old unit if you can, or arrange for the crew to do it when you book.",
          "Confirm your hookups match: 240V outlet type for an electric dryer or range, a gas line for gas, a water line for an ice maker.",
        ],
      },
      {
        heading: "4. Installation",
        paragraphs: [
          "Installation is quoted separately from delivery because requirements vary so much. A laundry hookup, a dishwasher install and a gas range connection are three different jobs with three different prerequisites.",
          "The single most common blocker is a mismatch between the appliance and the hookup — a gas dryer bought for an electric hookup, or a 4-prong cord meeting a 3-prong outlet. Cords are cheap and swappable; a fuel type is not. Check before you buy, not on the day.",
        ],
      },
      {
        heading: "5. On arrival",
        paragraphs: [
          "Inspect the appliance before the crew leaves. Compare it against the condition described on the listing — the disclosed damage should be exactly what you were told, and there should be nothing new.",
          "For refrigerators, let the unit stand upright for a few hours before plugging it in if it was transported on its side. This lets the compressor oil settle back where it belongs.",
        ],
      },
    ],
    faqs: [
      {
        question: "How should I prepare for appliance delivery?",
        answer:
          "Measure the appliance opening and every doorway, hallway and stair turn on the path to it. Clear that path. Empty and defrost the old appliance if it is being hauled away, and disconnect it if you can. Confirm that your electrical, gas and water hookups match what the new appliance needs, and make sure an adult will be home for the delivery window.",
      },
    ],
  },
  {
    slug: "measure-before-buying-a-refrigerator",
    title: "What to measure before buying a refrigerator",
    metaTitle: "What to Measure Before Buying a Refrigerator",
    description:
      "The measurements that decide whether a refrigerator fits: the opening, the clearances, the path into the house, and the door swing.",
    excerpt:
      "Four sets of measurements, in the order that matters — and the one people forget until the truck is in the driveway.",
    readMinutes: 4,
    updated: "2026-02-10",
    category: "refrigerators",
    intro:
      "A refrigerator that does not fit is the most expensive mistake in appliance buying, and it is almost always the doorway rather than the kitchen that causes it. Take four sets of measurements, in this order.",
    sections: [
      {
        heading: "1. The opening",
        listTitle: "Measure all three, at more than one point",
        list: [
          "Width: measure at the top, middle and bottom of the opening. Cabinets are not always square.",
          "Height: from the floor to the underside of the upper cabinet, at both sides.",
          "Depth: from the back wall to the front edge of the counter, noting whether you want the fridge flush with the counter (counter-depth) or standing proud (standard-depth).",
        ],
      },
      {
        heading: "2. Clearances",
        paragraphs: [
          "A refrigerator needs air. Plan roughly one inch at the top and half an inch to an inch at the sides for ventilation, and a couple of inches at the back for the coils and the water line if there is one.",
          "Subtract those clearances from your opening before you go shopping. The number you are looking for is the maximum appliance size, not the size of the hole.",
        ],
      },
      {
        heading: "3. The path in",
        paragraphs: [
          "This is the measurement people skip, and it is the one that sends trucks away full. Measure every doorway, hallway, stair turn and landing between the front door and the kitchen — width and height.",
          "A standard interior door is around 30 to 32 inches. A full-size French door refrigerator is often 35 to 36 inches wide. The doors usually have to come off to get it through, which is normal and routine, but it needs to be known in advance rather than discovered in your hallway.",
        ],
      },
      {
        heading: "4. Door swing and handle clearance",
        paragraphs: [
          "Check that the refrigerator door can open far enough to pull the crisper drawers out — typically about 90 degrees — without hitting an adjacent wall, island or cabinet run.",
          "If the fridge sits at the end of a run next to a wall, you may need a filler panel or a unit with a different hinge configuration. Handles add depth too: measure the appliance depth with the handle included, not just the cabinet.",
        ],
      },
      {
        heading: "Write it all down",
        paragraphs: [
          "Take the numbers with you, or text them to us before you drive out. We will check them against the unit you are interested in and tell you whether it fits — which is a much better conversation to have before you buy it than after.",
        ],
      },
    ],
    faqs: [
      {
        question: "How much clearance does a refrigerator need?",
        answer:
          "As a general rule, allow about one inch above, half an inch to an inch on each side, and a couple of inches behind for ventilation, coils and any water line. Check the specific model's requirements as well, since they vary. Subtract those clearances from your opening to find the largest appliance that will actually fit.",
      },
      {
        question: "Will a refrigerator fit through a 30-inch door?",
        answer:
          "Many full-size refrigerators are 35 to 36 inches wide and will not pass through a 30-inch doorway with the doors on. Removing the refrigerator doors typically reduces the width enough to get through, and it is a routine part of delivery — but measure the path first so it is planned rather than improvised.",
      },
    ],
  },
  {
    slug: "washer-and-dryer-buying-guide",
    title: "Washer and dryer buying guide",
    metaTitle: "Washer & Dryer Buying Guide — Front Load vs Top Load",
    description:
      "Front load versus top load, capacity, stacking, hookups and the checks worth making before buying a washer or dryer.",
    excerpt:
      "Front load or top load, what capacity actually means, and the hookup checks that decide which units you can even consider.",
    readMinutes: 6,
    updated: "2026-02-18",
    category: "washers",
    intro:
      "Laundry is the most constrained appliance purchase most people make, because the space is usually small, the hookups are fixed, and the units are heavy. Start with what your house allows, then pick within that.",
    sections: [
      {
        heading: "Start with the hookups",
        paragraphs: [
          "Before anything else, establish two things: whether your dryer hookup is gas or electric, and if electric, whether the outlet is 3-prong or 4-prong.",
          "Gas and electric dryers are not interchangeable — a gas dryer needs a gas line, and converting a hookup is an expensive job. The cord type is a much smaller issue: cords are inexpensive and swap in minutes, but you need the right one.",
          "For the washer, confirm you have hot and cold supply valves and a drain standpipe, and that there is room behind the machine for the hoses without kinking them.",
        ],
      },
      {
        heading: "Front load versus top load",
        listTitle: "The practical differences",
        list: [
          "Front load: uses less water, extracts more water on the spin (so dryer time drops), and can be stacked with a matching dryer. Requires room for the door to swing out.",
          "Top load: loads without bending, and generally a shorter cycle. Cannot be stacked. Needs vertical clearance for the lid to open, which matters under a shelf or cabinet.",
          "Front load doors need to be left ajar between loads to prevent odour in the gasket. If that will annoy you, top load may suit you better.",
          "Top load with no centre agitator fits bulkier items than the older agitator design.",
        ],
      },
      {
        heading: "Capacity, in plain terms",
        paragraphs: [
          "Capacity is quoted in cubic feet. Around 4.5 cu. ft. handles a typical family load comfortably, including a comforter. Below about 3.5 cu. ft. you are in compact or apartment territory, which is fine for one or two people and frustrating for four.",
          "Pair sensibly: a dryer should have noticeably more capacity than the washer it serves, because wet clothes need room to tumble. A 4.5 cu. ft. washer pairs well with a 7 cu. ft. or larger dryer.",
        ],
      },
      {
        heading: "Measuring the space",
        listTitle: "Measure with the door open",
        list: [
          "Width of the alcove or closet, at the narrowest point.",
          "Depth including the door fully open — the number that matters for a closet with bifold doors.",
          "Height, particularly if you plan to stack or if there is a shelf above.",
          "Add a few inches behind for hoses and the dryer vent, which a periscope vent can reduce in a tight install.",
          "The path in: stairs, landings and basement turns. Laundry pairs are heavy and awkward to angle.",
        ],
      },
      {
        heading: "Buying the set together",
        paragraphs: [
          "A matched pair is usually the cheapest way to replace a full laundry room, and the units look right together. If you intend to stack a front load pair, you need the manufacturer's stacking kit for those specific models — it is sold separately and it is not universal.",
          "One practical note on scratch & dent laundry: side-panel damage is nearly always invisible once the units are installed side by side in an alcove. It is one of the best value cases in the category.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can any washer and dryer be stacked?",
        answer:
          "No. Only front load washers and dryers can be stacked, and they need the manufacturer's stacking kit made for those specific models. Top load washers cannot be stacked at all. Check that a stacking kit exists for the pair before you buy if stacking is the plan.",
      },
      {
        question: "What size washer do I need?",
        answer:
          "Around 4.5 cubic feet suits a typical family and will handle a comforter. Compact units below about 3.5 cubic feet work for one or two people. Pair a washer with a dryer of noticeably larger capacity so wet clothes have room to tumble.",
      },
    ],
  },
  {
    slug: "gas-vs-electric-range",
    title: "Gas vs electric range: which should you buy?",
    metaTitle: "Gas vs Electric Range — How to Choose",
    description:
      "Gas, electric, induction and dual fuel ranges compared on cooking performance, running cost, installation requirements and what your kitchen can actually take.",
    excerpt:
      "What your kitchen allows comes first, then how you cook. A comparison across gas, electric, induction and dual fuel.",
    readMinutes: 6,
    updated: "2026-02-24",
    category: "ranges",
    intro:
      "This choice is usually made for you by what is already in the wall. Start there, because converting a kitchen from one fuel to the other is an electrician or plumber job, not an appliance decision.",
    sections: [
      {
        heading: "What your kitchen allows",
        listTitle: "Check before you shop",
        list: [
          "A gas range needs a gas line at the range location plus a standard outlet for the igniter and clock.",
          "An electric range needs a dedicated 240V circuit and outlet — not the standard 120V that everything else in the kitchen uses.",
          "A dual fuel range (gas cooktop, electric oven) needs both.",
          "Propane is not the same as natural gas. Many ranges can be converted with a kit, but it has to be done deliberately.",
        ],
        paragraphs: [
          "If you only have one of the two, the practical choice is to buy for what you have. Running a new gas line or a new 240V circuit is a real project with a real cost attached.",
        ],
      },
      {
        heading: "Gas",
        paragraphs: [
          "Gas gives immediate visual feedback and instant heat changes, which is why a lot of people who cook a lot prefer it. It works with any cookware, including warped pans, and it keeps working in a power cut for the cooktop burners.",
          "The downsides: gas ovens tend to heat less evenly than electric, gas adds moisture and combustion products to the kitchen air (use the vent), and burner grates and caps take more cleaning than a flat surface.",
        ],
      },
      {
        heading: "Electric (smooth top)",
        paragraphs: [
          "Electric ovens generally bake more evenly, which matters if you bake seriously. The flat ceramic cooktop wipes clean in seconds, which is the single biggest day-to-day advantage.",
          "The trade-off is responsiveness: the element takes time to heat and stays hot after you turn it down, so a pan that is about to boil over does not stop just because you did. Smooth tops also want flat-bottomed cookware and scratch if you drag cast iron across them.",
        ],
      },
      {
        heading: "Induction",
        paragraphs: [
          "Induction is electric, but it heats the pan directly through a magnetic field rather than heating a surface. It is faster than gas, responds as immediately as gas, and the cooktop itself stays comparatively cool — which makes it the easiest of the three to clean and the safest around children.",
          "The catch is cookware: it only works with magnetic pans. Test a pan with a fridge magnet — if the magnet grips firmly, it works. Aluminium and most copper and some stainless will not.",
        ],
      },
      {
        heading: "Dual fuel",
        paragraphs: [
          "A gas cooktop with an electric oven gets you the responsiveness of gas where you are watching the pan and the even heat of electric where you are not. It is the enthusiast's answer, and it needs both hookups, which is why it is less common.",
        ],
      },
      {
        heading: "Sizing and fit",
        paragraphs: [
          "Most freestanding ranges are 30 inches wide. Slide-in models sit flush with the counter for a built-in look and usually require a specific counter cutout, so measure carefully if you are replacing a freestanding unit with a slide-in.",
          "Check that the oven door can open fully without hitting an island, and check the depth against your counter. And as always, measure the path into the kitchen, not just the gap it is going into.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I replace a gas range with an electric one?",
        answer:
          "Only if a 240V circuit and outlet are available at the range location. A standard kitchen outlet is 120V and will not run an electric range. Adding a 240V circuit is an electrician's job, so it is usually cheaper to replace like for like unless you are already rewiring.",
      },
      {
        question: "Does induction need special pans?",
        answer:
          "Yes — induction only works with magnetic cookware. Hold a fridge magnet to the bottom of a pan: if it grips firmly, the pan will work on induction. Cast iron and most stainless steel work; aluminium and copper generally do not unless they have a magnetic base layer.",
      },
    ],
  },
];

export function getGuide(slug: string): Guide | null {
  return GUIDES.find((guide) => guide.slug === slug) ?? null;
}
