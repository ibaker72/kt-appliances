import Link from "next/link";
import { ArrowRight, MapPin, Package, Truck } from "lucide-react";

import { CallLink, TextLink } from "@/components/contact/contact-links";
import { ContactCta } from "@/components/shared/contact-cta";
import { FaqSection } from "@/components/shared/faq-section";
import { PageHeader } from "@/components/shared/page-header";
import { FactGrid, QuickAnswerBand } from "@/components/shared/quick-answer";
import { WarehousePanel } from "@/components/shared/warehouse-panel";
import { Container } from "@/components/ui/container";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { locationsByDistance, servedZips } from "@/lib/content/locations";
import { CORE_FAQS } from "@/lib/content/faq";
import { CATEGORY_LIST } from "@/lib/inventory/types";
import { indexableLocations } from "@/lib/seo/location-quality";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata = pageMetadata({
  title: "Appliance Delivery Areas Near East Stroudsburg, PA",
  description:
    "KT Appliances delivers refrigerators, washers, dryers, ranges and dishwashers from its East Stroudsburg, PA warehouse across Monroe County and the Poconos. See distance, ZIP coverage and delivery detail for each town, or send your ZIP for a quote.",
  path: "/service-areas",
});

/** The direct answer this page exists to give, reused in its FAQ schema. */
const COVERAGE_ANSWER = `KT Appliances delivers from one warehouse at ${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state} ${siteConfig.address.postalCode}. Monroe County and the surrounding Pocono towns are the routes we run most often and each has its own page below; beyond those we quote by address rather than publish a page for every town, and warehouse pickup is available to everyone regardless of where you live.`;

const AREA_FAQS = [
  {
    question: "How do I find out if KT Appliances delivers to my ZIP code?",
    answer: `Text or call ${siteConfig.phone.display} with your ZIP code and the appliance you want. Delivery is quoted per order rather than by a published zone map, because the price depends on distance from the ${siteConfig.address.city} warehouse, the appliance, whether stairs are involved and whether you need installation or haul-away.`,
  },
  {
    question: "Is there a delivery charge, and how is it calculated?",
    answer: `Yes, delivery is charged and quoted per order. The cost depends on the distance from the warehouse, the appliance itself, the access at your address, and whether you are adding installation or old-appliance haul-away. There is no flat rate, and there is no charge at all if you pick the unit up at the warehouse yourself.`,
  },
  {
    question: "Can I pick up an appliance instead of paying for delivery?",
    answer: `Yes. Warehouse pickup is available at ${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state} every day ${siteConfig.hours.regular.label}, and after hours by appointment. Bring straps and moving blankets and measure your vehicle first — a full-size refrigerator does not fit in most SUVs.`,
  },
  CORE_FAQS[5],
  CORE_FAQS[6],
  CORE_FAQS[11],
];

