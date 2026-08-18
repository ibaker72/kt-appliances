import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Clock } from "lucide-react";

import { InventoryGrid } from "@/components/inventory/inventory-grid";
import { PhotoFigure } from "@/components/media/photo";
import { ContactCta } from "@/components/shared/contact-cta";
import { FaqSection } from "@/components/shared/faq-section";
import { PageHeader } from "@/components/shared/page-header";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { GUIDES, getGuide } from "@/lib/content/guides";
import { queryInventory } from "@/lib/inventory/repository";
import { CATEGORIES } from "@/lib/inventory/types";
import { LOCAL_BUSINESS_ID } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import { absoluteUrl, siteConfig } from "@/lib/site-config";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) {
    return pageMetadata({ title: "Not found", description: "", path: `/guides/${slug}`, noindex: true });
  }
  return pageMetadata({
    title: guide.metaTitle,
    description: guide.description,
    path: `/guides/${guide.slug}`,
    type: "article",
    publishedTime: guide.updated,
  });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const related = guide.category
    ? await queryInventory({ category: guide.category, statuses: ["available"], limit: 4, sort: "newest" })
    : null;

  const others = GUIDES.filter((entry) => entry.slug !== guide.slug).slice(0, 3);
  const guideCategoryPath = guide.category ? CATEGORIES[guide.category].path : "/inventory";
  const guideCategoryLabel = guide.category
    ? CATEGORIES[guide.category].name.toLowerCase()
    : "all appliances";

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished: guide.updated,
    dateModified: guide.updated,
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/guides/${guide.slug}`) },
    author: { "@id": LOCAL_BUSINESS_ID },
    publisher: { "@id": LOCAL_BUSINESS_ID },
  };

  return (
    <>
      <JsonLd data={articleSchema} />

      <PageHeader
        title={guide.title}
        description={guide.intro}
        crumbs={[
          { name: "Guides", path: "/guides" },
          { name: guide.title, path: `/guides/${guide.slug}` },
        ]}
      />

      <Section tone="white" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <article className="min-w-0 lg:col-span-8">
              <p className="flex items-center gap-2 border-b border-line pb-5 text-[13px] text-ink-500">
                <Clock aria-hidden className="size-3.5" strokeWidth={2.5} />
                {guide.readMinutes} minute read
                <span aria-hidden className="text-ink-300">·</span>
                <span>
                  Updated{" "}
                  <time dateTime={guide.updated}>
                    {new Date(guide.updated).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                </span>
              </p>

              {guide.heroKey ? (
                <PhotoFigure
                  mediaKey={guide.heroKey}
                  sizes="(min-width: 1024px) 720px, 100vw"
                  className="mt-8"
                />
              ) : null}

              {guide.sections.map((section) => (
                <section key={section.heading} className="mt-10 first:mt-8">
                  <h2 className="font-display text-2xl font-extrabold tracking-[-0.025em] text-ink-950 sm:text-[1.75rem]">
                    {section.heading}
                  </h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)} className="mt-4 text-[16px] leading-[1.75] text-ink-700">
                      {paragraph}
                    </p>
                  ))}
                  {section.list ? (
                    <div className="mt-6 border border-line bg-bone-50 p-5 sm:p-6">
                      {section.listTitle ? (
                        <h3 className="text-ui font-semibold uppercase tracking-wide text-ink-500">{section.listTitle}</h3>
                      ) : null}
                      <ul className="mt-4 space-y-3">
                        {section.list.map((item) => (
                          <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
                            <span aria-hidden className="mt-2 size-1.5 shrink-0 bg-brand-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {section.figure ? (
                    <PhotoFigure
                      mediaKey={section.figure.key}
                      caption={section.figure.caption}
                      sizes="(min-width: 1024px) 720px, 100vw"
                      className="mt-6"
                    />
                  ) : null}
                </section>
              ))}

              {guide.faqs?.length ? (
                <section className="mt-14">
                  <h2 className="font-display text-2xl font-extrabold tracking-[-0.025em] text-ink-950 sm:text-[1.75rem]">
                    Questions
                  </h2>
                  <div className="mt-6">
                    <FaqSection entries={guide.faqs} />
                  </div>
                </section>
              ) : null}
            </article>

            {/* Sidebar */}
            <aside className="min-w-0 lg:col-span-4">
              <div className="sticky top-32 space-y-6">
                <div className="border border-line bg-ink-950 p-6 text-white on-dark">
                  <p className="text-ui font-semibold uppercase tracking-wide text-white/55">Ask the warehouse</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/75">
                    Text us your measurements or your hookup type and we&apos;ll tell you what fits
                    before you buy anything.
                  </p>
                  <Link href="/contact" className={buttonStyles("primary", "md", "mt-5 w-full")}>
                    Contact us
                  </Link>
                  <p className="mt-3 text-center text-[13px] text-white/50 tnum">
                    {siteConfig.phone.display}
                  </p>
                </div>

                {/* Guides are the top of the funnel, so each one carries a short,
                    contextual route into the commercial pages rather than being
                    an informational cul-de-sac. Three links, chosen because they
                    are the next question a reader of any guide actually has. */}
                <div className="border border-line p-6">
                  <p className="text-ui font-semibold uppercase tracking-wide text-ink-500">
                    Ready to buy?
                  </p>
                  <ul className="mt-4 divide-y divide-line">
                    {[
                      { href: guideCategoryPath, label: `Shop ${guideCategoryLabel}` },
                      { href: "/delivery-installation", label: "Delivery, installation & haul-away" },
                      { href: "/service-areas", label: "Where we deliver" },
                    ].map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block py-3.5 text-[15px] font-semibold text-ink-800 transition-colors hover:text-brand-500"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {others.length > 0 ? (
                  <div className="border border-line p-6">
                    <p className="text-ui font-semibold uppercase tracking-wide text-ink-500">More guides</p>
                    <ul className="mt-4 divide-y divide-line">
                      {others.map((entry) => (
                        <li key={entry.slug}>
                          <Link
                            href={`/guides/${entry.slug}`}
                            className="block py-3.5 font-display text-[15.5px] font-bold leading-snug text-ink-950 transition-colors hover:text-brand-500"
                          >
                            {entry.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </Container>
      </Section>

      {related && related.items.length > 0 && guide.category ? (
        <Section tone="bone" size="md">
          <Container>
            <ModuleHeader
              title={`${CATEGORIES[guide.category].name} on the floor`}
              href={CATEGORIES[guide.category].path}
              hrefLabel={`All ${CATEGORIES[guide.category].name}`}
            />
            <div>
              <InventoryGrid appliances={related.items} columns={4} />
            </div>
          </Container>
        </Section>
      ) : null}

      <ContactCta context={`guide-${guide.slug}`} />
    </>
  );
}
