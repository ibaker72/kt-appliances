import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  CreditCard,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";

import { AvailabilityBadge, ConditionBadge } from "@/components/inventory/availability-badge";
import { InventoryGrid } from "@/components/inventory/inventory-grid";
import { ProductGallery } from "@/components/inventory/product-gallery";
import { ProductPrice } from "@/components/inventory/product-price";
import { ProductSpecifications } from "@/components/inventory/product-specifications";
import { ProductViewTracker } from "@/components/inventory/product-view-tracker";
import { inquiryMessage } from "@/components/inventory/product-card";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { LeadForm } from "@/components/forms/lead-form";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ContactCta } from "@/components/shared/contact-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { getApplianceBySlug, getRelatedAppliances, getPublishedSlugs } from "@/lib/inventory/repository";
import {
  CATEGORIES,
  CONDITION_LABELS,
  formatPrice,
  isPurchasable,
  primaryImage,
  savingsFor,
  type Appliance,
} from "@/lib/inventory/types";
import { productSchema } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const revalidate = 120;
export const dynamicParams = true;

/** Pre-render the current catalogue; anything newer renders on demand. */
export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.slice(0, 500).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const appliance = await getApplianceBySlug(slug);

  if (!appliance) {
    return pageMetadata({
      title: "Appliance not found",
      description: "This appliance is no longer listed. Browse current warehouse inventory.",
      path: `/inventory/${slug}`,
      noindex: true,
    });
  }

  const sold = appliance.status === "sold";
  const name = `${appliance.brand} ${appliance.title}`;
  const image = primaryImage(appliance);
  const savings = savingsFor(appliance);

  const description = sold
    ? `${name} — sold. See similar ${CATEGORIES[appliance.category].name.toLowerCase()} available now at ${siteConfig.name} in ${siteConfig.address.city}, ${siteConfig.address.state}.`
    : `${name}${appliance.modelNumber ? ` (model ${appliance.modelNumber})` : ""} — ${formatPrice(appliance.price)}${
        savings ? `, save ${formatPrice(savings)} off retail` : ""
      }. ${CONDITION_LABELS[appliance.condition]}, tested and working. Delivery, installation and warranty options available.`;

  return pageMetadata({
    title: sold ? `${name} (Sold)` : `${name} — ${formatPrice(appliance.price)}`,
    description: description.slice(0, 300),
    path: `/inventory/${appliance.slug}`,
    image: image?.imageUrl,
  });
}

