import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ClipboardCheck,
  CreditCard,
  MapPin,
  MessageSquareText,
  Minus,
  Phone,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { AvailabilityBadge, ConditionBadge } from "@/components/inventory/availability-badge";
import { ProductGallery } from "@/components/inventory/product-gallery";
import { ProductPrice } from "@/components/inventory/product-price";
import { ProductSpecifications } from "@/components/inventory/product-specifications";
import { ProductViewTracker } from "@/components/inventory/product-view-tracker";
import { RecentlyViewed } from "@/components/inventory/recently-viewed";
import { ProductCard, inquiryMessage } from "@/components/inventory/product-card";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { LeadForm } from "@/components/forms/lead-form";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ContactCta } from "@/components/shared/contact-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { Rail } from "@/components/ui/rail";
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
  const heroImage = primaryImage(appliance);

  return (
    <>
      <JsonLd data={productSchema(appliance)} />
      <ProductViewTracker
        id={appliance.id}
        slug={appliance.slug}
        title={appliance.title}
        brand={appliance.brand}
        category={appliance.category}
        price={appliance.price}
        image={heroImage?.imageUrl ?? null}
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

      <Container className="py-6 lg:py-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Gallery */}
          <div className="min-w-0 lg:col-span-7">
            <ProductGallery appliance={appliance} />
          </div>

          {/*
            Buy box. Sticky is the point: a shopper reading the specification
            table below should never have to scroll back up to find the price or
            the phone number. `top` clears the sticky header at `lg`.
          */}
          <div className="min-w-0 lg:col-span-5">
            <div className="lg:sticky lg:top-[168px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                {appliance.brand}
              </p>
              <h1 className="mt-1.5 font-display text-[1.75rem] font-extrabold leading-[1.05] tracking-[-0.02em] text-ink-950 sm:text-[2.1rem]">
                {appliance.title}
              </h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-ui text-ink-600">
                {appliance.modelNumber ? (
                  <span>
                    Model <span className="font-semibold text-ink-900 tnum">{appliance.modelNumber}</span>
                  </span>
                ) : null}
                {appliance.modelNumber && appliance.sku ? (
                  <span aria-hidden className="text-ink-300">·</span>
                ) : null}
                {appliance.sku ? (
                  <span>
                    SKU <span className="font-semibold text-ink-900 tnum">{appliance.sku}</span>
                  </span>
                ) : null}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ConditionBadge condition={appliance.condition} />
                <AvailabilityBadge appliance={appliance} />
                {appliance.cosmeticNotes || appliance.functionalNotes ? (
                  <a
                    href="#condition"
                    className="text-ui font-semibold text-ink-700 underline underline-offset-4 hover:text-brand-500"
                  >
                    What we tested
                  </a>
                ) : null}
              </div>

              <div className="mt-5 border-y border-line py-5">
                {sold ? <SoldNotice appliance={appliance} /> : <ProductPrice appliance={appliance} size="lg" />}
              </div>

              {/* Fulfillment. Every line reflects this unit's own record — a
                  checklist that said "delivery available" on a pickup-only unit
                  would be the one lie this whole site is built to avoid. */}
              {available ? (
                <ul className="mt-5 space-y-2">
                  <FulfillmentRow
                    enabled
                    label="Warehouse pickup"
                    detail={`${siteConfig.address.city} · daily ${siteConfig.hours.regular.label}`}
                  />
                  <FulfillmentRow
                    enabled={appliance.deliveryAvailable}
                    label="Delivery"
                    detail={
                      appliance.deliveryAvailable
                        ? "Quoted by ZIP code and appliance"
                        : "Not offered on this unit"
                    }
                  />
                  <FulfillmentRow
                    enabled={appliance.installationAvailable}
                    label="Installation"
                    detail={
                      appliance.installationAvailable
                        ? "We can fit it when it arrives"
                        : "Not offered on this unit"
                    }
                  />
                  <FulfillmentRow
                    enabled={appliance.haulAwayAvailable}
                    label="Haul-away"
                    detail={
                      appliance.haulAwayAvailable
                        ? "We can take the old appliance"
                        : "Not offered on this unit"
                    }
                  />
                </ul>
              ) : null}

              {available ? (
                <div className="mt-6 space-y-2.5">
                  {/* Call leads: this is a lead-gen storefront and the phone is
                      the fastest close. Text is a close second, not an equal. */}
                  <CallLink context="product-detail" className={buttonStyles("primary", "lg", "w-full")}>
                    <Phone aria-hidden className="size-4" strokeWidth={2.5} />
                    Call about this appliance
                  </CallLink>
                  <TextLink
                    context="product-detail"
                    message={message}
                    className={buttonStyles("outline", "lg", "w-full")}
                  >
                    <MessageSquareText aria-hidden className="size-4" strokeWidth={2.5} />
                    Text about this appliance
                  </TextLink>
                  <a
                    href="#request-quote"
                    className="block text-center text-ui font-semibold text-ink-600 underline underline-offset-4 hover:text-brand-500"
                  >
                    Or request a delivery quote
                  </a>
                </div>
              ) : (
                <div className="mt-6 space-y-2.5">
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

              <p className="mt-4 flex items-start gap-2 text-ui leading-relaxed text-ink-600">
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-400" strokeWidth={2.5} />
                {appliance.warrantyAvailable ? (
                  <span>
                    A 1-year warranty option is available on this unit.{" "}
                    <Link href="/warranty" className="font-semibold underline underline-offset-4 hover:text-brand-500">
                      What it covers
                    </Link>
                  </span>
                ) : (
                  <span>
                    No warranty option is offered on this unit. Ask us what that means before you
                    buy.
                  </span>
                )}
              </p>

              <p className="mt-3 flex items-start gap-2 text-ui leading-relaxed text-ink-600">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-400" strokeWidth={2.5} />
                <span>
                  See it at {siteConfig.address.oneLine}. Open daily{" "}
                  {siteConfig.hours.regular.label}.{" "}
                  <Link href="/contact" className="font-semibold underline underline-offset-4 hover:text-brand-500">
                    Hours &amp; directions
                  </Link>
                </span>
              </p>
            </div>
          </div>
        </div>
      </Container>

      {/* Anchored detail sections. Plain anchors rather than scripted tabs, so
          every section is in the markup for search engines and reachable with
          JavaScript off. */}
      <Section tone="bone" size="md">
        <Container>
          <nav aria-label="Appliance details" className="mb-6 border-b border-line">
            <ul className="no-scrollbar flex gap-1 overflow-x-auto">
              {[
                { href: "#details", label: "Details" },
                { href: "#specifications", label: "Specifications" },
                { href: "#condition", label: "Condition & testing" },
                { href: "#delivery", label: "Delivery & returns" },
              ].map((tab) => (
                <li key={tab.href} className="shrink-0">
                  <a
                    href={tab.href}
                    className="block px-3 py-2.5 text-[14px] font-semibold text-ink-700 hover:text-brand-500"
                  >
                    {tab.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="min-w-0 lg:col-span-7">
              <section id="details" className="scroll-mt-[200px]">
                <h2 className="text-[18px] font-semibold text-ink-950 sm:text-[20px]">
                  About this appliance
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
                  {appliance.description ??
                    `A ${CONDITION_LABELS[appliance.condition].toLowerCase()} ${category.singular.toLowerCase()} from ${appliance.brand}, on the floor at our ${siteConfig.address.city} warehouse. Call or text and we will walk you through the exact unit.`}
                </p>
              </section>

              <section id="specifications" className="mt-10 scroll-mt-[200px]">
                <h2 className="text-[18px] font-semibold text-ink-950 sm:text-[20px]">
                  Specifications
                </h2>
                <div className="mt-3 border-t border-line">
                  <ProductSpecifications appliance={appliance} />
                </div>
                <p className="mt-4 text-ui leading-relaxed text-ink-500">
                  Measure your space before you buy — including doorways and the path into the room.
                  If you are unsure whether this unit fits, text us the opening dimensions and we
                  will check them against the appliance.
                </p>
              </section>

              {/*
                Condition is the differentiating content of this business, so it
                gets its own titled block rather than a line buried in the
                description — and the damage location leads, because that is what
                decides whether a shopper will see the mark every day.
              */}
              <section id="condition" className="mt-10 scroll-mt-[200px]">
                <h2 className="text-[18px] font-semibold text-ink-950 sm:text-[20px]">
                  Condition &amp; what we tested
                </h2>

                {appliance.cosmeticNotes ? (
                  <div className="mt-3 rounded-md border-l-[3px] border-brand-500 bg-white p-4 shadow-card">
                    <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink-950">
                      <AlertTriangle aria-hidden className="size-4 text-brand-500" strokeWidth={2.5} />
                      Where the damage is
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">
                      {appliance.cosmeticNotes}
                    </p>
                  </div>
                ) : null}

                {appliance.functionalNotes ? (
                  <div className="mt-3 rounded-md border-l-[3px] border-save-600 bg-white p-4 shadow-card">
                    <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink-950">
                      <ClipboardCheck aria-hidden className="size-4 text-save-600" strokeWidth={2.5} />
                      What we tested
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">
                      {appliance.functionalNotes}
                    </p>
                  </div>
                ) : null}

                {!appliance.cosmeticNotes && !appliance.functionalNotes ? (
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
                    Condition notes for this unit are not written up yet. Call or text us and we
                    will describe the damage and tell you exactly what was checked before we list it.
                  </p>
                ) : null}

                <p className="mt-4 text-ui leading-relaxed text-ink-500">
                  {CONDITION_LABELS[appliance.condition]} means cosmetic damage, not a functional
                  defect.{" "}
                  <Link
                    href="/guides/what-does-scratch-and-dent-mean"
                    className="font-semibold text-ink-700 underline underline-offset-4 hover:text-brand-500"
                  >
                    How scratch &amp; dent works
                  </Link>
                </p>
              </section>

              <section id="delivery" className="mt-10 scroll-mt-[200px]">
                <h2 className="text-[18px] font-semibold text-ink-950 sm:text-[20px]">
                  Delivery &amp; returns
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
                  {appliance.deliveryAvailable
                    ? "Delivery is available on this unit and quoted by distance from the warehouse and the appliance itself. Send your ZIP code and we will price it."
                    : "This unit is pickup only from the warehouse. Bring straps and blankets, and measure your vehicle before you come out."}
                </p>
                <ul className="mt-4 space-y-2 text-[15px] text-ink-700">
                  <li className="flex gap-2.5">
                    <Truck aria-hidden className="mt-1 size-4 shrink-0 text-ink-400" strokeWidth={2.5} />
                    <Link href="/delivery-installation" className="underline underline-offset-4 hover:text-brand-500">
                      Delivery, installation and haul-away
                    </Link>
                  </li>
                  <li className="flex gap-2.5">
                    <ShieldCheck aria-hidden className="mt-1 size-4 shrink-0 text-ink-400" strokeWidth={2.5} />
                    <Link href="/warranty" className="underline underline-offset-4 hover:text-brand-500">
                      Warranty options and what they cover
                    </Link>
                  </li>
                  <li className="flex gap-2.5">
                    <CreditCard aria-hidden className="mt-1 size-4 shrink-0 text-ink-400" strokeWidth={2.5} />
                    <Link href="/financing" className="underline underline-offset-4 hover:text-brand-500">
                      Financing options
                    </Link>
                  </li>
                  <li className="flex gap-2.5">
                    <MapPin aria-hidden className="mt-1 size-4 shrink-0 text-ink-400" strokeWidth={2.5} />
                    <Link href="/service-areas" className="underline underline-offset-4 hover:text-brand-500">
                      Where we deliver, and what it costs
                    </Link>
                  </li>
                  <li className="flex gap-2.5">
                    <ClipboardCheck aria-hidden className="mt-1 size-4 shrink-0 text-ink-400" strokeWidth={2.5} />
                    <Link href="/terms" className="underline underline-offset-4 hover:text-brand-500">
                      Terms of sale
                    </Link>
                  </li>
                </ul>
              </section>
            </div>

            <div className="min-w-0 lg:col-span-5" id="request-quote">
              <div className="rounded-md border border-line bg-white p-6 sm:p-8 lg:sticky lg:top-[168px]">
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
        <Section tone="flat">
          <Container>
            <ModuleHeader
              title={sold ? "Similar appliances on the floor" : "You may also like"}
              href={category.path}
              hrefLabel={`All ${category.name}`}
            />
            <Rail label={sold ? "Similar appliances on the floor" : "You may also like"}>
              {related.map((item) => (
                <ProductCard key={item.id} appliance={item} sizes="240px" />
              ))}
            </Rail>
          </Container>
        </Section>
      ) : null}

      <RecentlyViewed excludeSlug={appliance.slug} />

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

/**
 * One fulfillment option for this unit.
 *
 * A cross rather than a hidden row: knowing that haul-away is *not* offered is
 * as decisive as knowing it is, and quietly omitting the line would let a
 * shopper assume it.
 */
function FulfillmentRow({
  enabled,
  label,
  detail,
}: {
  enabled: boolean;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      {enabled ? (
        <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-save-600" strokeWidth={3} />
      ) : (
        <Minus aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-300" strokeWidth={3} />
      )}
      <span className="min-w-0 text-ui">
        <span className={enabled ? "font-semibold text-ink-950" : "font-semibold text-ink-500"}>
          {label}
        </span>
        <span className={enabled ? "text-ink-600" : "text-ink-400"}> — {detail}</span>
      </span>
      <span className="sr-only">{enabled ? "available" : "not available"}</span>
    </li>
  );
}
