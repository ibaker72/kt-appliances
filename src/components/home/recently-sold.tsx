import { SoldProductCard } from "@/components/inventory/product-card";
import { Container } from "@/components/ui/container";
import { Rail } from "@/components/ui/rail";
import { ModuleHeader, Section } from "@/components/ui/section";
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
    <Section tone="flat">
      <Container>
        <ModuleHeader
          title="Recently sold"
          href="/inventory"
          hrefLabel="Shop what's available"
        />

        <Rail label="Recently sold" itemWidth="tile">
          {appliances.map((appliance) => (
            <SoldProductCard key={appliance.id} appliance={appliance} />
          ))}
        </Rail>
      </Container>
    </Section>
  );
}
