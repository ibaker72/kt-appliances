import Link from "next/link";
import { ArrowRight, CreditCard, ShieldCheck, Truck, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * The four services that decide whether someone buys: getting it home, getting
 * it installed, paying for it, and what happens if it breaks. Each links to the
 * page that answers it properly.
 */
const SERVICES: Array<{
  icon: LucideIcon;
  title: string;
  copy: string;
  href: string;
  cta: string;
}> = [
  {
    icon: Truck,
    title: "Delivery",
    copy: "Local delivery across the Poconos and beyond. Same-day delivery may be available for an extra charge, quoted by distance and appliance.",
    href: "/delivery-installation",
    cta: "Delivery details",
  },
  {
    icon: Wrench,
    title: "Installation & Haul-Away",
    copy: "Professional installation options on most appliances, and we can haul the old unit away when the new one arrives.",
    href: "/delivery-installation#installation",
    cta: "Installation options",
  },
  {
    icon: CreditCard,
    title: "Financing",
    copy: "Buy now, pay later options are available. Terms depend on the provider and your application — ask us what applies.",
    href: "/financing",
    cta: "Ask about financing",
  },
  {
    icon: ShieldCheck,
    title: "Warranty",
    copy: "1-year warranty options on qualifying appliances. Coverage varies by unit, so we tell you exactly what applies before you buy.",
    href: "/warranty",
    cta: "Warranty options",
  },
];

export function ServiceCards() {
  return (
    <div className="grid gap-px bg-white/12 sm:grid-cols-2 lg:grid-cols-4">
      {SERVICES.map(({ icon: Icon, title, copy, href, cta }) => (
        <div key={title} className="flex flex-col bg-ink-950 p-6 lg:p-7">
          <Icon aria-hidden className="size-7 text-brand-500" strokeWidth={1.9} />
          <h3 className="mt-5 font-display text-xl font-bold tracking-[-0.02em] text-white">{title}</h3>
          <p className="mt-2.5 flex-1 text-[14.5px] leading-relaxed text-white/65">{copy}</p>
          <Link
            href={href}
            className="mt-5 inline-flex items-center gap-1.5 font-display text-[12px] font-bold uppercase tracking-[0.07em] text-white transition-colors hover:text-brand-400"
          >
            {cta}
            <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      ))}
    </div>
  );
}
