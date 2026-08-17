"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Tag } from "lucide-react";

import type { CategoryMenu, MenuLink } from "@/lib/inventory/query";
import { cn } from "@/lib/utils";

/**
 * Category bar with hover/focus mega-menu panels.
 *
 * Every link in every panel comes from `getNavigationMenu`, which counts rows
 * before emitting a link — so there is no such thing as a dead entry here, and
 * columns that have no inventory behind them simply do not render. A category
 * with nothing in it degrades to a plain link rather than opening an empty panel.
 */
export function MegaMenu({ categories, dealsHref }: { categories: CategoryMenu[]; dealsHref: string }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();

  // Pointer close is delayed so the diagonal travel from the trigger down into
  // the panel does not dismiss it mid-move.
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenSlug(null), 120);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  useEffect(() => () => cancelClose(), []);

  useEffect(() => {
    if (!openSlug) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenSlug(null);
    };
    // Focus leaving the whole nav closes the panel; moving between the trigger
    // and the links inside it does not.
    const onFocusIn = (event: FocusEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenSlug(null);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [openSlug]);

  return (
    <div
      ref={navRef}
      className="relative hidden border-t border-line bg-white lg:block"
      onMouseLeave={scheduleClose}
    >
      <nav aria-label="Appliance categories">
        <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-6 px-5 sm:px-6 lg:px-10">
          <ul className="flex items-center">
            {categories.map((category) => {
              const hasPanel =
                category.subcategories.length > 0 ||
                category.brands.length > 0 ||
                category.priceBands.length > 0;
              const open = openSlug === category.slug;

              return (
                <li
                  key={category.slug}
                  onMouseEnter={() => {
                    cancelClose();
                    setOpenSlug(hasPanel ? category.slug : null);
                  }}
                >
                  <Link
                    href={category.path}
                    aria-expanded={hasPanel ? open : undefined}
                    aria-controls={hasPanel ? `${panelId}-${category.slug}` : undefined}
                    onFocus={() => setOpenSlug(hasPanel ? category.slug : null)}
                    className={cn(
                      "flex h-12 items-center gap-1 whitespace-nowrap px-3 text-[14px] font-medium transition-colors",
                      open ? "text-brand-500" : "text-ink-700 hover:text-brand-500",
                    )}
                  >
                    {category.name}
                    {hasPanel ? (
                      <ChevronDown
                        aria-hidden
                        className={cn("size-3.5 transition-transform", open ? "rotate-180" : "")}
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </Link>

                  {hasPanel && open ? (
                    <MegaPanel
                      id={`${panelId}-${category.slug}`}
                      category={category}
                      onMouseEnter={cancelClose}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>

          <Link
            href={dealsHref}
            className="flex items-center gap-1.5 whitespace-nowrap text-[14px] font-semibold text-brand-500 transition-colors hover:text-brand-600"
          >
            <Tag aria-hidden className="size-4" strokeWidth={2.5} />
            Today&apos;s deals
          </Link>
        </div>
      </nav>
    </div>
  );
}

function MegaPanel({
  id,
  category,
  onMouseEnter,
}: {
  id: string;
  category: CategoryMenu;
  onMouseEnter: () => void;
}) {
  /**
   * Arrow keys walk the panel's links. Tab already does this in DOM order — this
   * adds the vertical stepping a shopper expects from a menu, without trapping
   * focus, so Tab still escapes the panel normally.
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const links = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>("a[href]")];
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (index === -1) return;
    event.preventDefault();
    const next = event.key === "ArrowDown" ? index + 1 : index - 1;
    links[(next + links.length) % links.length]?.focus();
  };

  return (
    <div
      id={id}
      onMouseEnter={onMouseEnter}
      onKeyDown={onKeyDown}
      /* The global prefers-reduced-motion rule in globals.css collapses this
         animation to nothing, so the panel simply appears for those users. */
      className="panel-in absolute inset-x-0 top-full z-40 border-y border-line bg-white shadow-lift"
    >
      <div className="mx-auto grid w-full max-w-[1320px] gap-8 px-5 py-7 sm:px-6 lg:grid-cols-4 lg:px-10">
        <MenuColumn title={`Shop ${category.name.toLowerCase()}`} links={category.subcategories} />
        <MenuColumn title="Shop by brand" links={category.brands} />
        <MenuColumn title="Shop by price" links={category.priceBands} />

        <div className="border border-line bg-bone-50 p-5">
          <p className="text-ui font-semibold uppercase tracking-wide text-brand-500">
            {category.count} available
          </p>
          <p className="mt-2 font-display text-[19px] font-bold leading-tight text-ink-950">
            Every {category.name.toLowerCase().replace(/s$/, "")} on the floor
          </p>
          <p className="mt-2 text-ui leading-relaxed text-ink-600">
            Condition, tested function and the current price are on every listing.
          </p>
          <Link
            href={category.path}
            className="mt-4 inline-flex items-center text-[14px] font-semibold text-ink-900 underline underline-offset-4 hover:text-brand-500"
          >
            Browse all {category.name.toLowerCase()}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Renders nothing when the column has no inventory behind it. */
function MenuColumn({ title, links }: { title: string; links: MenuLink[] }) {
  if (links.length === 0) return null;

  return (
    <div className="min-w-0">
      <h3 className="text-ui font-semibold uppercase tracking-wide text-ink-500">{title}</h3>
      <ul className="mt-3 space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-baseline justify-between gap-3 py-1 text-[14px] text-ink-800 transition-colors hover:text-brand-500"
            >
              <span className="min-w-0 truncate">{link.label}</span>
              <span className="shrink-0 text-ui text-ink-400 tnum">{link.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
