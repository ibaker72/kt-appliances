import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  /** `wide` is used for full-bleed merchandising grids, `narrow` for prose. */
  width?: "default" | "wide" | "narrow";
  as?: ElementType;
}

const widths = {
  narrow: "max-w-3xl",
  default: "max-w-[1320px]",
  wide: "max-w-[1560px]",
} as const;

export function Container({ children, className, width = "default", as: Tag = "div" }: ContainerProps) {
  return (
    <Tag className={cn("mx-auto w-full px-5 sm:px-6 lg:px-10", widths[width], className)}>
      {children}
    </Tag>
  );
}
