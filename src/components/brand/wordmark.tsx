import { cn } from "@/lib/utils";

/**
 * Typographic KT Appliances lockup.
 *
 * Used in place of a raster logo: a red "KT" tile paired with the full name.
 * When a proper vector logo asset is supplied, swap the internals of this one
 * component and every placement across the site updates.
 */
interface WordmarkProps {
  /** `light` renders for dark backgrounds. */
  tone?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  /** Shows the descriptor line under the name. */
  withTagline?: boolean;
  className?: string;
}

const sizes = {
  sm: { tile: "h-8 w-8 text-[15px]", name: "text-[15px]", tag: "text-[8px]" },
  md: { tile: "h-10 w-10 text-lg sm:h-11 sm:w-11 sm:text-xl", name: "text-lg sm:text-xl", tag: "text-[9px]" },
  lg: { tile: "h-14 w-14 text-2xl", name: "text-2xl sm:text-3xl", tag: "text-[10px]" },
} as const;

export function Wordmark({ tone = "dark", size = "md", withTagline = true, className }: WordmarkProps) {
  const s = sizes[size];
  const light = tone === "light";

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center bg-brand-500 font-display font-extrabold leading-none tracking-[-0.04em] text-white",
          s.tile,
        )}
      >
        KT
      </span>
      <span className="flex flex-col justify-center leading-none">
        <span
          className={cn(
            "font-display font-extrabold uppercase leading-none tracking-[-0.015em]",
            light ? "text-white" : "text-ink-950",
            s.name,
          )}
        >
          Appliances
        </span>
        {withTagline ? (
          <span
            className={cn(
              "mt-1 font-display font-bold uppercase leading-none tracking-[0.16em]",
              light ? "text-white/55" : "text-ink-500",
              s.tag,
            )}
          >
            Scratch &amp; Dent Warehouse
          </span>
        ) : null}
      </span>
    </span>
  );
}
