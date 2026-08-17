"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Clock, Heart, Menu, MapPin, Phone, Search, Tag, X } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { MegaMenu } from "@/components/layout/mega-menu";
import { SearchBar } from "@/components/inventory/search-bar";
import { Container } from "@/components/ui/container";
import { buttonStyles } from "@/components/ui/button";
import type { CategoryMenu } from "@/lib/inventory/query";
import { CATEGORY_NAV, PRIMARY_NAV, type NavItem } from "@/lib/navigation";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const DEALS_HREF = "/inventory?deals=1&sort=savings";

/** Routes that get the recommended-search rail: the homepage and the category pages. */
function showsQuickLinks(pathname: string): boolean {
  return pathname === "/" || CATEGORY_NAV.some((item) => item.href === pathname);
}

interface SiteHeaderProps {
  /** Mega-menu panels, derived from live inventory in the layout. */
  categories: CategoryMenu[];
  /** Already gated by `quickLinksFor`, so every chip returns results. */
  quickLinks: NavItem[];
}

export function SiteHeader({ categories, quickLinks }: SiteHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  // Close the drawers when the route changes. Adjusting state during render is
  // React's recommended pattern for deriving from a prop — an effect here would
  // render the stale open menu for a frame first.
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    if (menuOpen) setMenuOpen(false);
    if (searchOpen) setSearchOpen(false);
  }

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white shadow-header">
      {/* Row 1 — utility strip. Location and hours above everything else. */}
      <div className="on-dark hidden bg-ink-950 text-white lg:block">
        <Container className="flex h-8 items-center justify-between text-[12px]">
          <p className="flex items-center gap-2 text-white/70">
            <MapPin aria-hidden className="size-3.5 text-brand-400" strokeWidth={2.5} />
            <span className="font-medium text-white/85">{siteConfig.address.oneLine}</span>
            <span aria-hidden className="text-white/25">|</span>
            <span>
              Serving {siteConfig.serviceStatesShort.slice(0, -1).join(", ")} &amp;{" "}
              {siteConfig.serviceStatesShort.at(-1)}
            </span>
          </p>
          <p className="flex items-center gap-3 text-white/70">
            <span>Open daily {siteConfig.hours.regular.label}</span>
            <span aria-hidden className="text-white/25">|</span>
            <CallLink context="header-utility" className="font-semibold text-white hover:text-brand-400">
              {siteConfig.phone.display}
            </CallLink>
            <span aria-hidden className="text-white/25">|</span>
            <TextLink
              context="header-utility"
              message={`Hi ${siteConfig.name}, I have a question about your appliances.`}
              className="font-semibold text-white hover:text-brand-400"
            >
              Text us
            </TextLink>
            <span aria-hidden className="text-white/25">|</span>
            {/* No count here on purpose: the saved list is a cookie, and reading
                it in the layout would make every static page dynamic. */}
            <Link href="/inventory/saved" className="font-semibold text-white hover:text-brand-400">
              Saved
            </Link>
          </p>
        </Container>
      </div>

      {/* Row 2 — main bar. Search is the widest thing in it on purpose: it is the
          fastest route into inventory, so it outranks the informational links. */}
      <Container className="flex h-16 items-center gap-4 lg:h-[76px] lg:gap-6">
        <Link
          href="/"
          className="shrink-0"
          aria-label={`${siteConfig.name} — home`}
          onClick={() => setMenuOpen(false)}
        >
          <Wordmark size="md" />
        </Link>

        {/* Hours are stated rather than computed. "Open until 5 PM" would be
            wrong for most of the day, and a clock-derived status cannot be
            prerendered without going stale or mismatching on hydration. */}
        <Link
          href="/contact"
          className="hidden shrink-0 items-center gap-2 rounded-sm border border-line px-3 py-1.5 text-ui text-ink-700 transition-colors hover:border-ink-400 hover:text-ink-950 xl:flex"
        >
          <Clock aria-hidden className="size-4 text-brand-500" strokeWidth={2.5} />
          <span>
            <span className="font-semibold text-ink-950">{siteConfig.address.city}</span>
            <span aria-hidden className="mx-1.5 text-ink-300">·</span>
            Open daily 10–5
          </span>
        </Link>

        <SearchBar
          id="header-search"
          size="sm"
          placeholder="Search brand, model or appliance…"
          className="hidden min-w-[220px] flex-1 lg:block"
        />

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <CallLink
            context="header"
            className={buttonStyles("outline", "md", "hidden whitespace-nowrap xl:inline-flex")}
            aria-label={`Call ${siteConfig.phone.display}`}
          >
            <Phone aria-hidden className="size-4" strokeWidth={2.5} />
            {siteConfig.phone.display}
          </CallLink>
          <Link
            href="/inventory"
            className={buttonStyles("primary", "md", "hidden whitespace-nowrap md:inline-flex")}
          >
            Shop inventory
          </Link>

          {/* Search toggle below `lg`, where the inline field is hidden. */}
          <button
            type="button"
            onClick={() => {
              setSearchOpen((open) => !open);
              setMenuOpen(false);
            }}
            aria-expanded={searchOpen}
            aria-controls="mobile-search"
            aria-label={searchOpen ? "Close search" : "Search inventory"}
            className="grid size-10 place-items-center rounded-sm border border-line text-ink-900 transition-colors hover:bg-bone-100 lg:hidden"
          >
            {searchOpen ? (
              <X aria-hidden className="size-5" strokeWidth={2.5} />
            ) : (
              <Search aria-hidden className="size-5" strokeWidth={2.5} />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen((open) => !open);
              setSearchOpen(false);
            }}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-sm border border-line text-ink-900 transition-colors hover:bg-bone-100 lg:hidden"
          >
            {menuOpen ? (
              <X aria-hidden className="size-5" strokeWidth={2.5} />
            ) : (
              <Menu aria-hidden className="size-5" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </Container>

      {/* Mobile search drawer */}
      {searchOpen ? (
        <div id="mobile-search" className="border-t border-line bg-bone-50 lg:hidden">
          <Container className="py-3">
            <SearchBar id="mobile-search-input" size="sm" autoFocus />
          </Container>
        </div>
      ) : null}

      {/* Row 3 — category bar with mega-menu panels. */}
      <MegaMenu categories={categories} dealsHref={DEALS_HREF} />

      {/* Row 4 — recommended searches, directly under the nav where retail puts
          them. Homepage and category pages only; every chip is pre-gated. */}
      {quickLinks.length > 0 && showsQuickLinks(pathname) ? (
        <div className="border-t border-line bg-bone-50">
          <Container>
            <nav aria-label="Recommended searches">
              <ul className="no-scrollbar -mx-5 flex h-10 items-center gap-2 overflow-x-auto px-5 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
                {quickLinks.map((link) => (
                  <li key={link.href} className="shrink-0">
                    <Link
                      href={link.href}
                      className="inline-flex items-center rounded-pill border border-line bg-white px-3 py-1 text-ui text-ink-700 transition-colors hover:border-ink-950 hover:text-brand-500"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Container>
        </div>
      ) : null}

      {menuOpen ? <MobileMenu onClose={() => setMenuOpen(false)} isActive={isActive} /> : null}
    </header>
  );
}

function MobileMenu({
  onClose,
  isActive,
}: {
  onClose: () => void;
  isActive: (href: string) => boolean;
}) {
  return (
    /*
      Anchored to the bottom of the header with `top-full` rather than a hardcoded
      offset: the header's height changes across breakpoints, and `100%` inside
      the height calc resolves against the header, so the drawer always fills
      exactly the space below it.
    */
    <div
      id="mobile-menu"
      className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-100%)] overflow-y-auto overscroll-contain border-t border-line bg-white lg:hidden"
    >
      <div className="px-5 pb-32 pt-6 sm:px-6">
        <SearchBar id="menu-search" size="sm" />

        <div className="mt-4 flex gap-2">
          <Link href="/inventory" className={buttonStyles("primary", "lg", "flex-1")} onClick={onClose}>
            Shop inventory
          </Link>
          <CallLink
            context="mobile-menu"
            className={buttonStyles("outline", "lg", "flex-1")}
            aria-label={`Call ${siteConfig.phone.display}`}
          >
            <Phone aria-hidden className="size-4" strokeWidth={2.5} />
            Call
          </CallLink>
        </div>

        <Link
          href={DEALS_HREF}
          onClick={onClose}
          className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-brand-500 bg-brand-50 px-4 py-3.5"
        >
          <span className="flex items-center gap-2.5">
            <Tag aria-hidden className="size-[18px] text-brand-500" strokeWidth={2.5} />
            <span className="font-semibold text-brand-600">Today&apos;s warehouse deals</span>
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-brand-500" />
        </Link>

        <Link
          href="/inventory/saved"
          onClick={onClose}
          className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-line px-4 py-3.5"
        >
          <span className="flex items-center gap-2.5">
            <Heart aria-hidden className="size-[18px] text-brand-500" strokeWidth={2.5} />
            <span className="font-semibold text-ink-950">Saved appliances</span>
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-400" />
        </Link>

        <h2 className="mt-8 mb-2 text-ui font-semibold uppercase tracking-wide text-ink-500">
          Shop by category
        </h2>
        <ul className="border-t border-line">
          {CATEGORY_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-between gap-4 border-b border-line py-4"
              >
                <span>
                  <span
                    className={cn(
                      "block text-[16px] font-semibold",
                      isActive(item.href) ? "text-brand-500" : "text-ink-950",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.description ? (
                    <span className="mt-0.5 block text-ui text-ink-500">{item.description}</span>
                  ) : null}
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-400" />
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-8 mb-2 text-ui font-semibold uppercase tracking-wide text-ink-500">
          Information
        </h2>
        <ul className="border-t border-line">
          {PRIMARY_NAV.filter((item) => item.href !== "/inventory").map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between gap-4 border-b border-line py-3.5 text-[15px] font-medium",
                  isActive(item.href) ? "text-brand-500" : "text-ink-800",
                )}
              >
                {item.label}
                <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-400" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-sm border border-line bg-bone-50 p-5">
          <h2 className="text-ui font-semibold uppercase tracking-wide text-ink-500">Warehouse</h2>
          <p className="mt-2 font-display text-lg font-bold text-ink-950">
            {siteConfig.address.street}
          </p>
          <p className="text-[15px] text-ink-600">
            {siteConfig.address.city}, {siteConfig.address.state}
          </p>
          <p className="mt-3 text-[14px] text-ink-600">
            Open daily {siteConfig.hours.regular.label}
            <br />
            After-hours {siteConfig.hours.afterHours.label} by appointment
          </p>
        </div>
      </div>
    </div>
  );
}
