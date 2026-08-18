import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MapPin, Route, Truck } from "lucide-react";

import { InventoryEmptyState, InventoryGrid } from "@/components/inventory/inventory-grid";
import { ProductCard } from "@/components/inventory/product-card";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { LeadForm } from "@/components/forms/lead-form";
import { ContactCta } from "@/components/shared/contact-cta";
import { FaqSection } from "@/components/shared/faq-section";
import { PageHeader } from "@/components/shared/page-header";
import { FactGrid, QuickAnswerBand } from "@/components/shared/quick-answer";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { Rail } from "@/components/ui/rail";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { getCategoryCounts, queryInventory } from "@/lib/inventory/repository";
import { CATEGORIES, CATEGORY_LIST, type Appliance, type ApplianceCategory } from "@/lib/inventory/types";
import {
  SERVICE_LOCATIONS,
  getLocation,
  locationFaqs,
  nearbyLocations,
  type ServiceLocation,
} from "@/lib/content/locations";
import { CORE_FAQS } from "@/lib/content/faq";
import { isIndexable, locationTitle } from "@/lib/seo/location-quality";
import { itemListSchema, locationServiceSchema } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const revalidate = 600;
export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICE_LOCATIONS.map((location) => ({ location: location.slug }));
}

/** Fallback description when a location does not author its own. */
function locationDescription(location: ServiceLocation): string {
  return (
    location.seo?.description ??
    `Scratch & dent refrigerators, washers, dryers, ranges and dishwashers delivered to ${location.name}, ${location.state} (${location.zips.join(", ")}) from the KT Appliances warehouse in ${siteConfig.address.city}. ${location.distance}. Delivery, installation, haul-away and warranty options available.`
  ).slice(0, 300);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const { location: slug } = await params;
  const location = getLocation(slug);
  if (!location) {
    return pageMetadata({ title: "Not found", description: "", path: `/appliances/${slug}`, noindex: true });
  }

  return pageMetadata({
    title: locationTitle(location),
    description: locationDescription(location),
    path: `/appliances/${location.slug}`,
    // A record that has not cleared the content bar still renders — anyone with
    // the link gets a working page — but it does not enter the index. This is
    // the one line that stops "add a town, get a doorway page".
    noindex: !isIndexable(location),
  });
}

/**
 * Inventory shown on a location page.
 *
 * The categories a town asks for most lead, each as its own labelled rail with a
 * real count and a link into the category, and the rest of the floor follows.
 * The units are the warehouse's actual stock — there is one warehouse, so
 * pretending a town has its own inventory would be a lie, and dressing the same
 * grid up under a town name would be the thin page this whole system exists to
 * avoid. What is genuinely local is the delivery, the access and the buying
 * context; those are what the page is built around.
 */
