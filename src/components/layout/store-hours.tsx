import { Clock, CalendarClock } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * Warehouse hours block. Regular hours are walk-in; after-hours is appointment
 * only, and the copy never blurs that distinction.
 */
export function StoreHours({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  const light = tone === "light";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex gap-3">
        <Clock
          aria-hidden
          className={cn("mt-0.5 size-[18px] shrink-0", light ? "text-brand-400" : "text-brand-500")}
          strokeWidth={2.5}
        />
        <div>
          <p className={cn("eyebrow", light ? "text-white/55" : "text-ink-500")}>Warehouse hours</p>
          <p
            className={cn(
              "mt-1.5 font-display text-lg font-bold tnum",
              light ? "text-white" : "text-ink-950",
            )}
          >
            {siteConfig.hours.regular.label}
          </p>
          <p className={cn("text-[14px]", light ? "text-white/65" : "text-ink-600")}>
            {siteConfig.hours.regular.days}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <CalendarClock
          aria-hidden
          className={cn("mt-0.5 size-[18px] shrink-0", light ? "text-brand-400" : "text-brand-500")}
          strokeWidth={2.5}
        />
        <div>
          <p className={cn("eyebrow", light ? "text-white/55" : "text-ink-500")}>After-hours</p>
          <p
            className={cn(
              "mt-1.5 font-display text-lg font-bold tnum",
              light ? "text-white" : "text-ink-950",
            )}
          >
            {siteConfig.hours.afterHours.label}
          </p>
          <p className={cn("text-[14px]", light ? "text-white/65" : "text-ink-600")}>
            {siteConfig.hours.afterHours.days} — {siteConfig.hours.afterHours.note}
          </p>
        </div>
      </div>
    </div>
  );
}
