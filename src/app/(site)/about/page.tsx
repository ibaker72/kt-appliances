import Link from "next/link";
import { ArrowRight, ClipboardCheck, Eye, MapPin, PhoneCall } from "lucide-react";

import { ContactCta } from "@/components/shared/contact-cta";
import { FaqSection } from "@/components/shared/faq-section";
import { PageHeader } from "@/components/shared/page-header";
import { WarehousePanel } from "@/components/shared/warehouse-panel";
import { WhyKt } from "@/components/home/why-kt";
import { CallLink } from "@/components/contact/contact-links";
import { Container } from "@/components/ui/container";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { CORE_FAQS } from "@/lib/content/faq";
import { getCachedNavigationMenu } from "@/lib/inventory/navigation-cache";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

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
