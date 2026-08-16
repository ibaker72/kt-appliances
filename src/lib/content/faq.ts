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
    answer:
      "Professional installation options are available on most appliances, including laundry hookups and dishwasher installs. Installation is quoted separately from delivery because requirements vary — for example, a gas range or gas dryer needs an existing gas hookup. Ask about installation when you arrange delivery.",
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

export const DELIVERY_FAQS: FaqEntry[] = [
  CORE_FAQS[4],
  CORE_FAQS[5],
  CORE_FAQS[6],
  {
    question: "How much does appliance delivery cost?",
    answer: `Delivery is quoted per order rather than at a flat rate, because the cost depends on distance from the ${siteConfig.address.city} warehouse, the appliance, whether stairs are involved, and whether you need installation or haul-away. Send us your ZIP code and the appliance you want and we will quote it.`,
  },
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
