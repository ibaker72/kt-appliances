import Link from "next/link";
import { ArrowRight, ClipboardCheck, Tag, Warehouse } from "lucide-react";

import { CategoryGrid } from "@/components/home/category-grid";
import { HeroRetail } from "@/components/home/hero-retail";
import { RecentlySold } from "@/components/home/recently-sold";
import { SearchBand } from "@/components/home/search-band";
import { TrustStrip } from "@/components/home/trust-strip";
import { WhyKt } from "@/components/home/why-kt";
import { InventoryEmptyState, InventoryGrid } from "@/components/inventory/inventory-grid";
import { ContactCta } from "@/components/shared/contact-cta";
import { FaqSection } from "@/components/shared/faq-section";
import { ServiceCards } from "@/components/shared/service-cards";
import { WarehousePanel } from "@/components/shared/warehouse-panel";
import { Container } from "@/components/ui/container";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { HOME_FAQS } from "@/lib/content/faq";
import {
  getCategoryCounts,
  getInventoryFacets,
  getRecentlySold,
  queryInventory,
} from "@/lib/inventory/repository";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Scratch & Dent Appliance Warehouse",
  description:
    "Name-brand scratch & dent refrigerators, washers, dryers, ranges and dishwashers at warehouse prices. Tested and working, with delivery, installation, haul-away, financing and 1-year warranty options. East Stroudsburg, PA — serving PA, NJ and NY.",
  path: "/",
});

