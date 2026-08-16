import { CreditCard, ShieldCheck, Truck, Wrench, ClipboardCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Container } from "@/components/ui/container";

/**
 * Trust signals directly under the hero.
 *
 * Every item is a verifiable service the business actually offers — no badges,
 * certifications, ratings or customer counts. The qualifier "available" is kept
 * where the business describes it that way.
 */
const SIGNALS: Array<{ icon: LucideIcon; title: string; detail: string }> = [
  {
    icon: ClipboardCheck,
    title: "Fully Tested Units",
    detail: "Checked for function before it goes on the floor",
  },
  {
    icon: ShieldCheck,
    title: "1-Year Warranty Available",
    detail: "Coverage options on qualifying appliances",
  },
  { icon: Truck, title: "Delivery Available", detail: "Same-day possible for an extra charge" },
  { icon: Wrench, title: "Installation & Haul-Away", detail: "We can install and take the old one" },
  { icon: CreditCard, title: "Financing Available", detail: "Buy now, pay later options" },
];

export function TrustStrip() {
  return (
    <section aria-label="What we offer" className="border-b border-line bg-white">
      <Container className="px-0 sm:px-6 lg:px-10">
        <ul className="grid grid-cols-2 divide-x divide-y divide-line border-b border-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0 lg:border-b-0">
          {SIGNALS.map(({ icon: Icon, title, detail }) => (
            <li key={title} className="flex gap-3 px-4 py-5 sm:px-5">
              <Icon aria-hidden className="mt-0.5 size-[22px] shrink-0 text-brand-500" strokeWidth={2} />
              <div>
                <p className="font-display text-[13.5px] font-bold leading-tight tracking-[-0.01em] text-ink-950">
                  {title}
                </p>
                <p className="mt-1 text-[12.5px] leading-snug text-ink-500">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
