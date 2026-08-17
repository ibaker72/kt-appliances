import { dealBadges, type DealBadge as DealBadgeData, type DealBadgeTone } from "@/lib/inventory/badges";
import type { Appliance } from "@/lib/inventory/types";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center px-2 py-1 font-display text-[10.5px] font-bold uppercase leading-none tracking-[0.07em]";

/**
 * Red is reserved for the savings claim so it stays the loudest thing on a card.
 * The remaining tones are informational and deliberately quieter.
 */
const tones: Record<DealBadgeTone, string> = {
  deal: "bg-brand-500 text-white",
  scarce: "bg-ink-950 text-white",
  fresh: "border border-ink-200 bg-white text-ink-800",
  pick: "border border-ink-200 bg-bone-100 text-ink-700",
};

export function DealBadge({ badge, className }: { badge: DealBadgeData; className?: string }) {
  return (
    <span className={cn(base, tones[badge.tone], className)} title={badge.title}>
      {badge.label}
    </span>
  );
}

/**
 * Badge stack for a listing. Capped because a card wearing five labels reads as
 * decoration rather than information — `dealBadges` is ordered strongest-first,
 * so the cap keeps the most useful ones.
 */
export function DealBadges({
  appliance,
  limit = 2,
  className,
}: {
  appliance: Appliance;
  limit?: number;
  className?: string;
}) {
  const badges = dealBadges(appliance).slice(0, limit);
  if (badges.length === 0) return null;

  return (
    <span className={cn("flex flex-wrap items-start gap-1", className)}>
      {badges.map((badge) => (
        <DealBadge key={badge.label} badge={badge} />
      ))}
    </span>
  );
}
