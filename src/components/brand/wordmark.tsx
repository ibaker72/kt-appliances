import Image from "next/image";

import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * The KT Appliances lockup.
 *
 * Renders the real logo file when `siteConfig.brand.logoFile` is set, and the
 * typographic stand-in until then. It is a swap, not a layering: once the file
 * is in place the stand-in stops rendering anywhere on the site.
 *
 * Every placement goes through this one component, so adding the artwork is a
 * single change rather than a hunt through the header, footer and admin shell.
 */
interface WordmarkProps {
  /** `light` renders for dark backgrounds. */
  tone?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  /** Shows the descriptor line under the name. Ignored once a logo file is set. */
  withTagline?: boolean;
  className?: string;
}

/** Display heights for the supplied artwork. Width follows the file's own ratio. */
const LOGO_HEIGHTS = {
  sm: "h-8",
  md: "h-11 sm:h-[52px] lg:h-[64px]",
  lg: "h-16 sm:h-20",
} as const;

const sizes = {
  sm: { tile: "h-8 w-8 text-[15px]", name: "text-[15px]", tag: "text-[8px]" },
  md: { tile: "h-10 w-10 text-lg sm:h-11 sm:w-11 sm:text-xl", name: "text-lg sm:text-xl", tag: "text-[9px]" },
  lg: { tile: "h-14 w-14 text-2xl", name: "text-2xl sm:text-3xl", tag: "text-[10px]" },
} as const;

export function Wordmark({ tone = "dark", size = "md", withTagline = true, className }: WordmarkProps) {
  const light = tone === "light";
  const { logoFile, logoNeedsLightPlate } = siteConfig.brand;

  if (logoFile) {
    // The supplied mark is drawn for white. On a dark surface it gets the white
    // card it was designed against rather than being recoloured or knocked out.
    const plated = light && logoNeedsLightPlate;
    return (
      <span
        className={cn(
          "inline-flex items-center",
          plated ? "rounded-sm bg-white px-2.5 py-1.5" : "",
          className,
        )}
      >
        <Image
          src={logoFile}
          alt={siteConfig.legalName}
          // Nominal intrinsic size; CSS below sets the real display height and
          // lets width follow whatever aspect ratio the supplied file has.
          width={640}
          height={260}
          priority
          unoptimized={logoFile.endsWith(".svg")}
          className={cn("w-auto object-contain", LOGO_HEIGHTS[size])}
        />
      </span>
    );
  }

  const s = sizes[size];

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