export default function ServiceAreasPage() {
  // The hub links only to pages that clear the content bar, so it can never
  // become the index of a set of thin pages.
  const published = new Set(indexableLocations().map((location) => location.slug));
  const locations = locationsByDistance().filter((location) => published.has(location.slug));
  const zips = servedZips();

  return (
    <>
      <PageHeader
        title={
          <>
            Appliance delivery
            <br />
            across the Poconos
          </>
        }
        description={`The warehouse is at ${siteConfig.address.oneLine}. Delivery is most straightforward across Monroe County and the surrounding Poconos, and we deliver into ${siteConfig.serviceStates.slice(1).join(" and ")} depending on distance and the order. Warehouse pickup is available to everyone, any day.`}
        crumbs={[{ name: "Service Areas", path: "/service-areas" }]}
        actions={
          <>
            <TextLink
              context="service-areas-header"
              message={`Hi ${siteConfig.name}, can you deliver to my area? My ZIP code is `}
              className={buttonStyles("primary", "lg")}
            >
              Text Us Your ZIP
            </TextLink>
            <CallLink context="service-areas-header" className={buttonStyles("outlineLight", "lg")}>
              Call {siteConfig.phone.display}
            </CallLink>
          </>
        }
      />

      <QuickAnswerBand
        question="Where does KT Appliances deliver appliances?"
        answer={COVERAGE_ANSWER}
      >
        <FactGrid
          facts={[
            { label: "Warehouse", value: `${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state}` },
            { label: "Service areas with a page", value: `${locations.length} towns in Monroe County` },
            { label: "ZIP codes covered by those pages", value: zips.join(", ") },
            { label: "Pickup", value: `Daily ${siteConfig.hours.regular.label}, no delivery charge` },
          ]}
        />
      </QuickAnswerBand>

      <Section tone="white" size="md">
        <Container>
          <ModuleHeader title="Towns we deliver to regularly" />
          <p className="max-w-2xl text-[15px] leading-relaxed text-ink-600">
            Nearest first. Each page covers what delivery looks like from the warehouse to that
            town, the access and housing quirks the crew plans around, and what people there tend
            to be buying.
          </p>

          <ul className="mt-8 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <li key={location.slug} className="bg-white">
                <Link
                  href={`/appliances/${location.slug}`}
                  className="group flex h-full flex-col p-6 transition-colors hover:bg-bone-50 sm:p-7"
                >
                  <p className="text-ui font-semibold uppercase tracking-wide flex items-center gap-2 text-brand-500">
                    <MapPin aria-hidden className="size-3.5" strokeWidth={2.5} />
                    {location.county}
                  </p>
                  <h3 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.025em] text-ink-950">
                    {location.name}, {location.state}
                  </h3>
                  <p className="mt-2 flex items-center gap-2 text-[13px] text-ink-500">
                    <Truck aria-hidden className="size-3.5 text-ink-400" strokeWidth={2.25} />
                    {location.distance}
                  </p>
                  <p className="mt-1 text-[13px] text-ink-500 tnum">ZIP {location.zips.join(", ")}</p>
                  <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-ink-600">
                    {location.summary}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 font-display text-[12px] font-bold uppercase tracking-[0.06em] text-ink-950 transition-colors group-hover:text-brand-500">
                    Delivery to {location.name}
                    <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Honest statement about wider coverage — no fabricated town list */}
          <div className="mt-8 border border-line bg-bone-50 p-6 sm:p-8">
            <h3 className="font-display text-xl font-bold tracking-[-0.02em] text-ink-950">
              Outside these towns?
            </h3>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-600">
              We serve {siteConfig.serviceStates.join(", ")}, and we deliver well beyond the towns
              listed above — including further into the Poconos and across the state lines into New
              Jersey and New York. Rather than publish a page for every town in three states, we
              quote your address directly: send your ZIP code and the appliance you want, and you
              will get a real delivery price. Warehouse pickup is always available regardless of
              where you are.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TextLink
                context="service-areas-outside"
                message={`Hi ${siteConfig.name}, can you deliver to my area? My ZIP code is `}
                className={buttonStyles("dark", "md")}
              >
                Text us your ZIP code
              </TextLink>
              <Link href="/delivery-installation#quote" className={buttonStyles("outline", "md")}>
                Request a delivery quote
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* Delivery vs pickup, stated plainly rather than assumed */}
      <Section tone="bone" size="md">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="border border-line bg-white p-6 sm:p-8">
              <p className="text-ui font-semibold uppercase tracking-wide flex items-center gap-2 text-brand-500">
                <Truck aria-hidden className="size-3.5" strokeWidth={2.5} />
                Delivery
              </p>
              <h2 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.025em] text-ink-950">
                We bring it to you
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
                Delivery is quoted per order — distance from the warehouse, the appliance, the
                access at your address, and whether you are adding installation or haul-away.
                Same-day may be available on the shorter runs depending on the route and what is in
                stock; it is never promised until we have looked at the day.
              </p>
              <Link href="/delivery-installation" className={buttonStyles("dark", "md", "mt-6")}>
                How delivery works
              </Link>
            </div>

            <div className="border border-line bg-white p-6 sm:p-8">
              <p className="text-ui font-semibold uppercase tracking-wide flex items-center gap-2 text-brand-500">
                <Package aria-hidden className="size-3.5" strokeWidth={2.5} />
                Pickup
              </p>
              <h2 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.025em] text-ink-950">
                Or collect it yourself
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
                Pickup at {siteConfig.address.street} costs nothing and is usually the fastest way
                to get an in-stock unit. Call or text ahead so it is pulled and ready, bring straps
                and blankets, and measure your vehicle — a full-size refrigerator does not fit in
                most SUVs.
              </p>
              <Link href="/schedule" className={buttonStyles("outline", "md", "mt-6")}>
                Book a warehouse visit
              </Link>
            </div>
          </div>

          <div className="mt-12">
            <ModuleHeader title="Open to everyone, every day" />
            <WarehousePanel />
          </div>
        </Container>
      </Section>

      {/* Shop-by-category doorway, so the hub feeds the commercial pages */}
      <Section tone="white" size="sm">
        <Container>
          <ModuleHeader
            title="What we deliver"
            href="/inventory"
            hrefLabel="All inventory"
          />
          <ul className="flex flex-wrap gap-2.5">
            {CATEGORY_LIST.map((category) => (
              <li key={category.slug}>
                <Link
                  href={category.path}
                  className="inline-flex min-h-11 items-center border border-line px-4 py-2 text-[14.5px] font-medium text-ink-800 transition-colors hover:border-ink-950 hover:text-brand-500"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section tone="bone" size="md">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-4">
              <ModuleHeader title="Delivery questions" />
            </div>
            <div className="min-w-0 lg:col-span-8">
              <FaqSection entries={AREA_FAQS} />
            </div>
          </div>
        </Container>
      </Section>

      <ContactCta
        title="Not sure if we reach you?"
        message={`Hi ${siteConfig.name}, can you deliver to my area? My ZIP code is `}
        description="Send us your ZIP code. We'll tell you whether we deliver there, what it costs, and whether same-day is realistic."
        context="service-areas-footer"
      />
    </>
  );
}
