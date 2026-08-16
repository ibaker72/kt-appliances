import { formatPrice, savingsFor, type Appliance } from "@/lib/inventory/types";
import { cn } from "@/lib/utils";

interface ProductPriceProps {
  appliance: Pick<Appliance, "price" | "compareAtPrice">;
  size?: "sm" | "md" | "lg";
  /** Muted treatment for sold units. */
  muted?: boolean;
  className?: string;
}

const sizes = {
  sm: { price: "text-[26px]", compare: "text-[13px]", save: "text-[11px]" },
  md: { price: "text-[34px] sm:text-[38px]", compare: "text-sm", save: "text-[11.5px]" },
  lg: { price: "text-[44px] sm:text-[54px]", compare: "text-base", save: "text-xs" },
} as const;

/**
 * Price block. The KT price is always the visually dominant figure. A comparison
 * price and savings line only appear when a real `compare_at_price` is on record
 * and is genuinely higher — otherwise nothing is rendered in their place.
 */
export function ProductPrice({ appliance, size = "md", muted = false, className }: ProductPriceProps) {
  const s = sizes[size];
  const savings = savingsFor(appliance);

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1", className)}>
      <span
        className={cn(
          "font-display font-extrabold leading-none tracking-[-0.03em] tnum",
          muted ? "text-ink-400 line-through decoration-2" : "text-brand-500",
          s.price,
        )}
      >
        {formatPrice(appliance.price)}
      </span>

      {savings != null ? (
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className={cn("text-ink-400 line-through tnum", s.compare)}>
            {formatPrice(appliance.compareAtPrice!)}
          </span>
          <span
            className={cn(
              "inline-block bg-ink-950 px-2 py-1 font-display font-bold uppercase leading-none tracking-[0.06em] text-white tnum",
              s.save,
            )}
          >
            Save {formatPrice(savings)}
          </span>
        </span>
      ) : null}
    </div>
  );
}