export default async function HomePage() {
  // One pass over the catalogue for everything the homepage merchandises.
  const [featured, latest, deals, sold, counts, facets] = await Promise.all([
    queryInventory({ featuredOnly: true, statuses: ["available"], limit: 1, sort: "newest" }),
    queryInventory({ statuses: ["available"], limit: 8, sort: "featured" }),
    // Genuine markdowns only: `dealsOnly` requires a verified comparison price, so
    // this section is empty rather than padded with undiscounted stock.
    queryInventory({ dealsOnly: true, statuses: ["available"], limit: 4, sort: "savings" }),
    getRecentlySold(6),
    getCategoryCounts(),
    getInventoryFacets(),
  ]);

  const heroUnit = featured.items[0] ?? latest.items[0] ?? null;
  const totalAvailable = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <>
      <SearchBand availableCount={totalAvailable} />
      <HeroRetail featured={heroUnit} />
      <TrustStrip />

      {/* Category merchandising */}
      <Section tone="bone" size="md">
        <Container>
          <ModuleHeader title="Shop by category" href="/inventory" hrefLabel="View all inventory" />
          <CategoryGrid counts={counts} />
        </Container>
      </Section>

      {/* Live inventory — the centrepiece of the page */}
      <Section tone="white" size="md" id="inventory">
        <Container>
          <ModuleHeader title="What's on the warehouse floor" href="/inventory" />

          <div>
            {latest.items.length > 0 ? (
              <InventoryGrid appliances={latest.items} columns={4} priorityCount={4} />
            ) : (
              <InventoryEmptyState
                title="New inventory arrives regularly"
                description="Nothing is listed on the site at the moment. Call or text us and we'll tell you exactly what's on the floor today."
              />
            )}
          </div>
        </Container>
      </Section>

      {/* Warehouse deals. Rendered only when real markdowns exist — a "deals"
          section stocked with full-price units would be a lie. */}
      {deals.items.length > 0 ? (
        <Section tone="bone" size="md" id="deals">
          <Container>
            <ModuleHeader
              title="Today's warehouse deals"
              href="/inventory?deals=1&sort=savings"
              hrefLabel="Shop all deals"
            />
            <InventoryGrid appliances={deals.items} columns={4} />
          </Container>
        </Section>
      ) : null}

      {/* Why scratch & dent — the objection that decides the sale */}
      <Section tone="ink" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-5">
              {/* Kept as local markup rather than a shared heading component:
                  `ModuleHeader` is deliberately one dark-on-light line, and this
                  block moves off the homepage to /about in Phase 3 regardless. */}
              <h2 className="font-display text-[1.75rem] font-extrabold leading-[0.98] text-white sm:text-4xl lg:text-[2.75rem]">
                Cosmetic damage.
                <br />
                Not broken appliances.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/75 sm:text-base">
                A scratch &amp; dent appliance is a working unit with a mark on it — usually from
                shipping, a warehouse, or a showroom floor. The retailer can&apos;t sell it at full
                price. You get the same machine for less.
              </p>
              <Link href="/guides/what-does-scratch-and-dent-mean" className={buttonStyles("white", "md", "mt-8")}>
                Read the full explanation
                <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
              </Link>
            </div>

            <div className="min-w-0 lg:col-span-7">
              <ol className="grid gap-px bg-white/12 sm:grid-cols-3">
                {[
                  {
                    icon: Warehouse,
                    step: "01",
                    title: "It arrives marked",
                    copy: "Units come in with dents, scratches or scuffed panels — damage that happened before anyone ever plugged it in.",
                  },
                  {
                    icon: ClipboardCheck,
                    step: "02",
                    title: "We test it",
                    copy: "Every unit is checked for function at the warehouse. What we tested is written on the listing, along with exactly where the damage is.",
                  },
                  {
                    icon: Tag,
                    step: "03",
                    title: "It's priced to move",
                    copy: "The mark comes off the price, not the performance. Warranty, delivery and installation options are available on qualifying units.",
                  },
                ].map(({ icon: Icon, step, title, copy }) => (
                  <li key={step} className="bg-ink-950 p-6 lg:p-7">
                    <div className="flex items-center justify-between">
                      <Icon aria-hidden className="size-6 text-brand-500" strokeWidth={1.9} />
                      <span className="font-display text-[13px] font-bold text-white/25 tnum">{step}</span>
                    </div>
                    <h3 className="mt-5 font-display text-lg font-bold tracking-[-0.02em] text-white">
                      {title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-white/65">{copy}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Container>
      </Section>

      <RecentlySold appliances={sold} />

      {/* Services */}
      <Section tone="ink" size="md">
        <Container>
          {/* Local markup for the same reason as the block above: this is a dark
              band, and it condenses into the services strip in Phase 3. */}
          <div className="flex flex-col gap-5 pb-8 md:flex-row md:items-end md:justify-between">
            <h2 className="font-display text-[1.75rem] font-extrabold leading-[0.98] text-white sm:text-4xl">
              More than just the appliance
            </h2>
            <Link
              href="/delivery-installation"
              className={buttonStyles("white", "md", "shrink-0 self-start md:self-auto")}
            >
              Ask about delivery
              <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
            </Link>
          </div>
          <ServiceCards />
        </Container>
      </Section>

      {/* Why KT */}
      <Section tone="white" size="md">
        <Container>
          <ModuleHeader title="Why shop KT Appliances?" />
          <WhyKt brands={facets.brands} />
        </Container>
      </Section>

      {/* Location + FAQ */}
      <Section tone="bone" size="md">
        <Container>
          <ModuleHeader title="109 Burson St, East Stroudsburg" href="/contact" hrefLabel="Hours & directions" />
          <WarehousePanel />

          <div className="mt-16 grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-4">
              <ModuleHeader title="Before you buy" />
              <p className="text-[15px] leading-relaxed text-ink-600">
                Straight answers about condition, testing, warranty, delivery and financing.
              </p>
              <Link href="/about#faq" className={buttonStyles("outline", "md", "mt-6")}>
                See all questions
              </Link>
            </div>
            <div className="min-w-0 lg:col-span-8">
              <FaqSection entries={HOME_FAQS} />
            </div>
          </div>
        </Container>
      </Section>

      <ContactCta />
    </>
  );
}
