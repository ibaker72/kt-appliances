import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { CallLink, DirectionsLink, EmailLink, TextLink } from "@/components/contact/contact-links";
import { StoreHours } from "@/components/layout/store-hours";
import { Container } from "@/components/ui/container";
import { getPhoto } from "@/lib/media/manifest";
import {
  FOOTER_COMPANY_NAV,
  FOOTER_LEGAL_NAV,
  FOOTER_SERVICE_NAV,
  FOOTER_SHOP_NAV,
} from "@/lib/navigation";
import { SERVICE_LOCATIONS } from "@/lib/content/locations";
import { siteConfig } from "@/lib/site-config";

function LinkColumn({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="text-ui font-semibold uppercase tracking-wide text-white/55">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={`${title}-${item.href}`}>
            <Link
              href={item.href}
              className="text-[14.5px] text-white/70 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  const strip = getPhoto("footer.strip");

  return (
    <footer className="on-dark bg-ink-950 text-white">
      {strip ? (
        // A slim band of the actual floor above the link columns — decorative
        // (the footer's text carries all the information), heavily scrimmed so
        // it grounds the footer without competing with it.
        <div aria-hidden className="relative h-24 overflow-hidden sm:h-32">
          <Image
            src={strip.src}
            alt=""
            fill
            sizes="100vw"
            placeholder={strip.blurDataURL ? "blur" : "empty"}
            blurDataURL={strip.blurDataURL || undefined}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/40 to-ink-950" />
        </div>
      ) : null}
      <Container className="py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Identity + contact */}
          <div className="min-w-0 lg:col-span-4">
            <Wordmark tone="light" size="lg" />
            {/* The logo's own ribbon already says this. Shown only while the
                typographic stand-in is up, which carries no ribbon. */}
            {siteConfig.brand.logoFile ? null : (
              <p className="mt-4 inline-flex items-center rounded-pill border border-gold-500/50 px-3 py-1 text-ui font-semibold text-gold-500">
                {siteConfig.brand.ownership}
              </p>
            )}
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/70">
              Scratch &amp; dent and open-box appliances from name brands, tested at our East
              Stroudsburg warehouse and priced below traditional retail.
            </p>

            <div className="mt-7 space-y-3.5">
              <DirectionsLink
                context="footer"
                className="flex items-start gap-3 text-[15px] text-white/80 transition-colors hover:text-white"
              >
                <MapPin aria-hidden className="mt-0.5 size-[18px] shrink-0 text-brand-400" strokeWidth={2.5} />
                <span>
                  {siteConfig.address.street}
                  <br />
                  {siteConfig.address.city}, {siteConfig.address.state} {siteConfig.address.postalCode}
                </span>
              </DirectionsLink>

              <CallLink
                context="footer"
                className="flex items-center gap-3 transition-colors hover:text-brand-400"
              >
                <Phone aria-hidden className="size-[18px] shrink-0 text-brand-400" strokeWidth={2.5} />
                <span className="font-display text-xl font-bold tracking-tight tnum">
                  {siteConfig.phone.display}
                </span>
              </CallLink>

              <EmailLink
                context="footer"
                className="flex items-center gap-3 text-[15px] text-white/80 transition-colors hover:text-white"
              >
                <Mail aria-hidden className="size-[18px] shrink-0 text-brand-400" strokeWidth={2.5} />
                <span className="break-all">{siteConfig.email}</span>
              </EmailLink>
            </div>

            <p className="mt-6 text-[13.5px] text-white/55">
              Call or text — texting is usually the fastest way to get an answer on a specific unit.
            </p>
            <TextLink
              context="footer"
              message={`Hi ${siteConfig.name}, I have a question about your appliances.`}
              className="mt-3 inline-flex items-center gap-2 rounded-sm border border-white/30 px-4 py-2.5 text-[14px] font-semibold transition-colors hover:bg-white hover:text-ink-950"
            >
              Text {siteConfig.phone.display}
            </TextLink>
          </div>

          {/* Link columns */}
          <div className="min-w-0 grid gap-10 sm:grid-cols-3 lg:col-span-5">
            <LinkColumn title="Shop" items={FOOTER_SHOP_NAV} />
            <LinkColumn title="Services" items={FOOTER_SERVICE_NAV} />
            <LinkColumn title="Company" items={FOOTER_COMPANY_NAV} />
          </div>

          {/* Hours + coverage */}
          <div className="min-w-0 lg:col-span-3">
            <StoreHours tone="light" />
            <div className="mt-8 border-t border-white/10 pt-6">
              <h3 className="text-ui font-semibold uppercase tracking-wide text-white/55">Service area</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-white/70">
                Warehouse pickup in East Stroudsburg, PA. Delivery available across the Poconos and
                into {siteConfig.serviceStates.slice(1).join(" and ")} — delivery fees depend on
                distance and the appliance.
              </p>
              <Link
                href="/service-areas"
                className="mt-2 inline-flex min-h-[34px] items-center text-[14px] font-semibold text-brand-400 underline underline-offset-4 hover:text-white"
              >
                See service areas
              </Link>
            </div>
          </div>
        </div>
      </Container>

      {/* Towns we actually serve, linked individually. These pages exist and were
          reachable only via /service-areas — this is real internal linking the
          site was leaving unused. */}
      <div className="border-t border-white/10">
        <Container className="py-6">
          <h3 className="text-ui font-semibold uppercase tracking-wide text-white/55">
            Appliance delivery near you
          </h3>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {SERVICE_LOCATIONS.map((location) => (
              <li key={location.slug}>
                <Link
                  href={`/appliances/${location.slug}`}
                  className="text-[14px] text-white/70 transition-colors hover:text-white"
                >
                  {location.name}, {location.state}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </div>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-white/50">
            © {year} {siteConfig.legalName}. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {FOOTER_LEGAL_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[13px] text-white/50 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </footer>
  );
}
