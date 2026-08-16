import { TriangleAlert } from "lucide-react";
import { isDemoInventory } from "@/lib/inventory/repository";
import { Container } from "@/components/ui/container";

/**
 * Visible warning whenever the site is serving sample inventory instead of real
 * warehouse stock. Deliberately impossible to miss: nobody should ever mistake
 * the seeded catalogue for products that are actually on the floor.
 *
 * Disappears automatically once Supabase credentials are configured.
 */
export function DemoDataNotice() {
  if (!isDemoInventory()) return null;

  return (
    <div className="bg-amber-400 text-ink-950">
      <Container className="flex items-center justify-center gap-2 py-2 text-center">
        <TriangleAlert aria-hidden className="size-4 shrink-0" strokeWidth={2.5} />
        <p className="text-[12.5px] font-semibold leading-snug">
          Sample inventory — no database is connected. These appliances are placeholders for layout
          review, not real stock.
        </p>
      </Container>
    </div>
  );
}
