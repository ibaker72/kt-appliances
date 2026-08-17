import Link from "next/link";

import { CategoryRail } from "@/components/home/category-rail";
import { PromoCarousel } from "@/components/home/promo-carousel";
import { RecentlySold } from "@/components/home/recently-sold";
import { SearchBand } from "@/components/home/search-band";
import { ServicesStrip } from "@/components/home/services-strip";
import { InventoryEmptyState, InventoryGrid } from "@/components/inventory/inventory-grid";
import { ProductCard } from "@/components/inventory/product-card";
import { FaqSection } from "@/components/shared/faq-section";
import { WarehousePanel } from "@/components/shared/warehouse-panel";
import { Container } from "@/components/ui/container";
import { Rail } from "@/components/ui/rail";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { heroSlidesFor } from "@/lib/content/campaigns";
import { HOME_FAQS } from "@/lib/content/faq";
import { getCachedNavigationMenu } from "@/lib/inventory/navigation-cache";
import { merchandiseHome } from "@/lib/inventory/repository";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Scratch & Dent Appliance Warehouse",
  description:
    "Name-brand scratch & dent refrigerators, washers, dryers, ranges and dishwashers at warehouse prices. Tested and working, with delivery, installation, haul-away, financing and 1-year warranty options. East Stroudsburg, PA — serving PA, NJ and NY.",
  path: "/",
});

/** Rail cards are a fixed 240px, so the image only ever needs that width. */
const RAIL_SIZES = "240px";

export default async function HomePage() {
  // `merchandiseHome` allocates units across the page so nothing appears twice;
  // the cached navigation read supplies the price bands and brand row, so those
  // modules cost no extra query.
  const [home, nav] = await Promise.all([merchandiseHome(), getCachedNavigationMenu()]);

  const slides = heroSlidesFor(home.facets);

  return (
    <>
      {/* 1 — Promo slot, with the two standing offers beside it on desktop. */}
      <section className="border-b border-line">
        <div className="grid lg:grid-cols-[2fr_1fr]">
          <PromoCarousel slides={slides} />
          <div className="grid grid-cols-2 lg:grid-cols-1">
            <PromoTile
              href="/inventory?deals=1&sort=savings"
              title="Today's deals"
              detail="Units marked down from a verified retail price"
            />
            <PromoTile
              href="/financing"
              title="Financing available"
              detail="Buy now, pay later options on your purchase"
            />
          </div>
        </div>
      </section>

      <SearchBand availableCount={home.totalAvailable} />

      {/* 2 — Category doorways. */}
      <Section tone="flat">
        <Container>
          <ModuleHeader title="Shop by category" href="/inventory" hrefLabel="View all inventory" />
          <CategoryRail counts={home.counts} />
        </Container>
      </Section>

      {/*
        3/4 — Product modules.

        A small warehouse floor gets one dense grid of everything rather than
        rails that would show the same unit under three different headings. See
        `merchandiseHome`.
      */}
      {home.compact ? (
        <Section tone="flat" id="inventory">
          <Container>
            <ModuleHeader
              title="On the warehouse floor right now"
              href="/inventory"
              count={home.totalAvailable || undefined}
            />
            {home.everything.length > 0 ? (
              <InventoryGrid appliances={home.everything} columns={4} priorityCount={4} />
            ) : (
              <InventoryEmptyState
                title="New inventory arrives regularly"
                description="Nothing is listed on the site at the moment. Call or text us and we'll tell you exactly what's on the floor today."
              />
            )}
          </Container>
        </Section>
      ) : (
        <>
          {home.deals.length > 0 ? (
            <Section tone="flat" id="deals">
              <Container>
                <ModuleHeader
                  title="Today's warehouse deals"
                  href="/inventory?deals=1&sort=savings"
                  hrefLabel="Shop all deals"
                />
                <Rail label="Today's warehouse deals">
                  {home.deals.map((appliance, index) => (
                    <ProductCard
                      key={appliance.id}
                      appliance={appliance}
                      sizes={RAIL_SIZES}
                      priority={index < 4}
                    />
                  ))}
                </Rail>
              </Container>
            </Section>
          ) : null}

          {home.newArrivals.length > 0 ? (
            <Section tone="flat" id="inventory">
              <Container>
                <ModuleHeader title="Just arrived at the warehouse" href="/inventory?sort=newest" />
                <Rail label="Just arrived at the warehouse">
                  {home.newArrivals.map((appliance, index) => (
                    <ProductCard
                      key={appliance.id}
                      appliance={appliance}
                      sizes={RAIL_SIZES}
                      priority={home.deals.length === 0 && index < 4}
                    />
                  ))}
                </Rail>
              </Container>
            </Section>
          ) : null}
        </>
      )}

      {/* 5 — Price bands. Only bands with stock behind them are rendered. */}
      {nav.priceBands.length > 0 ? (
        <Section tone="flat">
          <Container>
            <ModuleHeader title="Shop by price" href="/inventory?sort=price-asc" />
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {nav.priceBands.map((band) => (
                <li key={band.href}>
                  <Link
                    href={band.href}
                    className="flex items-baseline justify-between gap-2 rounded-md border border-line bg-white px-4 py-4 shadow-card transition-shadow hover:shadow-hover"
                  >
                    <span className="font-display text-[17px] font-bold text-ink-950">
                      {band.label}
                    </span>
                    <span className="shrink-0 text-ui text-ink-500 tnum">{band.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      {/* 6 — Brands actually on the floor. */}
      {nav.brands.length > 0 ? (
        <Section tone="flat">
          <Container>
            <ModuleHeader title="Shop by brand" href="/inventory?sort=brand" />
            <ul className="flex flex-wrap gap-2">
              {nav.brands.map((brand) => (
                <li key={brand.href}>
                  <Link
                    href={brand.href}
                    className="flex items-center gap-2 rounded-sm border border-line bg-white px-4 py-2.5 transition-colors hover:border-ink-950"
                  >
                    <span className="font-display text-[15px] font-bold uppercase tracking-[0.02em] text-ink-900">
                      {brand.label}
                    </span>
                    <span className="text-ui text-ink-400 tnum">{brand.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      {/* 7 — Services. */}
      <ServicesStrip />

      {/* 8 — Recently sold. */}
      <RecentlySold appliances={home.recentlySold} />

      {/* 9 — Visit us. */}
      <Section tone="flat">
        <Container>
          <ModuleHeader
            title="109 Burson St, East Stroudsburg"
            href="/contact"
            hrefLabel="Hours & directions"
          />
          <WarehousePanel />
        </Container>
      </Section>

      {/* 10 — A short FAQ; the full set lives on /about. */}
      <Section tone="bone">
        <Container>
          <ModuleHeader title="Before you buy" href="/about#faq" hrefLabel="All questions" />
          <FaqSection entries={HOME_FAQS.slice(0, 5)} />
        </Container>
      </Section>
    </>
  );
}

/** Standing offer beside the carousel. Both link to a page that proves the claim. */
function PromoTile({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-center gap-1 border-t border-line bg-white p-5 first:border-t-0 lg:border-l"
    >
      <span className="font-display text-[19px] font-bold leading-tight text-ink-950 group-hover:text-brand-500">
        {title}
      </span>
      <span className="text-ui leading-snug text-ink-600">{detail}</span>
      <span className={buttonStyles("link", "sm", "mt-1 justify-start p-0")}>Shop now ›</span>
    </Link>
  );
}
