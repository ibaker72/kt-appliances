import Link from "next/link";
import { ArrowRight, ClipboardCheck, Eye, MapPin, PhoneCall } from "lucide-react";

import { ContactCta } from "@/components/shared/contact-cta";
import { Photo } from "@/components/media/photo";
import { getPhoto } from "@/lib/media/manifest";
import { FaqSection } from "@/components/shared/faq-section";
import { PageHeader } from "@/components/shared/page-header";
import { WarehousePanel } from "@/components/shared/warehouse-panel";
import { WhyKt } from "@/components/home/why-kt";
import { CallLink } from "@/components/contact/contact-links";
import { Container } from "@/components/ui/container";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { FactGrid } from "@/components/shared/quick-answer";
import { CORE_FAQS } from "@/lib/content/faq";
import { getCachedNavigationMenu } from "@/lib/inventory/navigation-cache";
import { indexableLocations } from "@/lib/seo/location-quality";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "About KT Appliances",
  description:
    "KT Appliances is a scratch & dent appliance warehouse at 109 Burson St in East Stroudsburg, PA. We test appliances before listing them, describe the damage honestly, and price below traditional retail. Serving PA, NJ and NY.",
  path: "/about",
});

/**
 * About page.
 *
 * Founding year and family ownership come from the company logo, so they are
 * stated. Employee count, customer count and sales figures still are not — none
 * of that has been supplied, and inventing it is exactly the kind of thing that
 * makes a site read as fake. Everything else here is verifiable: where the
 * warehouse is, how units are handled, and how buying works.
 */

const PRINCIPLES = [
  {
    icon: Eye,
    title: "The damage is described, not hidden",
    body: "Every listing says where the cosmetic damage is and what it looks like — a dent on the left panel, a scratch across the door. If you want to see it before you drive out, text us and we will send photos of the actual unit.",
  },
  {
    icon: ClipboardCheck,
    title: "It gets tested before it gets listed",
    body: "Appliances are checked for function at the warehouse. Washers get a cycle, dryers get checked for heat and tumble, refrigerators get checked for cooling. What was tested is written on the listing.",
  },
  {
    icon: PhoneCall,
    title: "You talk to the warehouse, not a call centre",
    body: "Call or text the number on this site and you reach the people who have the appliance in front of them. If you want to know whether a specific unit fits your space, that is answerable in a couple of messages.",
  },
  {
    icon: MapPin,
    title: "There is a real building you can walk into",
    body: `The warehouse is at ${siteConfig.address.street} in ${siteConfig.address.city}. Come look at the unit in person before you buy it — that is the point of buying local instead of ordering a photo online.`,
  },
];

