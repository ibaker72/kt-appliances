"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, MapPin, Phone, Search, X } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { Container } from "@/components/ui/container";
import { buttonStyles } from "@/components/ui/button";
import { CATEGORY_NAV, PRIMARY_NAV } from "@/lib/navigation";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  // Close the drawer when the route changes. Adjusting state during render is
  // React's recommended pattern for deriving from a prop — an effect here would
  // render the stale open menu for a frame first.
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    if (menuOpen) setMenuOpen(false);
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
      {/* Utility strip — establishes location and hours above everything else. */}
      <div className="on-dark hidden bg-ink-950 text-white lg:block">
        <Container className="flex h-9 items-center justify-between text-[12px]">
          <p className="flex items-center gap-2 text-white/70">
            <MapPin aria-hidden className="size-3.5 text-brand-400" strokeWidth={2.5} />
            <span className="font-medium text-white/85">{siteConfig.address.oneLine}</span>
            <span aria-hidden className="text-white/25">|</span>
            <span>
              Serving {siteConfig.serviceStatesShort.slice(0, -1).join(", ")} &amp;{" "}
              {siteConfig.serviceStatesShort.at(-1)}
            </span>
          </p>
          <p className="flex items-center gap-4 text-white/70">
            <span>
              Open Daily {siteConfig.hours.regular.label}
              <span className="text-white/40"> · After-hours by appointment</span>
            </span>
            <span aria-hidden className="text-white/25">|</span>
            <CallLink
              context="header-utility"
              className="font-display text-[13px] font-bold tracking-wide text-white hover:text-brand-400"
            >
              {siteConfig.phone.display}
            </CallLink>
          </p>
        </Container>
      </div>

      {/* Main bar */}
      <Container className="flex h-16 items-center justify-between gap-6 lg:h-[76px]">
        <Link
          href="/"
          className="shrink-0"
          aria-label={`${siteConfig.name} — home`}
          onClick={() => setMenuOpen(false)}
        >
          <Wordmark size="md" />
        </Link>

        {/* "Appliances" is omitted here on purpose — the category bar below and the
            Shop Inventory CTA both lead to the same place, and dropping it keeps
            every remaining label on one line at 1280px. */}
        <nav aria-label="Primary" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.filter((item) => item.href !== "/inventory").map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "relative flex h-[76px] items-center whitespace-nowrap px-2.5 font-display text-[12.5px] font-bold uppercase tracking-[0.04em] transition-colors",
                    isActive(item.href)
                      ? "text-ink-950 after:absolute after:inset-x-2.5 after:bottom-0 after:h-[3px] after:bg-brand-500"
                      : "text-ink-600 hover:text-ink-950",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            {/* Only shown when there is genuinely room for it: below 2xl the
                utility strip above already exposes a tappable phone number, and
                on mobile the fixed bottom bar does. */}
            <CallLink
              context="header"
              className={buttonStyles("outline", "md", "hidden 2xl:inline-flex")}
              aria-label={`Call ${siteConfig.phone.display}`}
            >
              <Phone aria-hidden className="size-4" strokeWidth={2.5} />
              {siteConfig.phone.display}
            </CallLink>
            <TextLink
              context="header"
              message={`Hi ${siteConfig.name}, I have a question about your appliances.`}
              className={buttonStyles("outline", "md", "xl:hidden")}
            >
              Text Us
            </TextLink>
            <Link href="/inventory" className={buttonStyles("primary", "md")}>
              Shop Inventory
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="grid size-11 place-items-center border border-line text-ink-900 transition-colors hover:bg-bone-100 xl:hidden"
          >
            {menuOpen ? (
              <X aria-hidden className="size-5" strokeWidth={2.5} />
            ) : (
              <Menu aria-hidden className="size-5" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </Container>

      {/* Category bar — the fastest path to merchandise on desktop. */}
      <div className="hidden border-t border-line bg-bone-50 lg:block">
        <Container className="flex h-11 items-center justify-between gap-6">
          <nav aria-label="Appliance categories">
            <ul className="flex items-center gap-6">
              {CATEGORY_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "text-[13px] font-medium transition-colors",
                      isActive(item.href)
                        ? "text-brand-500"
                        : "text-ink-600 hover:text-brand-500",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link
            href="/inventory"
            className="flex items-center gap-1.5 text-[13px] font-medium text-ink-600 transition-colors hover:text-brand-500"
          >
            <Search aria-hidden className="size-3.5" strokeWidth={2.5} />
            Search by brand or model
          </Link>
        </Container>
      </div>

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
    <div
      id="mobile-menu"
      className="fixed inset-x-0 bottom-0 top-16 z-50 overflow-y-auto overscroll-contain border-t border-line bg-white xl:hidden"
    >
      <div className="px-5 pb-32 pt-6 sm:px-6">
        <div className="flex gap-2">
          <Link href="/inventory" className={buttonStyles("primary", "lg", "flex-1")} onClick={onClose}>
            Shop Inventory
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

        <p className="eyebrow mt-8 mb-3 text-ink-500">Shop by category</p>
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
                      "block font-display text-[17px] font-bold",
                      isActive(item.href) ? "text-brand-500" : "text-ink-950",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.description ? (
                    <span className="mt-0.5 block text-[13px] text-ink-500">{item.description}</span>
                  ) : null}
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-400" />
              </Link>
            </li>
          ))}
        </ul>

        <p className="eyebrow mt-8 mb-3 text-ink-500">Information</p>
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

        <div className="mt-8 border border-line bg-bone-50 p-5">
          <p className="eyebrow text-ink-500">Warehouse</p>
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
