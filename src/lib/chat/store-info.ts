import { SERVICE_LOCATIONS } from "@/lib/content/locations";
import { DELIVERY_COST_ANSWER } from "@/lib/content/faq";
import { siteConfig } from "@/lib/site-config";
import { BUSINESS_TIME_ZONE, minutesFromClock } from "@/lib/appointments/time";

/**
 * The store facts the assistant is allowed to state.
 *
 * Every value is read from `siteConfig` and the published content modules, never
 * restated here. That is the whole point: the phone number, the hours and the
 * address in a chat reply are the same strings the footer, the LocalBusiness
 * schema and the SMS templates use, so there is no second copy to drift.
 *
 * Pure module. The panel renders the same facts for its offline states.
 */

export interface StoreStatus {
  /** True during walk-in hours. */
  open: boolean;
  /** True during the appointment-only evening window. */
  afterHours: boolean;
  /** One short sentence, safe to show a customer. */
  label: string;
}

/** Minutes past midnight, right now, in the warehouse's own timezone. */
function minutesNowInZone(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  // `hour12: false` renders midnight as 24 in some ICU versions.
  return (hour % 24) * 60 + minute;
}

/**
 * Whether the warehouse is open right now.
 *
 * Used for a truthful status line in the panel header. It says whether the
 * *shop* is open — never whether a person is available to chat, because nobody
 * is: this is an automated assistant and claiming otherwise is the one thing a
 * status indicator must not do.
 */
export function storeStatus(now: Date = new Date()): StoreStatus {
  const minutes = minutesNowInZone(now);
  const open = minutesFromClock(siteConfig.hours.regular.open) ?? 0;
  const close = minutesFromClock(siteConfig.hours.regular.close) ?? 0;
  const afterClose = minutesFromClock(siteConfig.hours.afterHours.close) ?? 0;

  if (minutes >= open && minutes < close) {
    return { open: true, afterHours: false, label: `Open today until ${to12Hour(close)}` };
  }
  if (minutes >= close && minutes < afterClose) {
    return {
      open: false,
      afterHours: true,
      label: `Evening visits until ${to12Hour(afterClose)} by appointment`,
    };
  }
  return {
    open: false,
    afterHours: false,
    label: `Closed now · opens ${to12Hour(open)} daily`,
  };
}

function to12Hour(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${hour12} ${period}` : `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

/** Everything the assistant may say about the business, in one object. */
export function getStoreInfo() {
  return {
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    phone: siteConfig.phone.display,
    email: siteConfig.email,
    address: `${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state} ${siteConfig.address.postalCode}`,
    hours: {
      walkIn: `${siteConfig.hours.regular.days}, ${siteConfig.hours.regular.label}`,
      afterHours: `${siteConfig.hours.afterHours.label} — ${siteConfig.hours.afterHours.note}`,
      timeZone: BUSINESS_TIME_ZONE,
    },
    /**
     * The towns with a published, verified service-area page. Not "everywhere
     * we might drive" — the assistant must not invent coverage, and it must
     * never imply a storefront anywhere but East Stroudsburg.
     */
    serviceAreas: SERVICE_LOCATIONS.map((location) => `${location.name}, ${location.state}`),
    serviceStates: [...siteConfig.serviceStates],
    /** One warehouse. Stated explicitly so a location page cannot imply more. */
    locations: 1,
  };
}

/**
 * The delivery answer, verbatim from the published FAQ.
 *
 * There is no delivery pricing engine in this application, so there is no price
 * to quote. Re-using the page copy means the assistant and the delivery page
 * cannot say different things, and neither of them invents a number.
 */
export const DELIVERY_ANSWER = DELIVERY_COST_ANSWER;

/**
 * The financing answer.
 *
 * No provider, APR, term, monthly payment, credit score or approval odds is
 * stated anywhere in this application, and the financing page says why. The
 * assistant repeats that position rather than filling the gap.
 */
export const FINANCING_ANSWER =
  "Financing options are available on appliances here, including buy now, pay later. What you qualify for depends on the provider and your application, so we go through it with you directly rather than publishing terms that might not apply to you.";

/** Prefilled SMS bodies. Short, because some clients truncate. */
export const TEXT_TEMPLATES = {
  general: `Hi ${siteConfig.name}, I'm interested in an appliance I saw on your website.`,
  appliance: (label: string) =>
    `Hi ${siteConfig.name}, I'm interested in the ${label} listed on your website.`,
  availability: (label: string) =>
    `Hi ${siteConfig.name}, is the ${label} still available?`,
  delivery: `Hi ${siteConfig.name}, I have a question about delivery.`,
  financing: `Hi ${siteConfig.name}, I'd like to ask about financing options.`,
} as const;
