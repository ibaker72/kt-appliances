import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Section headings share one structure everywhere: a small red-ruled eyebrow,
 * a heavy display title, and optional supporting copy plus a trailing action.
 */
interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** `light` for dark backgrounds. */
  tone?: "dark" | "light";
  as?: "h1" | "h2" | "h3";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  tone = "dark",
  as: Tag = "h2",
  className,
}: SectionHeadingProps) {
  const light = tone === "light";
  return (
    <div
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p
            className={cn(
              "eyebrow mb-3 flex items-center gap-2.5",
              light ? "text-white/70" : "text-ink-500",
            )}
          >
            <span aria-hidden className="inline-block h-[3px] w-7 bg-brand-500" />
            {eyebrow}
          </p>
        ) : null}
        <Tag
          className={cn(
            "font-display font-extrabold leading-[0.98] tracking-[-0.025em]",
            Tag === "h1"
              ? "text-4xl sm:text-5xl lg:text-[3.6rem]"
              : "text-[1.75rem] sm:text-4xl lg:text-[2.75rem]",
            light ? "text-white" : "text-ink-950",
          )}
        >
          {title}
        </Tag>
        {description ? (
          <div
            className={cn(
              "mt-4 text-[15px] leading-relaxed sm:text-base",
              light ? "text-white/75" : "text-ink-600",
            )}
          >
            {description}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

interface SectionProps {
  children: ReactNode;
  className?: string;
  /** Background band. Sections alternate to create contrast down the page. */
  tone?: "white" | "bone" | "ink";
  id?: string;
  /** Vertical rhythm. */
  size?: "sm" | "md" | "lg";
}

const tones = {
  white: "bg-white",
  bone: "bg-bone-100",
  ink: "bg-ink-950 on-dark",
} as const;

const paddings = {
  sm: "py-12 sm:py-14",
  md: "py-14 sm:py-20",
  lg: "py-16 sm:py-24",
} as const;

export function Section({ children, className, tone = "white", size = "md", id }: SectionProps) {
  return (
    <section id={id} className={cn(tones[tone], paddings[size], className)}>
      {children}
    </section>
  );
}
