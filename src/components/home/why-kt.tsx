import Link from "next/link";
import {
  ClipboardCheck,
  CreditCard,
  MapPin,
  ShieldCheck,
  Tag,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { siteConfig } from "@/lib/site-config";

/**
 * Reasons to buy here, stated concretely.
 *
 * Each point is something the business actually does and that a shopper can
 * check — a street address, a service that is offered, a step in the intake
 * process. Nothing here is a rating, a review count, a customer total or an
 * award, because none of those exist to cite.
 */
interface Reason {
  icon: LucideIcon;
  title: string;
  copy: string;
  href?: string;
  linkLabel?: string;
}

/**
 * Brand copy is generated from the brands actually in stock rather than a
 * hardcoded list, so the page never name-drops a brand the warehouse has none of.
 */
function brandCopy(brands: string[]): string {
  if (brands.length === 0) {
    return "Name-brand appliances at scratch & dent prices. The cosmetic mark comes off the price, not the performance.";
  }
  const named = brands.slice(0, 6).join(", ");
  const tail = brands.length > 6 ? ", and more" : "";
  return `${named}${tail} — currently on the floor. The cosmetic mark comes off the price, not the performance.`;
}

function reasonsFor(brands: string[]): Reason[] {
  return [
  {
    icon: MapPin,
    title: "A local warehouse, not a catalogue",
    copy: `Everything listed is physically at ${siteConfig.address.street} in ${siteConfig.address.city}. You can walk in during open hours and look at the exact unit before you buy it.`,
    href: "/contact",
    linkLabel: "Hours and directions",
  },
  {
    icon: Tag,
    title: "Name brands at scratch & dent prices",
    copy: brandCopy(brands),
    href: "/guides/what-does-scratch-and-dent-mean",
    linkLabel: "How scratch & dent works",
  },
  {
    icon: ClipboardCheck,
    title: "Tested before it goes on the floor",
    copy: "Units are checked for function at the warehouse, and what was tested is written on the listing along with exactly where the damage is.",
  },
  {
    icon: ShieldCheck,
    title: "Warranty options on qualifying units",
    copy: "Coverage is available on qualifying appliances. Every listing states whether that unit qualifies rather than making a blanket promise.",
    href: "/warranty",
    linkLabel: "Warranty details",
  },
  {
    icon: Truck,
    title: "Delivery across the Poconos and beyond",
    copy: `Delivery is available from the warehouse, priced by distance and appliance. We serve ${siteConfig.serviceStates.join(", ")}.`,
    href: "/service-areas",
    linkLabel: "Service areas",
  },
  {
    icon: Wrench,
    title: "Installation and haul-away",
    copy: "We can install the new appliance and take the old one away, so a replacement does not leave you with a machine in the driveway.",
    href: "/delivery-installation",
    linkLabel: "Delivery & installation",
  },
  {
    icon: CreditCard,
    title: "Financing available",
    copy: "Buy now, pay later options are available if you would rather spread the cost of a replacement.",
    href: "/financing",
    linkLabel: "Financing options",
  },
  {
    icon: Users,
    title: "You talk to the warehouse directly",
    copy: `Call or text ${siteConfig.phone.display} and you reach the people who have the appliance in front of them — not a call centre. Texting is usually fastest.`,
  },
  ];
}

export function WhyKt({ brands = [] }: { brands?: string[] }) {
  return (
    <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
      {reasonsFor(brands).map(({ icon: Icon, title, copy, href, linkLabel }) => (
        <li key={title} className="flex flex-col bg-white p-6">
          <Icon aria-hidden className="size-6 shrink-0 text-brand-500" strokeWidth={1.9} />
          <h3 className="mt-4 font-display text-[16.5px] font-bold leading-tight tracking-[-0.015em] text-ink-950">
            {title}
          </h3>
          <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-600">{copy}</p>
          {href && linkLabel ? (
            <Link
              href={href}
              className="mt-4 inline-flex min-h-[34px] items-center text-[13.5px] font-semibold text-ink-800 underline underline-offset-4 hover:text-brand-500"
            >
              {linkLabel}
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
