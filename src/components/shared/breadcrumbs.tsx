import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, type Crumb } from "@/lib/seo/jsonld";
import { cn } from "@/lib/utils";

/**
 * Breadcrumb trail with matching BreadcrumbList schema. The final crumb is the
 * current page and is rendered as text, not a link.
 */
export function Breadcrumbs({
  crumbs,
  tone = "dark",
  className,
}: {
  /** Excluding Home, which is prepended automatically. */
  crumbs: Crumb[];
  tone?: "dark" | "light";
  className?: string;
}) {
  const full: Crumb[] = [{ name: "Home", path: "/" }, ...crumbs];
  const light = tone === "light";

  return (
    <>
      <JsonLd data={breadcrumbSchema(full)} />
      <nav aria-label="Breadcrumb" className={className}>
        <ol
          className={cn(
            "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px]",
            light ? "text-white/55" : "text-ink-500",
          )}
        >
          {full.map((crumb, index) => {
            const isLast = index === full.length - 1;
            return (
              <li key={crumb.path} className="flex items-center gap-1.5">
                {index > 0 ? (
                  <ChevronRight
                    aria-hidden
                    className={cn("size-3.5", light ? "text-white/30" : "text-ink-300")}
                    strokeWidth={2.5}
                  />
                ) : null}
                {isLast ? (
                  <span aria-current="page" className={light ? "text-white/85" : "text-ink-800"}>
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    href={crumb.path}
                    className={cn(
                      "inline-flex min-h-[36px] items-center transition-colors",
                      light ? "hover:text-white" : "hover:text-brand-500",
                    )}
                  >
                    {crumb.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
