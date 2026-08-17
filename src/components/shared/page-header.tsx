import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Container } from "@/components/ui/container";
import type { Crumb } from "@/lib/seo/jsonld";
import { cn } from "@/lib/utils";

/**
 * Standard interior-page masthead: breadcrumb, H1, intro and optional actions.
 * Dark by default so every interior page opens with the same brand weight.
 */
export function PageHeader({
  title,
  description,
  crumbs,
  actions,
  aside,
  tone = "ink",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  crumbs: Crumb[];
  actions?: ReactNode;
  /** Optional right-hand column, e.g. key facts. */
  aside?: ReactNode;
  tone?: "ink" | "bone";
  className?: string;
}) {
  const dark = tone === "ink";

  return (
    <section
      className={cn(
        dark ? "on-dark bg-ink-950 text-white" : "border-b border-line bg-bone-100",
        className,
      )}
    >
      <Container className="py-8 sm:py-12 lg:py-14">
        <Breadcrumbs crumbs={crumbs} tone={dark ? "light" : "dark"} />

        <div className={cn("mt-6 gap-10", aside ? "lg:grid lg:grid-cols-12" : "")}>
          <div className={aside ? "lg:col-span-7" : "max-w-3xl"}>
            <h1
              className={cn(
                "font-display text-[2rem] font-extrabold leading-[1.02] tracking-[-0.02em] sm:text-[2.6rem] lg:text-[3rem]",
                dark ? "text-white" : "text-ink-950",
              )}
            >
              {title}
            </h1>
            {description ? (
              <div
                className={cn(
                  "mt-5 max-w-2xl text-[15.5px] leading-relaxed sm:text-[16.5px]",
                  dark ? "text-white/70" : "text-ink-600",
                )}
              >
                {description}
              </div>
            ) : null}
            {actions ? <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div> : null}
          </div>

          {aside ? <div className="min-w-0 mt-10 lg:col-span-5 lg:mt-0">{aside}</div> : null}
        </div>
      </Container>
    </section>
  );
}
