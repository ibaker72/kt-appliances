import Link from "next/link";
import { ArrowRight, MapPin, Package, Truck, Trash2, Wrench } from "lucide-react";

import { LeadForm } from "@/components/forms/lead-form";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { PhotoFigure } from "@/components/media/photo";
import { ContactCta } from "@/components/shared/contact-cta";
import { FaqSection } from "@/components/shared/faq-section";
import { PageHeader } from "@/components/shared/page-header";
import { QuickAnswerBand } from "@/components/shared/quick-answer";
import { StoreHours } from "@/components/layout/store-hours";
import { Container } from "@/components/ui/container";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { DELIVERY_COST_ANSWER, DELIVERY_FAQS } from "@/lib/content/faq";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata = pageMetadata({
  title: "Delivery, Installation & Haul-Away",
  description:
    "Appliance delivery from our East Stroudsburg warehouse across PA, NJ and NY. Same-day delivery may be available for an extra charge. Professional installation and old-appliance haul-away available. Warehouse pickup any day.",
  path: "/delivery-installation",
});

const SERVICES = [
  {
    id: "delivery",
    icon: Truck,
    title: "Local delivery",
    body: "We deliver from the East Stroudsburg warehouse across the Poconos and into surrounding areas. Same-day delivery may be available for an additional charge depending on the day, the route and the appliance.",
    points: [
      "Delivery is quoted per order, not a flat rate",
      "Cost depends on distance, appliance and access (stairs, tight turns, upper floors)",
      "Same-day may be possible — call early in the day to ask",
      "We confirm the delivery window with you before the truck goes out",
    ],
  },
  {
    id: "installation",
    icon: Wrench,
    title: "Professional installation",
    body: "Installation options are available on most appliances — laundry hookups, dishwasher installs, range connections and over-the-range microwave mounting.",
    points: [
      "Quoted separately from delivery because requirements vary by appliance",
      "Gas appliances need an existing, code-compliant gas hookup",
      "Electric dryers and ranges need the correct 240V outlet and cord type",
      "Tell us your setup when you book and we'll tell you what the install involves",
    ],
  },
  {
    id: "haul-away",
    icon: Trash2,
    title: "Old appliance haul-away",
    body: "We can take your old appliance away when the new one is delivered, so you are not left moving a dead refrigerator out to the curb yourself.",
    points: [
      "Arrange it when you schedule delivery, not on the day",
      "The old unit should be emptied, defrosted and disconnected before we arrive",
      "Haul-away is quoted with the delivery",
    ],
  },
  {
    id: "pickup",
    icon: Package,
    title: "Warehouse pickup",
    body: `Pick up yourself at ${siteConfig.address.street} in ${siteConfig.address.city} during regular hours, or by appointment after 5 PM.`,
    points: [
      "Bring straps, moving blankets and a second set of hands",
      "Measure your vehicle — a full-size refrigerator does not fit in most SUVs",
      "Transport refrigerators upright where possible",
      "Call or text before you drive out so we can have the unit ready",
    ],
  },
];