export default async function AboutPage() {
  // Already cached for the header, so this costs nothing extra.
  const { facets } = await getCachedNavigationMenu();
  const serviceAreaCount = indexableLocations().length;
  // Interior shots render as a pair above the visit panel; checked here so an
  // empty pair leaves no stray grid gap behind.
  const interiors = (["store.interior-a", "store.interior-b"] as const).filter(
    (key) => getPhoto(key) !== null,
  );

  return (
    <>
      <PageHeader
        title={
          <>
            A warehouse, not
            <br />a showroom markup
          </>
        }
        description={`KT Appliances is a scratch & dent appliance warehouse in ${siteConfig.address.city}, ${siteConfig.address.state}. We buy name-brand appliances that have cosmetic damage — dents, scratches, scuffed panels — test them, describe exactly what is wrong with the outside, and sell them for less than the same model costs at a traditional retailer.`}
        crumbs={[{ name: "About", path: "/about" }]}
        actions={
          <>
            <Link href="/inventory" className={buttonStyles("primary", "lg")}>
              Shop Inventory
              <ArrowRight aria-hidden className="size-4" strokeWidth={2.5} />
            </Link>
            <CallLink context="about-header" className={buttonStyles("outlineLight", "lg")}>
              Call {siteConfig.phone.display}
            </CallLink>
          </>
        }
      />

      <Section tone="white" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-5">
              <ModuleHeader title="Appliances are expensive. Dents are not." />
              <p className="mb-4 inline-flex items-center rounded-pill border border-gold-600/40 bg-gold-50 px-3 py-1 text-ui font-semibold text-gold-600">
                {siteConfig.brand.ownership}
              </p>
              {/* "Family owned" is a claim in the logo ribbon; a face on the
                  floor is what makes it real. Nothing renders until the photo
                  has actually been taken. */}
              <Photo
                mediaKey="people.team"
                sizes="(min-width: 1024px) 440px, 100vw"
                fit="cover"
                className="mt-2 aspect-[4/3] w-full"
              />
            </div>
            <div className="min-w-0 lg:col-span-7">
              <div className="space-y-5 text-[16px] leading-relaxed text-ink-700">
                <p>
                  A refrigerator that picks up a dent on a loading dock is worth thousands less than
                  the identical refrigerator that did not. Nothing about how it runs has changed. The
                  retailer just cannot put a marked unit on a showroom floor next to a perfect one
                  and ask full price for it.
                </p>
                <p>
                  That is the entire business. We take those units, verify they work, write down
                  where the damage is, and price them so that people replacing a broken appliance —
                  usually on short notice and usually not on a good week — can get a name-brand
                  machine without financing a showroom experience.
                </p>
                <p>
                  It only works if the condition information is accurate. A customer who drives out
                  to {siteConfig.address.city} and finds damage we did not mention is a customer we
                  have lost, and around here word travels. So the listings say what is wrong with the
                  unit, and we would rather talk you out of an appliance that does not fit your space
                  than sell it to you twice.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/*
        The entity block.

        One paragraph that states what this business is, where it is, what it
        sells and how you get it, in plain declarative sentences with no
        marketing verbs — followed by the same facts as a labelled table. This is
        what a search engine or an assistant extracts when it needs to describe
        KT Appliances, and leaving it to infer that from persuasive copy
        elsewhere on the page is how it ends up inventing a detail. Every claim
        here is repeated identically in the LocalBusiness schema, `/llms.txt` and
        the FAQ bank, because inconsistent facts are worse than sparse ones.
      */}
      <Section tone="white" size="md" id="business">
        <Container>
          <ModuleHeader title="KT Appliances, in plain terms" />
          <p className="max-w-3xl text-[16.5px] leading-relaxed text-ink-800">
            {siteConfig.name} is a scratch &amp; dent appliance warehouse at{" "}
            {siteConfig.address.street}, {siteConfig.address.city}, {siteConfig.address.state}{" "}
            {siteConfig.address.postalCode}. It sells name-brand refrigerators, washers, dryers,
            matched laundry sets, ranges and ovens, dishwashers, microwaves and freezers — units
            with cosmetic damage, open-box returns and refurbished appliances, each tested for
            function before it is listed and described with the location of its damage. Customers
            shop current stock online, then either collect at the warehouse or arrange delivery
            across {siteConfig.serviceStates.join(", ")}, with installation, old-appliance haul-away,
            financing options and 1-year warranty options on qualifying units. The business is
            family owned and has traded since {siteConfig.foundedYear}. The phone number is{" "}
            {siteConfig.phone.display}.
          </p>

          <FactGrid
            className="mt-8"
            facts={[
              { label: "Business type", value: "Scratch & dent appliance warehouse" },
              { label: "Address", value: `${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state} ${siteConfig.address.postalCode}` },
              { label: "Phone", value: siteConfig.phone.display },
              { label: "Hours", value: `Daily ${siteConfig.hours.regular.label}` },
              { label: "After hours", value: `${siteConfig.hours.afterHours.label}, by appointment` },
              { label: "States served", value: siteConfig.serviceStates.join(", ") },
              { label: "Service-area pages", value: `${serviceAreaCount} towns in Monroe County, PA` },
              { label: "Family owned since", value: String(siteConfig.foundedYear) },
            ]}
          />
        </Container>
      </Section>

      <Section tone="bone" size="md">
        <Container>
          <ModuleHeader title="What you can expect" />
          <div className="grid gap-px bg-line sm:grid-cols-2">
            {PRINCIPLES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white p-6 sm:p-8">
                <Icon aria-hidden className="size-7 text-brand-500" strokeWidth={1.9} />
                <h3 className="mt-5 font-display text-xl font-bold tracking-[-0.02em] text-ink-950">
                  {title}
                </h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">{body}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Moved off the homepage, where it was copy standing between a shopper and
          the products. On the about page it is what the reader came for. */}
      <Section tone="white" size="md">
        <Container>
          <ModuleHeader title="Why shop KT Appliances?" href="/inventory" hrefLabel="Shop inventory" />
          <WhyKt brands={facets.brands} />
        </Container>
      </Section>

      <Section tone="white" size="md">
        <Container>
          <ModuleHeader title="Come look at it in person" />
          <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-ink-600">
            We are open every day, and after 5 PM by appointment. If you are driving out for a
            specific unit, call or text first so we can have it pulled and ready.
          </p>
          {interiors.length > 0 ? (
            <div
              className={cn(
                "mb-8 grid gap-3",
                interiors.length > 1 ? "sm:grid-cols-2" : "",
              )}
            >
              {interiors.map((key) => (
                <Photo
                  key={key}
                  mediaKey={key}
                  sizes="(min-width: 640px) 50vw, 100vw"
                  fit="cover"
                  className="aspect-[3/2] w-full"
                />
              ))}
            </div>
          ) : null}
          <WarehousePanel />
        </Container>
      </Section>

      <Section tone="bone" size="md" id="faq">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-4">
              <ModuleHeader title="Questions, answered" />
              <p className="text-[15px] leading-relaxed text-ink-600">
                Condition, testing, warranty, delivery, financing, hours and coverage area.
              </p>
            </div>
            <div className="min-w-0 lg:col-span-8">
              <FaqSection entries={CORE_FAQS} />
            </div>
          </div>
        </Container>
      </Section>

      <ContactCta context="about-footer" />
    </>
  );
}
