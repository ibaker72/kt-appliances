import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModuleHeaderProps {
  title: string;
  /** "Shop all ›" destination. Omitted renders the title alone. */
  href?: string;
  /** Defaults to "Shop all". */
  hrefLabel?: string;
  /** A real facet or result count. Never a decorative figure. */
  count?: number;
  /** Heading level, for the document outline. */
  as?: "h2" | "h3";
  id?: string;
  className?: string;
}

/**
 * The heading above a merchandising module: one line, title left, link right.
 *
 * Replaces `SectionHeading`, which stacked a red-ruled kicker, a display-weight
 * title and a descriptive paragraph on every section of every page. That combo
 * was the most repetitive thing on the site — it announced each module instead
 * of getting out of the way of the products underneath it. Nothing here is
 * optional-but-encouraged: there is no eyebrow, no description and no tone,
 * because a module that needs a paragraph to explain itself is not merchandising.
 */
export function ModuleHeader({
  title,
  href,
  hrefLabel = "Shop all",
  count,
  as: Tag = "h2",
  id,
  className,
}: ModuleHeaderProps) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 pb-3", className)}>
      <Tag
        id={id}
        className="min-w-0 font-sans text-[18px] font-semibold leading-tight tracking-normal text-ink-950 sm:text-[20px]"
      >
        {title}
        {count != null ? (
          <span className="ml-2 text-ui font-normal text-ink-500 tnum">({count})</span>
        ) : null}
      </Tag>

      {href ? (
        <Link href={href} className={buttonStyles("link", "sm", "shrink-0")}>
          {hrefLabel}
          <ChevronRight aria-hidden className="size-4" strokeWidth={2.5} />
        </Link>
      ) : null}
    </div>
  );
}

interface SectionProps {
  children: ReactNode;
  className?: string;
  /**
   * Background band. `flat` is the merchandising default — a continuous scroll
   * separated by a hairline. `bone` and `ink` are contrast bands, used at most
   * once per page now that modules no longer alternate down the whole page.
   */
  tone?: "white" | "bone" | "ink" | "flat";
  id?: string;
  /** Vertical rhythm. Defaults to `module` under `flat`, `md` otherwise. */
  size?: "module" | "sm" | "md" | "lg";
}

const tones = {
  white: "bg-white",
  bone: "bg-bone-100",
  ink: "bg-ink-950 on-dark",
  flat: "bg-white border-b border-line",
} as const;

const paddings = {
  module: "py-5 sm:py-8 lg:py-10",
  sm: "py-8 sm:py-12 lg:py-14",
  md: "py-10 sm:py-14 lg:py-20",
  lg: "py-12 sm:py-16 lg:py-24",
} as const;

export function Section({ children, className, tone = "white", size, id }: SectionProps) {
  const padding = paddings[size ?? (tone === "flat" ? "module" : "md")];

  return (
    <section id={id} className={cn(tones[tone], padding, className)}>
      {children}
    </section>
  );
}