async function locationInventory(location: ServiceLocation) {
  const demand = (location.categoryDemand ?? []).slice(0, 3);

  const [rails, floor, counts] = await Promise.all([
    Promise.all(
      demand.map(async (category) => ({
        category,
        items: (await queryInventory({ category, statuses: ["available"], limit: 8, sort: "featured" }))
          .items,
      })),
    ),
    queryInventory({ statuses: ["available"], limit: 8, sort: "newest" }),
    getCategoryCounts(),
  ]);

  return {
    rails: rails.filter((rail) => rail.items.length > 0),
    floor: floor.items,
    counts,
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location: slug } = await params;
  const location = getLocation(slug);
  if (!location) notFound();

  const { rails, floor, counts } = await locationInventory(location);
  const nearby = nearbyLocations(location);
  const faqs = [...locationFaqs(location), CORE_FAQS[3], CORE_FAQS[10]];

  // The units named in ItemList are the ones rendered below it, in order.
  const listed: Appliance[] = [...rails.flatMap((rail) => rail.items), ...floor].filter(
    (item, index, all) => all.findIndex((entry) => entry.id === item.id) === index,
  );

  const context = [
    ...(location.housingContext ?? []),
    ...(location.landmarks ?? []),
  ];

  return (
    <>
      <JsonLd
        data={
          listed.length > 0
            ? [
                locationServiceSchema(location),
                itemListSchema(listed, `Appliances available to ${location.name}, ${location.state}`),
              ]
            : locationServiceSchema(location)
        }
      />

      <PageHeader
        title={
          <>
            Appliances Delivered to
            <br />
            {location.name}, {location.state}
          </>
        }
        description={`${location.county}, ${location.state}. ${location.intro}`}
        crumbs={[
          { name: "Service Areas", path: "/service-areas" },
          { name: `${location.name}, ${location.state}`, path: `/appliances/${location.slug}` },
        ]}
        actions={
          <>
            <Link href="/inventory" className={buttonStyles("primary", "lg")}>
              Shop Current Inventory
              <ArrowRight aria-hidden className="size-4" strokeWidth={2.5} />
            </Link>
            <TextLink
              context={`location-${location.slug}`}
              message={`Hi ${siteConfig.name}, I'm in ${location.name}, ${location.state}. Can you quote delivery?`}
              className={buttonStyles("outlineLight", "lg")}
            >
              Text About Delivery
            </TextLink>
            <CallLink context={`location-${location.slug}-header`} className={buttonStyles("outlineLight", "lg")}>
              Call {siteConfig.phone.display}
            </CallLink>
          </>
        }
      />

      {/* The direct answer, before any positioning copy. */}
      <QuickAnswerBand
        question={`Does KT Appliances deliver to ${location.name}, ${location.state}?`}
        answer={location.quickAnswer}
      >
        <FactGrid
          facts={[
            ["Warehouse", `${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state}`],
            ["Distance", location.distance],
            ["ZIP codes served", location.zips.join(", ")],
            ["Warehouse hours", `Daily ${siteConfig.hours.regular.label}`],
          ].map(([label, value]) => ({ label, value }))}
        />
      </QuickAnswerBand>

      {/* Delivery + local specifics */}
      <Section tone="white" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-ui font-semibold uppercase tracking-wide flex items-center gap-2 text-brand-500">
                <Truck aria-hidden className="size-3.5" strokeWidth={2.5} />
                Delivery &amp; pickup
              </p>
              <h2 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.025em] text-ink-950 sm:text-3xl">
                Getting an appliance to {location.name}
              </h2>
              <ul className="mt-6 border-t border-line">
                {location.logistics.map((point) => (
                  <li key={point} className="flex gap-3.5 border-b border-line py-4">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 bg-brand-500" />
                    <p className="text-[15px] leading-relaxed text-ink-700">{point}</p>
                  </li>
                ))}
              </ul>

              {location.deliveryNotes?.length ? (
                <div className="mt-8 border border-line bg-bone-50 p-5">
                  <h3 className="font-display text-[15px] font-bold text-ink-950">
                    Before you book a delivery day
                  </h3>
                  <ul className="mt-3 space-y-2.5">
                    {location.deliveryNotes.map((note) => (
                      <li key={note} className="flex gap-2.5 text-[14.5px] leading-relaxed text-ink-700">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 bg-ink-300" />
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[14.5px]">
                <Link href="/delivery-installation" className="font-semibold text-ink-800 underline underline-offset-4 hover:text-brand-500">
                  How delivery &amp; installation work
                </Link>
                <Link href="/warranty" className="font-semibold text-ink-800 underline underline-offset-4 hover:text-brand-500">
                  Warranty options
                </Link>
                <Link href="/financing" className="font-semibold text-ink-800 underline underline-offset-4 hover:text-brand-500">
                  Financing
                </Link>
              </div>
            </div>

            <div>
              <p className="text-ui font-semibold uppercase tracking-wide flex items-center gap-2 text-brand-500">
                <MapPin aria-hidden className="size-3.5" strokeWidth={2.5} />
                Worth knowing locally
              </p>
              <h2 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.025em] text-ink-950 sm:text-3xl">
                What tends to matter around {location.name}
              </h2>
              <ul className="mt-6 border-t border-line">
                {location.localNotes.map((note) => (
                  <li key={note} className="flex gap-3.5 border-b border-line py-4">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 bg-ink-300" />
                    <p className="text-[15px] leading-relaxed text-ink-700">{note}</p>
                  </li>
                ))}
              </ul>

              {context.length > 0 ? (
                <>
                  <h3 className="mt-8 flex items-center gap-2 font-display text-[15px] font-bold text-ink-950">
                    <Route aria-hidden className="size-4 text-ink-400" strokeWidth={2.5} />
                    Access and housing around {location.name}
                  </h3>
                  <ul className="mt-3 space-y-2.5">
                    {context.map((note) => (
                      <li key={note} className="flex gap-2.5 text-[14.5px] leading-relaxed text-ink-700">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 bg-ink-300" />
                        {note}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        </Container>
      </Section>

      {/* Categories, then the units themselves */}
      <Section tone="bone" size="md">
        <Container>
          <ModuleHeader
            title={`What ${location.name} customers can buy`}
            href="/inventory"
            hrefLabel="All inventory"
          />
          <p className="max-w-2xl text-[15px] leading-relaxed text-ink-600">
            One warehouse, one floor — everything below is real stock in{" "}
            {siteConfig.address.city} available for delivery to {location.name} or pickup at the
            warehouse. Counts are live.
          </p>

          <ul className="mt-7 flex flex-wrap gap-2.5">
            {CATEGORY_LIST.map((category) => (
              <li key={category.slug}>
                <Link
                  href={category.path}
                  className="inline-flex min-h-11 items-center border border-line bg-white px-4 py-2 text-[14.5px] font-medium text-ink-800 transition-colors hover:border-ink-950 hover:text-brand-500"
                >
                  {category.name}
                  {counts[category.slug] ? (
                    <span className="ml-2 text-[12.5px] text-ink-400 tnum">{counts[category.slug]}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          {rails.map((rail) => (
            <CategoryRailSection
              key={rail.category}
              category={rail.category}
              items={rail.items}
              count={counts[rail.category] ?? rail.items.length}
              locationName={location.name}
            />
          ))}

          <div className="mt-12">
            <ModuleHeader title="Just arrived at the warehouse" href="/inventory?sort=newest" />
            {floor.length > 0 ? (
              <InventoryGrid appliances={floor} columns={4} />
            ) : (
              <InventoryEmptyState
                title="Nothing listed on the site right now"
                description={`New inventory arrives regularly. Call or text us and we'll tell you what's on the floor and what delivery to ${location.name} would cost.`}
              />
            )}
          </div>
        </Container>
      </Section>

      {/* Local quote + FAQ */}
      <Section tone="white" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-5">
              <ModuleHeader title="Get a delivery price" />
              <p className="text-[15px] leading-relaxed text-ink-600">
                Send your ZIP code and what you&apos;re looking for. We&apos;ll come back with
                delivery cost to {location.name} and whether same-day is realistic.
              </p>
              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                <CallLink
                  context={`location-${location.slug}`}
                  className={buttonStyles("dark", "md")}
                >
                  Call {siteConfig.phone.display}
                </CallLink>
                <Link href="/service-areas" className={buttonStyles("outline", "md")}>
                  All service areas
                </Link>
              </div>
              <div className="mt-10">
                <FaqSection entries={faqs} />
              </div>
            </div>

            <div className="min-w-0 lg:col-span-7">
              <div className="border border-line bg-bone-50 p-6 sm:p-8">
                <LeadForm
                  inquiryType="delivery"
                  formLocation={`location:${location.slug}`}
                  title={`Delivery to ${location.name}`}
                  description="No obligation — we'll text or call you back with pricing."
                  submitLabel="Request Delivery Quote"
                  zipRequired
                  messageLabel="What are you looking for?"
                  defaultMessage={`I'm in ${location.name}, ${location.state}.`}
                />
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Lateral links between neighbouring service areas, not a link dump */}
      {nearby.length > 0 ? (
        <Section tone="flat" size="sm">
          <Container>
            <h2 className="text-ui font-semibold uppercase tracking-wide text-ink-500">
              We deliver nearby too
            </h2>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {nearby.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/appliances/${entry.slug}`}
                    className="inline-flex min-h-11 items-center gap-2 border border-line bg-white px-4 py-2 text-[14px] font-medium text-ink-800 transition-colors hover:border-ink-950 hover:text-brand-500"
                  >
                    {entry.name}, {entry.state}
                    <span className="text-[12.5px] text-ink-400">{entry.distance}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <ContactCta
        title={`Serving ${location.name} from ${siteConfig.address.city}`}
        message={`Hi ${siteConfig.name}, I'm in ${location.name}, ${location.state}. Can you quote delivery?`}
        description="Text or call the warehouse. We'll tell you what's in stock, what it costs to get to you, and when we can have it there."
        context={`location-${location.slug}-footer`}
      />
    </>
  );
}

/** One demand category, as a labelled rail that links into the category page. */
function CategoryRailSection({
  category,
  items,
  count,
  locationName,
}: {
  category: ApplianceCategory;
  items: Appliance[];
  count: number;
  locationName: string;
}) {
  const definition = CATEGORIES[category];
  return (
    <div className="mt-12">
      <ModuleHeader
        title={`${definition.name} for ${locationName}`}
        href={definition.path}
        hrefLabel={count > 0 ? `All ${count} ${definition.name.toLowerCase()}` : `All ${definition.name.toLowerCase()}`}
      />
      <Rail label={`${definition.name} available now`}>
        {items.map((item) => (
          <ProductCard key={item.id} appliance={item} sizes="240px" />
        ))}
      </Rail>
    </div>
  );
}
