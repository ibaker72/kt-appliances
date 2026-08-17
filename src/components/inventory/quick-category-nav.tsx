import Link from "next/link";

import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Horizontally scrollable rail of popular searches.
 *
 * Every chip is a real filtered URL — the caller passes an already-gated list
 * (see `quickLinksFor`) so nothing here points at an empty result set. On phones
 * it scrolls sideways with snap points; from `md` up it wraps, because a scroll
 * rail on a wide screen hides half the options for no reason.
 */
export function QuickCategoryNav({
  links,
  label = "Popular searches",
  className,
}: {
  links: NavItem[];
  label?: string;
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <nav aria-label={label} className={cn("min-w-0", className)}>
      <ul
        className={cn(
          "no-scrollbar -mx-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5",
          "sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0",
        )}
      >
        {links.map((link) => (
          <li key={link.href} className="shrink-0 snap-start">
            <Link
              href={link.href}
              className="inline-flex min-h-11 items-center whitespace-nowrap border border-line bg-white px-4 py-2 text-[14px] font-medium text-ink-800 transition-colors hover:border-ink-950 hover:text-brand-500"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
