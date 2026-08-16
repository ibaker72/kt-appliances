import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, MessageSquareText, Phone } from "lucide-react";

import { InventoryEmptyState, InventoryGrid } from "@/components/inventory/inventory-grid";
import { ListViewTracker } from "@/components/inventory/product-view-tracker";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { LeadForm } from "@/components/forms/lead-form";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ContactCta } from "@/components/shared/contact-cta";
import { FaqSection } from "@/components/shared/faq-section";
import { ServiceCards } from "@/components/shared/service-cards";
import { StoreHours } from "@/components/layout/store-hours";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { CAMPAIGNS, getCampaign } from "@/lib/content/campaigns";
import { HOME_FAQS } from "@/lib/content/faq";
import { queryInventory } from "@/lib/inventory/repository";
import { CATEGORIES } from "@/lib/inventory/types";
import { itemListSchema } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const revalidate = 120;
export const dynamicParams = false;

export function generateStaticParams() {
  return CAMPAIGNS.map((campaign) => ({ campaign: campaign.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaign: string }>;
}): Promise<Metadata> {
  const { campaign: slug } = await params;
  const campaign = getCampaign(slug);
  if (!campaign) {
    return pageMetadata({ title: "Not found", description: "", path: `/deals/${slug}`, noindex: true });
  }
  return pageMetadata({
    title: campaign.metaTitle,
    description: campaign.metaDescription,
    path: `/deals/${campaign.slug}`,
  });
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ campaign: string }>;
}) {
  const { campaign: slug } = await params;
  const campaign = getCampaign(slug);
  if (!campaign) notFound();

  // Campaigns can span several categories, so query each and merge by newest.
  const results = campaign.categories
    ? await Promise.all(
        campaign.categories.map((category) =>
          queryInventory({ category, statuses: ["available"], limit: 12, sort: "newest" }),
        ),
      )
    : [await queryInventory({ statuses: ["available"], limit: 12, sort: "newest" })];

  const items = results
    .flatMap((result) => result.items)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 12);

  const browseHref = campaign.categories?.length === 1
    ? CATEGORIES[campaign.categories[0]].path
    : "/inventory";

  return (
    <>
      <ListViewTracker listName={campaign.metaTitle} resultCount={items.length} />

      {/* Compact hero — paid traffic sees the offer and a CTA without scrolling */}
      <section className="on-dark bg-ink-950 text-white">
        <Container className="py-8 sm:py-12">
          <Breadcrumbs
            crumbs={[
              { name: "Deals", path: "/deals/appliance-sale" },
              { name: campaign.metaTitle, path: `/deals/${campaign.slug}` },
            ]}
            tone="light"
          />

          <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
            <div className="min-w-0 lg:col-span-7">
              <p className="eyebrow text-brand-400">
                {siteConfig.address.city}, {siteConfig.address.state} warehouse ·{" "}
                {siteConfig.serviceStatesShort.join(" · ")}
              </p>
              <h1 className="mt-4 font-display text-[2.35rem] font-extrabold leading-[0.94] tracking-[-0.035em] sm:text-5xl lg:text-[3.9rem]">
                {campaign.headline}
                <span className="mt-1 block text-brand-500">{campaign.headlineAccent}</span>
              </h1>
              <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/75">
                {campaign.subhead}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <TextLink
                  context={`deals-${campaign.slug}`}
                  message={campaign.smsMessage}
                  className={buttonStyles("primary", "lg", "w-full sm:w-auto")}
                >
                  <MessageSquareText aria-hidden className="size-4" strokeWidth={2.5} />
                  Text {siteConfig.phone.display}
                </TextLink>
                <CallLink
                  context={`deals-${campaign.slug}`}
                  className={buttonStyles("outlineLight", "lg", "w-full sm:w-auto")}
                >
                  <Phone aria-hidden className="size-4" strokeWidth={2.5} />
                  Call Now
                </CallLink>
                <a href="#inventory" className={buttonStyles("outlineLight", "lg", "w-full sm:w-auto")}>
                  See Inventory
                </a>
              </div>

              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5">
                {campaign.proofPoints.map((point) => (
                  <li key={point} className="flex items-center gap-2 text-[14px] text-white/75">
                    <Check aria-hidden className="size-4 shrink-0 text-brand-400" strokeWidth={3} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Inline lead capture — the highest-intent action on a paid page */}
            <div className="min-w-0 lg:col-span-5">
              <div className="border border-white/15 bg-white/[0.04] p-6 sm:p-7">
                <LeadForm
                  tone="light"
                  inquiryType="appliance"
                  formLocation={`deals:${campaign.slug}`}
                  title="Ask what's in stock"
                  description="Send your number and we'll text you back with what's on the floor and what it costs delivered."
                  submitLabel="Check Availability"
                  showMessage={false}
                  showEmail={false}
                  zipRequired
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Inventory */}
      <Section tone="white" size="md" id="inventory">
        <Container>
          <SectionHeading
            eyebrow="Available now"
            title={campaign.gridHeading}
            description="Prices shown are what you pay. A comparison price appears only where we have a verified retail price for the same model."
            action={
              <Link href={browseHref} className={buttonStyles("outline", "md")}>
                Browse everything
                <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
              </Link>
            }
          />
          <div className="mt-10">
            {items.length > 0 ? (
              <>
                <JsonLd data={itemListSchema(items, campaign.metaTitle)} />
                <InventoryGrid appliances={items} columns={4} priorityCount={4} />
              </>
            ) : (
              <InventoryEmptyState
                title="Stock is moving — call for what just came in"
                description="Nothing in this category is listed on the site at the moment. Inventory arrives most weeks and units often sell before they reach the website."
              />
            )}
          </div>
        </Container>
      </Section>

      {/* Services */}
      <Section tone="ink" size="md">
        <Container>
          <SectionHeading
            tone="light"
            eyebrow="Included in the conversation"
            title="Delivery, installation, financing, warranty"
            description="Ask about any of these when you call — they are quoted with the appliance, not bolted on at the end."
          />
          <div className="mt-10">
            <ServiceCards />
          </div>
        </Container>
      </Section>

      {/* Trust + hours */}
      <Section tone="bone" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-4">
              <SectionHeading eyebrow="Before you come out" title="Good to know" />
              <div className="mt-8 border border-line bg-white p-6">
                <StoreHours />
                <p className="mt-6 border-t border-line pt-5 text-[14px] leading-relaxed text-ink-600">
                  {siteConfig.address.street}
                  <br />
                  {siteConfig.address.city}, {siteConfig.address.state}{" "}
                  {siteConfig.address.postalCode}
                </p>
              </div>
            </div>
            <div className="min-w-0 lg:col-span-8">
              <FaqSection entries={HOME_FAQS} />
            </div>
          </div>
        </Container>
      </Section>

      <ContactCta
        title="Call before it's gone"
        message={campaign.smsMessage}
        description="Units listed here are single pieces of stock. If you see something you want, calling or texting the same day is the difference between getting it and reading about it."
        context={`deals-${campaign.slug}-footer`}
      />
    </>
  );
}
