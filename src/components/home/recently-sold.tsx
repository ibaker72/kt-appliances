import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SoldProductCard } from "@/components/inventory/product-card";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import type { Appliance } from "@/lib/inventory/types";

/**
 * Recently sold units.
 *
 * This is the most honest social proof available at launch: real records of
 * appliances that actually moved, pulled from inventory rather than written by
 * a marketer. Renders nothing at all when there is no sales history yet.
 */
export function RecentlySold({ appliances }: { appliances: Appliance[] }) {
  if (appliances.length === 0) return null;

  return (
    <Section tone="white" size="md">
      <Container>
        <SectionHeading
          eyebrow="Warehouse turnover"
          title="Recently sold"
          description="Stock moves quickly — these units are gone. If you see something similar in current inventory, it is worth calling on the same day."
          action={
            <Link
              href="/inventory"
              className="inline-flex items-center gap-2 font-display text-[12.5px] font-bold uppercase tracking-[0.07em] text-ink-950 transition-colors hover:text-brand-500"
            >
              Shop what&apos;s available
              <ArrowRight aria-hidden className="size-4" strokeWidth={2.5} />
            </Link>
          }
        />

        <ul className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 xl:grid-cols-6">
          {appliances.map((appliance) => (
            <li key={appliance.id}>
              <SoldProductCard appliance={appliance} />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