export default function DeliveryInstallationPage() {
  return (
    <>
      <PageHeader
        title={
          <>
            Delivery, installation
            <br />
            and haul-away
          </>
        }
        description={`Local delivery from our ${siteConfig.address.city} warehouse, professional installation on most appliances, and removal of your old unit. Pricing depends on distance, the appliance and what you need done — so we quote it rather than publish a number that would be wrong for most orders.`}
        crumbs={[{ name: "Delivery & Installation", path: "/delivery-installation" }]}
        actions={
          <>
            <a href="#quote" className={buttonStyles("primary", "lg")}>
              Check Delivery Availability
              <ArrowRight aria-hidden className="size-4" strokeWidth={2.5} />
            </a>
            <CallLink context="delivery-header" className={buttonStyles("outlineLight", "lg")}>
              Call {siteConfig.phone.display}
            </CallLink>
          </>
        }
      />

      {/* "How much is appliance delivery" is the single highest-intent query this
          page can answer, and the honest answer is "it depends" — which is only
          a useful answer if you immediately say what it depends on. Stated
          outright, before the service cards. */}
      <QuickAnswerBand
        question="How much does appliance delivery cost?"
        answer={DELIVERY_COST_ANSWER}
      >
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <TextLink
            context="delivery-quick-answer"
            message={`Hi ${siteConfig.name}, can you quote delivery? My ZIP code is `}
            className={buttonStyles("dark", "md")}
          >
            Text us your ZIP for a price
          </TextLink>
          <Link href="/service-areas" className={buttonStyles("outline", "md")}>
            See the towns we deliver to
          </Link>
        </div>
      </QuickAnswerBand>

      <Section tone="white" size="md">
        <Container>
          <PhotoFigure
            mediaKey="hero.delivery"
            sizes="(min-width: 1280px) 1280px, 100vw"
            aspect="aspect-[3/2] sm:aspect-[5/2]"
            className="mb-10"
            caption="A delivery heading out from the East Stroudsburg warehouse."
          />
          <div className="grid gap-px bg-line lg:grid-cols-2">
            {SERVICES.map(({ id, icon: Icon, title, body, points }) => (
              <section key={id} id={id} className="scroll-mt-32 bg-white p-6 sm:p-8 lg:p-10">
                <Icon aria-hidden className="size-7 text-brand-500" strokeWidth={1.9} />
                <h2 className="mt-5 font-display text-2xl font-extrabold tracking-[-0.025em] text-ink-950 sm:text-[1.75rem]">
                  {title}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{body}</p>
                <ul className="mt-5 space-y-2.5">
                  {points.map((point) => (
                    <li key={point} className="flex gap-3 text-[14.5px] leading-relaxed text-ink-700">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 bg-brand-500" />
                      {point}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <p className="mt-8 border-l-[3px] border-brand-500 bg-bone-50 py-4 pl-5 pr-4 text-[14.5px] leading-relaxed text-ink-700">
            <strong className="font-semibold text-ink-950">On pricing:</strong> we do not publish a
            flat delivery rate because the honest answer depends on how far you are, what you bought
            and what has to happen at your house. Send us your ZIP code and the appliance and you
            will get a real number, not a range.
          </p>
        </Container>
      </Section>

      {/* Delivery quote */}
      <Section tone="bone" size="md" id="quote">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-5">
              <ModuleHeader title="Check delivery to your ZIP" />
              <p className="text-[15px] leading-relaxed text-ink-600">
                Send your ZIP code and what you&apos;re looking at. We&apos;ll come back with what
                delivery costs to you, whether same-day is possible, and what installation would add.
              </p>

              <div className="mt-8 border border-line bg-white p-6">
                <p className="text-ui font-semibold uppercase tracking-wide text-ink-500">Prefer to just ask?</p>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
                  <TextLink
                    context="delivery-quote"
                    message={`Hi ${siteConfig.name}, can you quote delivery to my ZIP code?`}
                    className={buttonStyles("dark", "md")}
                  >
                    Text {siteConfig.phone.display}
                  </TextLink>
                  <CallLink context="delivery-quote" className={buttonStyles("outline", "md")}>
                    Call the warehouse
                  </CallLink>
                </div>
                <div className="mt-6 border-t border-line pt-6">
                  <StoreHours />
                </div>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-7">
              <div className="border border-line bg-white p-6 sm:p-8">
                <LeadForm
                  inquiryType="delivery"
                  formLocation="delivery-installation"
                  title="Request a delivery quote"
                  description="No obligation. We'll text or call you back with pricing."
                  submitLabel="Request Delivery Quote"
                  zipRequired
                  messageLabel="What do you need delivered?"
                  messagePlaceholder="e.g. a French door refrigerator to a second-floor apartment, and haul away the old one"
                />
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Service area */}
      <Section tone="white" size="md">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-5">
              <ModuleHeader title="From East Stroudsburg outward" />
              <p className="text-[15px] leading-relaxed text-ink-600">
                The warehouse is at {siteConfig.address.oneLine}. Delivery is most straightforward
                across Monroe County and the surrounding Poconos, and we deliver into{" "}
                {siteConfig.serviceStates.slice(1).join(" and ")} depending on the distance and the
                order.
              </p>
              <Link href="/service-areas" className={buttonStyles("outline", "md", "mt-7")}>
                <MapPin aria-hidden className="size-4" strokeWidth={2.5} />
                See service areas
              </Link>
            </div>
            <div className="min-w-0 lg:col-span-7">
              <FaqSection entries={DELIVERY_FAQS} />
            </div>
          </div>
        </Container>
      </Section>

      <ContactCta
        title="Ready to schedule?"
        message={`Hi ${siteConfig.name}, I'd like to arrange delivery. My ZIP code is `}
        description="Text us your ZIP code and the appliance you want. We'll confirm cost, timing and whether same-day is possible."
        context="delivery-footer"
      />
    </>
  );
}
