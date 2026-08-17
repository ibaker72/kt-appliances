import Link from "next/link";
import { CreditCard, PackageOpen, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Container } from "@/components/ui/container";

/**
 * The four services that decide whether someone buys, in one row.
 *
 * This replaces two separate full-height sections — a five-item trust strip and
 * a four-card services block — that between them said the same things twice and
 * cost about 900px of scroll. Everything here is a service the business actually
 * offers; there are no badges, certifications, ratings or customer counts,
 * because none exist to cite.
 */
const SERVICES: Array<{ icon: LucideIcon; title: string; detail: string; href: string }> = [
  {
    icon: Truck,
    title: "Delivery",
    detail: "Across the Poconos and beyond",
    href: "/delivery-installation",
  },
  {
    icon: PackageOpen,
    title: "Installation & haul-away",
    detail: "We fit the new one, take the old",
    href: "/delivery-installation#installation",
  },
  {
    icon: CreditCard,
    title: "Financing",
    detail: "Buy now, pay later options",
    href: "/financing",
  },
  {
    icon: ShieldCheck,
    title: "Warranty",
    detail: "1-year options on qualifying units",
    href: "/warranty",
  },
];

export function ServicesStrip() {
  return (
    <section aria-label="Services" className="border-y border-line bg-bone-50">
      <Container>
        <ul className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
          {SERVICES.map(({ icon: Icon, title, detail, href }) => (
            <li key={title} className="bg-bone-50">
              <Link
                href={href}
                className="flex h-full items-center gap-3 px-3 py-5 transition-colors hover:bg-white"
              >
                <Icon aria-hidden className="size-6 shrink-0 text-brand-500" strokeWidth={1.9} />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold leading-tight text-ink-950">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-ui leading-snug text-ink-600">{detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="border-t border-line py-3 text-ui text-ink-600">
          Every unit is tested for function before it goes on the floor, and the listing says what
          was checked and where the damage is.{" "}
          <Link
            href="/guides/what-does-scratch-and-dent-mean"
            className="font-semibold text-ink-900 underline underline-offset-4 hover:text-brand-500"
          >
            How scratch &amp; dent works
          </Link>
          <span aria-hidden className="mx-2 text-ink-300">
            ·
          </span>
          <Link
            href="/about"
            className="font-semibold text-ink-900 underline underline-offset-4 hover:text-brand-500"
          >
            Why shop KT Appliances
          </Link>
        </p>
      </Container>
    </section>
  );
}
