import { savingsFor, type Appliance } from "./types";

/**
 * Merchandising labels derived from inventory data.
 *
 * Every label here maps to a column that is actually on record. Nothing is
 * inferred from vibes, and a unit with sparse data simply carries fewer labels
 * rather than being padded out with filler.
 *
 * Deliberately absent: a "price drop" label. The schema stores one current price
 * and one verified comparison price — there is no price history to prove a drop
 * ever happened, so claiming one would be an invention. Add a price-history
 * table first if that label is ever wanted.
 */

export type DealBadgeTone = "deal" | "fresh" | "scarce" | "pick";

export interface DealBadge {
  label: string;
  tone: DealBadgeTone;
  /** Long form for assistive tech, where the shorthand would be cryptic. */
  title: string;
}

/** A unit counts as newly arrived for this long after it is created. */
const NEW_ARRIVAL_DAYS = 14;

/** Share off the verified retail price that earns the "great deal" label. */
const GREAT_DEAL_RATIO = 0.3;

/** Savings as a share of the comparison price, or null when there is no verified one. */
export function savingsRatio(appliance: Appliance): number | null {
  const savings = savingsFor(appliance);
  if (savings == null || appliance.compareAtPrice == null) return null;
  if (appliance.compareAtPrice <= 0) return null;
  return savings / appliance.compareAtPrice;
}

export function isNewArrival(appliance: Appliance, now = Date.now()): boolean {
  const created = Date.parse(appliance.createdAt);
  if (!Number.isFinite(created)) return false;
  const ageDays = (now - created) / 86_400_000;
  return ageDays >= 0 && ageDays <= NEW_ARRIVAL_DAYS;
}

/**
 * Ordered strongest-first so a caller showing only one or two badges shows the
 * most useful ones. Sold and reserved units get no promotional labels — a
 * discount on something a shopper cannot buy is just noise.
 */
export function dealBadges(appliance: Appliance, now = Date.now()): DealBadge[] {
  if (appliance.status !== "available") return [];

  const badges: DealBadge[] = [];
  const ratio = savingsRatio(appliance);

  if (ratio != null && ratio >= GREAT_DEAL_RATIO) {
    badges.push({
      label: "Great Deal",
      tone: "deal",
      title: `${Math.round(ratio * 100)}% below the verified retail price`,
    });
  }

  if (appliance.quantity === 1) {
    badges.push({
      label: "Only 1 Left",
      tone: "scarce",
      title: "One unit of this appliance is left in the warehouse",
    });
  }

  if (isNewArrival(appliance, now)) {
    badges.push({
      label: "New Arrival",
      tone: "fresh",
      title: `Added to the warehouse floor within the last ${NEW_ARRIVAL_DAYS} days`,
    });
  }

  if (appliance.featured) {
    badges.push({
      label: "Staff Pick",
      tone: "pick",
      title: "Flagged by the warehouse team as a standout unit",
    });
  }

  return badges;
}
