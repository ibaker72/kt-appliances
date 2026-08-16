import Link from "next/link";
import { ArrowRight, MapPin, Phone } from "lucide-react";

import { ProductImage } from "@/components/inventory/product-image";
import { ProductPrice } from "@/components/inventory/product-price";
import { ConditionBadge } from "@/components/inventory/availability-badge";
import { CallLink } from "@/components/contact/contact-links";
import { Container } from "@/components/ui/container";
import { buttonStyles } from "@/components/ui/button";
import { CATEGORY_LIST, type Appliance } from "@/lib/inventory/types";
import { siteConfig } from "@/lib/site-config";

/**
 * Homepage hero.
 *
 * Merchandising-first: the headline states what we sell and why it's cheaper,
 * and the visual half is an actual unit from inventory at an actual price rather
 * than decoration. On mobile the copy and CTAs come first and the deal card
 * follows, so the fold is a call to action instead of an image.
 */
export function HeroRetail({ featured }: { featured: Appliance | null }) {
  return (
    <section className="on-dark relative overflow-hidden bg-ink-950 text-white">
      {/* Subtle warehouse floor rule — structure, not decoration. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "76px 76px",
        }}
      />

      <Container className="relative grid gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:items-center lg:gap-14 lg:py-20">
        <div className="min-w-0 lg:col-span-7">
          <p className="eyebrow flex flex-wrap items-center gap-x-2.5 gap-y-1 text-white/60">
            <MapPin aria-hidden className="size-3.5 text-brand-400" strokeWidth={2.5} />
            {siteConfig.address.city}, {siteConfig.address.state} Warehouse
            <span aria-hidden className="text-white/25">/</span>
            Serving {siteConfig.serviceStatesShort.join(" · ")}
          </p>

          <h1 className="mt-5 font-display text-[2.6rem] font-extrabold leading-[0.92] tracking-[-0.035em] sm:text-6xl lg:text-[4.6rem]">
            Name-Brand Appliances.
            <span className="mt-1 block text-brand-500">Warehouse Prices.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-white/75 sm:text-[17px]">
            Scratch &amp; dent refrigerators, washers, dryers, ranges and dishwashers — tested,
            working, and priced below traditional retail. Pick up in East Stroudsburg or have it
            delivered.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href="/inventory" className={buttonStyles("primary", "lg", "w-full sm:w-auto")}>
              Shop Warehouse Inventory
              <ArrowRight aria-hidden className="size-4" strokeWidth={2.5} />
            </Link>
            <CallLink
              context="hero"
              className={buttonStyles("outlineLight", "lg", "w-full sm:w-auto")}
              aria-label={`Call or text ${siteConfig.phone.display}`}
            >
              <Phone aria-hidden className="size-4" strokeWidth={2.5} />
              Call / Text {siteConfig.phone.display}
            </CallLink>
          </div>

          <Link
            href="/contact"
            className="mt-6 inline-flex items-center gap-2 text-[14.5px] text-white/60 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
          >
            Visit our East Stroudsburg warehouse — open daily {siteConfig.hours.regular.label}
            <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Deal card / category rail */}
        <div className="min-w-0 lg:col-span-5">
          {featured ? <HeroDealCard appliance={featured} /> : <HeroCategoryRail />}
        </div>
      </Container>
    </section>
  );
}

function HeroDealCard({ appliance }: { appliance: Appliance }) {
  return (
    <article className="bg-white text-ink-950 shadow-lift">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p className="eyebrow text-brand-500">On the floor now</p>
        <ConditionBadge condition={appliance.condition} />
      </div>

      <Link href={`/inventory/${appliance.slug}`} className="zoom-frame block overflow-hidden">
        <ProductImage
          appliance={appliance}
          sizes="(min-width: 1024px) 480px, 92vw"
          priority
        />
      </Link>

      <div className="border-t border-line p-5">
        <p className="eyebrow text-ink-500">{appliance.brand}</p>
        <h2 className="mt-1.5 font-display text-xl font-bold leading-tight tracking-[-0.02em]">
          <Link href={`/inventory/${appliance.slug}`} className="hover:text-brand-500">
            {appliance.title}
          </Link>
        </h2>
        {appliance.modelNumber ? (
          <p className="mt-1 text-[12.5px] text-ink-500">
            Model <span className="font-medium text-ink-700 tnum">{appliance.modelNumber}</span>
          </p>
        ) : null}

        <div className="mt-4 border-t border-line pt-4">
          <ProductPrice appliance={appliance} size="md" />
        </div>

        <Link
          href={`/inventory/${appliance.slug}`}
          className={buttonStyles("dark", "md", "mt-5 w-full")}
        >
          View This Appliance
          <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
        </Link>
      </div>
    </article>
  );
}

/** Fallback when nothing is featured — still merchandises, never shows an empty box. */
function HeroCategoryRail() {
  return (
    <div className="border border-white/15 bg-white/[0.04] p-6">
      <p className="eyebrow text-white/55">Shop by category</p>
      <ul className="mt-4 divide-y divide-white/10">
        {CATEGORY_LIST.map((category) => (
          <li key={category.slug}>
            <Link
              href={category.path}
              className="flex items-center justify-between gap-4 py-3.5 transition-colors hover:text-brand-400"
            >
              <span className="font-display text-[17px] font-bold">{category.name}</span>
              <ArrowRight aria-hidden className="size-4 shrink-0 text-white/40" strokeWidth={2.5} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
