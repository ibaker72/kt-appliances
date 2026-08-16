import Link from "next/link";
import { ArrowRight, MapPin, Truck } from "lucide-react";

import { CallLink, TextLink } from "@/components/contact/contact-links";
import { ContactCta } from "@/components/shared/contact-cta";
import { PageHeader } from "@/components/shared/page-header";
import { WarehousePanel } from "@/components/shared/warehouse-panel";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { SERVICE_LOCATIONS } from "@/lib/content/locations";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata = pageMetadata({
  title: "Service Areas — Appliance Delivery Across the Poconos",
  description:
    "KT Appliances delivers appliances from our East Stroudsburg, PA warehouse across Monroe County and the Poconos, and into New Jersey and New York. See delivery details for your area.",
  path: "/service-areas",
});

export default function ServiceAreasPage() {
  return (
    <>
      <PageHeader
        eyebrow="Where we deliver"
        title="Service areas"
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

      <Section tone="white" size="md">
        <Container>
          <SectionHeading
            eyebrow="Local delivery"
            title="Towns we deliver to regularly"
            description="These are the areas we run most often. Each page covers what delivery looks like from the warehouse to that town, and what tends to matter locally."
          />

          <ul className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_LOCATIONS.map((location) => (
              <li key={location.slug} className="bg-white">
                <Link
                  href={`/appliances/${location.slug}`}
                  className="group flex h-full flex-col p-6 transition-colors hover:bg-bone-50 sm:p-7"
                >
                  <p className="eyebrow flex items-center gap-2 text-brand-500">
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

      <Section tone="bone" size="md">
        <Container>
          <SectionHeading
            eyebrow="Warehouse pickup"
            title="Open to everyone, every day"
            description="However far out you are, pickup is always an option — and it is the cheapest way to buy."
          />
          <div className="mt-10">
            <WarehousePanel />
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