export default async function AppliancePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const appliance = await getApplianceBySlug(slug);

  if (!appliance) notFound();

  const related = await getRelatedAppliances(appliance, 4);
  const category = CATEGORIES[appliance.category];
  const available = isPurchasable(appliance);
  const sold = appliance.status === "sold";
  const message = inquiryMessage(appliance);
  const name = `${appliance.brand} ${appliance.title}`;

  return (
    <>
      <JsonLd data={productSchema(appliance)} />
      <ProductViewTracker
        id={appliance.id}
        slug={appliance.slug}
        brand={appliance.brand}
        category={appliance.category}
        price={appliance.price}
      />

      <div className="border-b border-line bg-bone-50">
        <Container className="py-4">
          <Breadcrumbs
            crumbs={[
              { name: "Inventory", path: "/inventory" },
              { name: category.name, path: category.path },
              { name: appliance.title, path: `/inventory/${appliance.slug}` },
            ]}
          />
        </Container>
      </div>

      <Container className="py-8 sm:py-10 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Gallery */}
          <div className="min-w-0 lg:col-span-7">
            <ProductGallery appliance={appliance} />
          </div>

          {/* Buy column */}
          <div className="min-w-0 lg:col-span-5">
            <div className="flex flex-wrap items-center gap-2">
              <ConditionBadge condition={appliance.condition} />
              <AvailabilityBadge appliance={appliance} />
              {appliance.sku ? (
                <span className="text-[12px] text-ink-500">
                  SKU <span className="font-medium text-ink-700 tnum">{appliance.sku}</span>
                </span>
              ) : null}
            </div>

            <p className="eyebrow mt-5 text-brand-500">{appliance.brand}</p>
            <h1 className="mt-2 font-display text-[1.9rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink-950 sm:text-4xl">
              {appliance.title}
            </h1>
            {appliance.modelNumber ? (
              <p className="mt-2.5 text-[14.5px] text-ink-600">
                Model{" "}
                <span className="font-semibold text-ink-950 tnum">{appliance.modelNumber}</span>
                {appliance.subcategory ? (
                  <>
                    <span aria-hidden className="mx-2 text-ink-300">·</span>
                    {appliance.subcategory}
                  </>
                ) : null}
              </p>
            ) : null}

            <div className="mt-6 border-y border-line py-6">
              {sold ? <SoldNotice appliance={appliance} /> : <ProductPrice appliance={appliance} size="lg" />}
            </div>

            {available ? (
              <div className="mt-6 space-y-3">
                <TextLink
                  context="product-detail"
                  message={message}
                  className={buttonStyles("primary", "lg", "w-full")}
                >
                  <MessageSquareText aria-hidden className="size-4" strokeWidth={2.5} />
                  Text About This Appliance
                </TextLink>
                <CallLink context="product-detail" className={buttonStyles("outline", "lg", "w-full")}>
                  <Phone aria-hidden className="size-4" strokeWidth={2.5} />
                  Call {siteConfig.phone.display}
                </CallLink>
                <a
                  href="#request-quote"
                  className="block text-center text-[14px] font-semibold text-ink-600 underline underline-offset-4 hover:text-brand-500"
                >
                  Or request a delivery quote
                </a>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <Link href={category.path} className={buttonStyles("dark", "lg", "w-full")}>
                  See available {category.name.toLowerCase()}
                  <ArrowRight aria-hidden className="size-4" strokeWidth={2.5} />
                </Link>
                <TextLink
                  context="product-detail-sold"
                  message={`Hi ${siteConfig.name}, I saw the ${name} listed as sold. Do you have anything similar?`}
                  className={buttonStyles("outline", "lg", "w-full")}
                >
                  Ask about something similar
                </TextLink>
              </div>
            )}

            {/* Condition disclosure — the single most important trust element */}
            {appliance.cosmeticNotes || appliance.functionalNotes ? (
              <div className="mt-7 border border-line">
                <p className="border-b border-line bg-bone-50 px-4 py-2.5 font-display text-[12px] font-bold uppercase tracking-[0.07em] text-ink-700">
                  Condition of this unit
                </p>
                <dl className="divide-y divide-line">
                  {appliance.cosmeticNotes ? (
                    <div className="flex gap-3 px-4 py-4">
                      <AlertTriangle
                        aria-hidden
                        className="mt-0.5 size-[18px] shrink-0 text-brand-500"
                        strokeWidth={2.25}
                      />
                      <div>
                        <dt className="font-display text-[13px] font-bold text-ink-950">
                          Cosmetic damage
                        </dt>
                        <dd className="mt-1 text-[14.5px] leading-relaxed text-ink-600">
                          {appliance.cosmeticNotes}
                        </dd>
                      </div>
                    </div>
                  ) : null}
                  {appliance.functionalNotes ? (
                    <div className="flex gap-3 px-4 py-4">
                      <ClipboardCheck
                        aria-hidden
                        className="mt-0.5 size-[18px] shrink-0 text-success-600"
                        strokeWidth={2.25}
                      />
                      <div>
                        <dt className="font-display text-[13px] font-bold text-ink-950">
                          Functional testing
                        </dt>
                        <dd className="mt-1 text-[14.5px] leading-relaxed text-ink-600">
                          {appliance.functionalNotes}
                        </dd>
                      </div>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}

            {/* What's available on this unit */}
            <ul className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2">
              <ServiceRow
                icon={ShieldCheck}
                label="1-year warranty"
                value={appliance.warrantyAvailable ? "Available on this unit" : "Not available"}
                enabled={appliance.warrantyAvailable}
                href="/warranty"
              />
              <ServiceRow
                icon={Truck}
                label="Delivery"
                value={appliance.deliveryAvailable ? "Available — quoted by ZIP" : "Pickup only"}
                enabled={appliance.deliveryAvailable}
                href="/delivery-installation"
              />
              <ServiceRow
                icon={Wrench}
                label="Installation"
                value={appliance.installationAvailable ? "Available" : "Not available"}
                enabled={appliance.installationAvailable}
                href="/delivery-installation#installation"
              />
              <ServiceRow
                icon={Trash2}
                label="Haul-away"
                value={appliance.haulAwayAvailable ? "We can take the old one" : "Not available"}
                enabled={appliance.haulAwayAvailable}
                href="/delivery-installation#haul-away"
              />
              <ServiceRow
                icon={CreditCard}
                label="Financing"
                value="Buy now, pay later options"
                enabled
                href="/financing"
              />
              <ServiceRow
                icon={MapPin}
                label="Warehouse pickup"
                value={`${siteConfig.address.city}, daily ${siteConfig.hours.regular.label}`}
                enabled
                href="/contact"
              />
            </ul>
          </div>
        </div>
      </Container>

      {/* Description + specs + inquiry */}
      <Section tone="bone" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
            <div className="min-w-0 lg:col-span-7">
              {appliance.description ? (
                <>
                  <h2 className="font-display text-2xl font-extrabold tracking-[-0.025em] text-ink-950 sm:text-3xl">
                    About this appliance
                  </h2>
                  <p className="mt-4 text-[15.5px] leading-relaxed text-ink-600">
                    {appliance.description}
                  </p>
                </>
              ) : null}

              <h2 className="mt-10 font-display text-2xl font-extrabold tracking-[-0.025em] text-ink-950 sm:text-3xl">
                Specifications
              </h2>
              <div className="mt-5 border-t border-line">
                <ProductSpecifications appliance={appliance} />
              </div>

              <p className="mt-5 text-[13.5px] leading-relaxed text-ink-500">
                Measure your space before you buy — including doorways and the path into the room.
                If you are unsure whether this unit fits, text us the opening dimensions and we will
                check it against the appliance.
              </p>
            </div>

            <div className="min-w-0 lg:col-span-5" id="request-quote">
              <div className="border border-line bg-white p-6 sm:p-8">
                <LeadForm
                  inquiryType="appliance"
                  formLocation={`product:${appliance.slug}`}
                  title={sold ? "Looking for something similar?" : "Ask about this appliance"}
                  description={
                    sold
                      ? "Tell us what you were after and we'll let you know when a comparable unit comes in."
                      : "Send your ZIP code and we'll come back with delivery cost, availability and warranty options for this exact unit."
                  }
                  submitLabel={sold ? "Send Request" : "Request Details & Delivery Quote"}
                  applianceId={appliance.id}
                  applianceSlug={appliance.slug}
                  applianceLabel={`${name}${appliance.modelNumber ? ` (${appliance.modelNumber})` : ""}`}
                  defaultMessage={sold ? "" : `I'm interested in the ${name}.`}
                  messageLabel="Anything we should know?"
                  zipRequired
                />
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {related.length > 0 ? (
        <Section tone="white" size="md">
          <Container>
            <ModuleHeader
              title={sold ? "Similar appliances on the floor" : `More ${category.name.toLowerCase()}`}
              href={category.path}
              hrefLabel={`All ${category.name}`}
            />
            <div>
              <InventoryGrid appliances={related} columns={4} />
            </div>
          </Container>
        </Section>
      ) : null}

      <ContactCta
        title={sold ? "Tell us what you're looking for" : "Questions about this unit?"}
        message={message}
        description={
          sold
            ? "Units like this move quickly. Text us the appliance you need and we'll tell you what's on the floor and what's coming in."
            : "Text us for photos of the actual damage, delivery cost to your ZIP, or to hold the unit until you can get out to the warehouse."
        }
        context="product-footer"
      />
    </>
  );
}

/**
 * Sold state. The listing stays live and useful instead of 404ing, which keeps
 * the URL's search equity and stops paid/social links from dying mid-campaign.
 */
function SoldNotice({ appliance }: { appliance: Appliance }) {
  return (
    <div>
      <p className="inline-flex items-center gap-2 bg-ink-950 px-3 py-1.5 font-display text-[12px] font-extrabold uppercase tracking-[0.2em] text-white">
        Sold
      </p>
      <p className="mt-4 text-[15.5px] leading-relaxed text-ink-600">
        This appliance has sold. It was listed at{" "}
        <span className="font-semibold text-ink-950 tnum">{formatPrice(appliance.price)}</span> — we
        keep sold units on the site so you can see what moves through the warehouse and what it
        goes for.
      </p>
    </div>
  );
}

function ServiceRow({
  icon: Icon,
  label,
  value,
  enabled,
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  enabled: boolean;
  href: string;
}) {
  return (
    <li className="bg-white">
      <Link href={href} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-bone-50">
        <Icon
          aria-hidden
          className={enabled ? "mt-0.5 size-[17px] shrink-0 text-ink-700" : "mt-0.5 size-[17px] shrink-0 text-ink-300"}
          strokeWidth={2.25}
        />
        <span>
          <span className="block font-display text-[12.5px] font-bold uppercase tracking-[0.05em] text-ink-950">
            {label}
          </span>
          <span className={enabled ? "mt-0.5 block text-[13px] text-ink-600" : "mt-0.5 block text-[13px] text-ink-400"}>
            {value}
          </span>
        </span>
      </Link>
    </li>
  );
}
