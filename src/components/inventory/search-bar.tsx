import Form from "next/form";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

type SearchBarSize = "sm" | "lg";

interface SearchBarProps {
  /** Route the search submits to — `/inventory` or a category page. */
  action?: string;
  /** Pre-fills the field so the term survives a page render. */
  defaultValue?: string;
  size?: SearchBarSize;
  placeholder?: string;
  /** Distinguishes the label/input pair when more than one bar is on a page. */
  id?: string;
  /** Visible label. Falls back to a screen-reader-only one. */
  label?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Inventory search.
 *
 * `next/form` submits as a GET, so the term lands in the URL exactly like every
 * other filter: shareable, server-rendered on first paint, and back-button safe.
 * It is a server component with no client JavaScript, and degrades to a plain
 * HTML form if JS never loads.
 */
export function SearchBar({
  action = "/inventory",
  defaultValue = "",
  size = "sm",
  placeholder = "Search by brand, model number or appliance…",
  id = "inventory-search",
  label,
  className,
  autoFocus = false,
}: SearchBarProps) {
  const large = size === "lg";

  return (
    <Form action={action} className={cn("min-w-0", className)} role="search">
      {label ? (
        <label
          htmlFor={id}
          className="text-ui font-semibold uppercase tracking-wide mb-2.5 block text-ink-500"
        >
          {label}
        </label>
      ) : (
        <label htmlFor={id} className="sr-only">
          Search appliance inventory by brand, model number or appliance type
        </label>
      )}

      <div className="flex min-w-0">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400",
              large ? "size-5" : "size-4",
            )}
            strokeWidth={2.5}
          />
          <input
            id={id}
            type="search"
            name="q"
            defaultValue={defaultValue}
            placeholder={placeholder}
            autoFocus={autoFocus}
            enterKeyHint="search"
            autoComplete="off"
            className={cn(
              "w-full min-w-0 rounded-l-sm border border-r-0 border-ink-200 bg-white text-ink-950 placeholder:text-ink-500 focus:border-ink-900",
              large ? "h-12 pl-11 pr-3 text-[16px] sm:h-14" : "h-11 pl-10 pr-3 text-[15px]",
            )}
          />
        </div>
        <button
          type="submit"
          className={cn(
            "shrink-0 rounded-r-sm border border-brand-500 bg-brand-500 font-semibold text-white transition-colors hover:border-brand-600 hover:bg-brand-600",
            large ? "h-12 px-5 text-[13px] sm:h-14 sm:px-6" : "h-11 px-4 text-[12px]",
          )}
        >
          <span className={large ? "" : "sr-only sm:not-sr-only"}>Search</span>
          {large ? null : (
            <Search aria-hidden className="size-4 sm:hidden" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </Form>
  );
}
