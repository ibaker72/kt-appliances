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
import { Section, SectionHeading } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { HOME_FAQS } from "@/lib/content/faq";
import {
  getCategoryCounts,
  getInventoryFacets,
  getRecentlySold,
  queryInventory,
} from "@/lib/inventory/repository";
import { quickLinksFor } from "@/lib/navigation";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

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
  const quickLinks = quickLinksFor(facets);

  return (
    <>
      <SearchBand quickLinks={quickLinks} availableCount={totalAvailable} />
      <HeroRetail featured={heroUnit} />
      <TrustStrip />

      {/* Category merchandising */}
      <Section tone="bone" size="md">
        <Container>
          <SectionHeading
            eyebrow="Shop by category"
            title="Find the appliance you need"
            description="Pick a category to see what's currently available in the warehouse, with the condition and price on every listing."
            action={
              <Link href="/inventory" className={buttonStyles("outline", "md")}>
                View All Inventory
                <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
              </Link>
            }
          />
          <div className="mt-10">
            <CategoryGrid counts={counts} />
          </div>
        </Container>
      </Section>

      {/* Live inventory — the centrepiece of the page */}
      <Section tone="white" size="md" id="inventory">
        <Container>
          <SectionHeading
            eyebrow="Live inventory"
            title="What's on the warehouse floor"
            description="Refrigerators, laundry, cooking and dishwashers from name brands. Every listing shows the condition, what was tested, and the current price."
            action={
              <Link href="/inventory" className={buttonStyles("primary", "md")}>
                View All Inventory
                <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
              </Link>
            }
          />

          <div className="mt-10">
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
            <SectionHeading
              eyebrow="Today's warehouse deals"
              title="Big brands. Real savings."
              description="Limited warehouse inventory. These units have a verified retail price on record, so the saving shown is the difference against that price — not an estimate."
              action={
                <Link href="/inventory?deals=1&sort=savings" className={buttonStyles("primary", "md")}>
                  Shop All Deals
                  <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
                </Link>
              }
            />
            <div className="mt-10">
              <InventoryGrid appliances={deals.items} columns={4} />
            </div>
          </Container>
        </Section>
      ) : null}

      {/* Why scratch & dent — the objection that decides the sale */}
      <Section tone="ink" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-5">
              <SectionHeading
                tone="light"
                eyebrow="Why it costs less"
                title={
                  <>
                    Cosmetic damage.
                    <br />
                    Not broken appliances.
                  </>
                }
                description="A scratch & dent appliance is a working unit with a mark on it — usually from shipping, a warehouse, or a showroom floor. The retailer can't sell it at full price. You get the same machine for less."
              />
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
          <SectionHeading
            tone="light"
            eyebrow="After the sale"
            title="More than just the appliance"
            description="Buying the appliance is one part of it. Here's how the rest works."
            action={
              <Link href="/delivery-installation" className={buttonStyles("white", "md")}>
                Ask About Delivery
                <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
              </Link>
            }
          />
          <div className="mt-10">
            <ServiceCards />
          </div>
        </Container>
      </Section>

      {/* Why KT */}
      <Section tone="white" size="md">
        <Container>
          <SectionHeading
            eyebrow="Why shop KT Appliances?"
            title="A warehouse you can walk into"
            description={`Independent, local, and specific about what we sell. Serving ${siteConfig.serviceStates.join(", ")} from one warehouse in ${siteConfig.address.city}.`}
          />
          <div className="mt-10">
            <WhyKt brands={facets.brands} />
          </div>
        </Container>
      </Section>

      {/* Location + FAQ */}
      <Section tone="bone" size="md">
        <Container>
          <SectionHeading
            eyebrow="Your local appliance warehouse"
            title="109 Burson St, East Stroudsburg"
            description={`Walk in during regular hours or book an after-hours appointment. We're a short drive from Stroudsburg, Bartonsville and Mount Pocono, and we serve ${siteConfig.serviceStates.join(", ")}.`}
          />
          <div className="mt-10">
            <WarehousePanel />
          </div>

          <div className="mt-16 grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-4">
              <SectionHeading eyebrow="Common questions" title="Before you buy" />
              <p className="mt-5 text-[15px] leading-relaxed text-ink-600">
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
