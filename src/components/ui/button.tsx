import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "dark"
  | "outline"
  | "outlineLight"
  | "ghost"
  | "white"
  | "link";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Sentence-case, body-face buttons.
 *
 * The previous treatment was uppercase letterspaced display type at every size,
 * which turned a page with several CTAs into a wall of shouting. Retail keeps
 * uppercase for badges and lets buttons read as words.
 */
const base =
  "inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-sm border " +
  "transition-[background-color,border-color,color,box-shadow] duration-150 " +
  "disabled:opacity-55 disabled:pointer-events-none select-none text-center whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 border-brand-500 text-white hover:bg-brand-600 hover:border-brand-600 shadow-card",
  dark: "bg-ink-950 border-ink-950 text-white hover:bg-ink-800 hover:border-ink-800",
  outline: "bg-white border-ink-900 text-ink-900 hover:bg-ink-950 hover:text-white",
  outlineLight:
    "bg-transparent border-white/45 text-white hover:bg-white hover:text-ink-950 hover:border-white",
  ghost: "bg-transparent border-transparent text-ink-900 hover:bg-bone-100",
  white: "bg-white border-white text-ink-950 hover:bg-bone-100 hover:border-bone-100",
  // "Shop all ›" affordances. Reads as a link, not a control, so it carries no
  // chrome and no button height — see `linkSizes`.
  link: "bg-transparent border-transparent text-ink-900 hover:text-brand-500 underline-offset-4 hover:underline",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-[14px]",
  lg: "h-12 px-6 text-[15px]",
};

/** The link variant is type on a page, so it gets no fixed height or padding. */
const linkSizes: Record<ButtonSize, string> = {
  sm: "text-[13px]",
  md: "text-[14px]",
  lg: "text-[15px]",
};

/** Shared class string so links and buttons can look identical without wrappers. */
export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, variants[variant], (variant === "link" ? linkSizes : sizes)[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonStyles(variant, size, className)} {...props} />;
}
