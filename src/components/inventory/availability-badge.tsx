import { CONDITION_LABELS, type Appliance } from "@/lib/inventory/types";
import { cn } from "@/lib/utils";

const badge =
  "inline-flex items-center gap-1.5 px-2 py-1 font-display text-[10.5px] font-bold uppercase leading-none tracking-[0.07em]";

/** Condition chip — scratch & dent, open box, etc. */
export function ConditionBadge({
  condition,
  className,
}: {
  condition: Appliance["condition"];
  className?: string;
}) {
  return (
    <span className={cn(badge, "border border-ink-200 bg-bone-100 text-ink-700", className)}>
      {CONDITION_LABELS[condition]}
    </span>
  );
}

/**
 * Stock state.
 *
 * The "N available" count is only rendered when the database actually says so.
 * Nothing here manufactures urgency — a unit with unknown quantity simply reads
 * "Available".
 */
export function AvailabilityBadge({
  appliance,
  className,
}: {
  appliance: Pick<Appliance, "status" | "quantity">;
  className?: string;
}) {
  if (appliance.status === "sold") {
    return (
      <span className={cn(badge, "bg-ink-950 text-white", className)}>
        <span aria-hidden className="size-1.5 rounded-full bg-white/60" />
        Sold
      </span>
    );
  }

  if (appliance.status === "reserved") {
    return (
      <span className={cn(badge, "border border-ink-300 bg-white text-ink-700", className)}>
        <span aria-hidden className="size-1.5 rounded-full bg-ink-400" />
        Reserved
      </span>
    );
  }

  const showCount = appliance.quantity > 0 && appliance.quantity <= 3;

  return (
    <span className={cn(badge, "bg-success-50 text-success-600", className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-success-600" />
      {showCount
        ? `${appliance.quantity} Available`
        : appliance.quantity > 3
          ? "In Stock"
          : "Available"}
    </span>
  );
}
