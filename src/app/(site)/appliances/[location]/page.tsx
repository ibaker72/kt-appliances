import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MapPin, Truck } from "lucide-react";

import { InventoryEmptyState, InventoryGrid } from "@/components/inventory/inventory-grid";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { LeadForm } from "@/components/forms/lead-form";
import { ContactCta } from "@/components/shared/contact-cta";
import { FaqSection } from "@/components/shared/faq-section";
import { PageHeader } from "@/components/shared/page-header";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { getCategoryCounts, queryInventory } from "@/lib/inventory/repository";
import { CATEGORY_LIST } from "@/lib/inventory/types";
import { SERVICE_LOCATIONS, getLocation, locationFaqs } from "@/lib/content/locations";
import { CORE_FAQS } from "@/lib/content/faq";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const revalidate = 600;
export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICE_LOCATIONS.map((location) => ({ location: location.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const { location: slug } = await params;
  const location = getLocation(slug);
  if (!location) return pageMetadata({ title: "Not found", description: "", path: `/appliances/${slug}`, noindex: true });

  return pageMetadata({
    title: `Appliances in ${location.name}, ${location.state}`,
    description: `Scratch & dent refrigerators, washers, dryers, ranges and dishwashers delivered to ${location.name}, ${location.state} from the KT Appliances warehouse in ${siteConfig.address.city}. ${location.distance}. Delivery, installation, haul-away and warranty options available.`,
    path: `/appliances/${location.slug}`,
  });
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location: slug } = await params;
  const location = getLocation(slug);
  if (!location) notFound();

  const [inventory, counts] = await Promise.all([
    queryInventory({ statuses: ["available"], limit: 8, sort: "newest" }),
    getCategoryCounts(),
  ]);

  // Location FAQs first (unique to this page), then the shared answers that
  // matter most to someone deciding whether to drive out.
  const faqs = [...locationFaqs(location), CORE_FAQS[8], CORE_FAQS[3], CORE_FAQS[10]];

  return (
    <>
      <PageHeader
        eyebrow={`${location.county} · ${location.state}`}
        title={
          <>
            Appliances in
            <br />
            {location.name}, {location.state}
          </>
        }
        description={location.intro}
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
          </>
        }
      />

      {/* Delivery + local specifics */}
      <Section tone="white" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="eyebrow flex items-center gap-2 text-brand-500">
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
            </div>

            <div>
              <p className="eyebrow flex items-center gap-2 text-brand-500">
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
            </div>
          </div>

          {/* Warehouse facts block */}
          <dl className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Warehouse", `${siteConfig.address.street}, ${siteConfig.address.city}`],
              ["Distance", location.distance],
              ["ZIP codes served", location.zips.join(", ")],
              ["Warehouse hours", `Daily ${siteConfig.hours.regular.label}`],
            ].map(([label, value]) => (
              <div key={label} className="bg-white p-5">
                <dt className="eyebrow text-ink-500">{label}</dt>
                <dd className="mt-2 font-display text-[15px] font-bold leading-snug text-ink-950">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      {/* Categories available */}
      <Section tone="bone" size="md">
        <Container>
          <SectionHeading
            eyebrow="Available to you"
            title={`What ${location.name} customers can buy`}
            description={`The entire warehouse inventory is available for delivery to ${location.name} or for pickup in ${siteConfig.address.city}.`}
            action={
              <Link href="/inventory" className={buttonStyles("outline", "md")}>
                All inventory
                <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
              </Link>
            }
          />
          <ul className="mt-9 flex flex-wrap gap-2.5">
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

          <div className="mt-10">
            {inventory.items.length > 0 ? (
              <InventoryGrid appliances={inventory.items} columns={4} />
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
              <SectionHeading
                eyebrow={`${location.name} delivery`}
                title="Get a delivery price"
                description={`Send your ZIP code and what you're looking for. We'll come back with delivery cost to ${location.name} and whether same-day is realistic.`}
              />
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

      <ContactCta
        title={`Serving ${location.name} from East Stroudsburg`}
        message={`Hi ${siteConfig.name}, I'm in ${location.name}, ${location.state}. Can you quote delivery?`}
        description="Text or call the warehouse. We'll tell you what's in stock, what it costs to get to you, and when we can have it there."
        context={`location-${location.slug}-footer`}
      />
    </>
  );
}
