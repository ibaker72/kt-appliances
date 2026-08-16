import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "dark" | "outline" | "outlineLight" | "ghost" | "white";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-display font-bold uppercase tracking-[0.06em] " +
  "rounded-[3px] border transition-[background-color,border-color,color,transform] duration-150 " +
  "disabled:opacity-55 disabled:pointer-events-none active:translate-y-px select-none text-center whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 border-brand-500 text-white hover:bg-brand-600 hover:border-brand-600 shadow-card",
  dark: "bg-ink-950 border-ink-950 text-white hover:bg-ink-800 hover:border-ink-800",
  outline: "bg-white border-ink-900 text-ink-900 hover:bg-ink-950 hover:text-white",
  outlineLight:
    "bg-transparent border-white/45 text-white hover:bg-white hover:text-ink-950 hover:border-white",
  ghost: "bg-transparent border-transparent text-ink-900 hover:bg-bone-100",
  white: "bg-white border-white text-ink-950 hover:bg-bone-100 hover:border-bone-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[11px]",
  md: "h-11 px-5 text-[12px]",
  lg: "h-[54px] px-7 text-[13px] sm:text-sm",
};

/** Shared class string so links and buttons can look identical without wrappers. */
export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonStyles(variant, size, className)} {...props} />;
}
