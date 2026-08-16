import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { ContactCta } from "@/components/shared/contact-cta";
import { PageHeader } from "@/components/shared/page-header";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { GUIDES } from "@/lib/content/guides";
import { CATEGORIES } from "@/lib/inventory/types";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Appliance Buying Guides",
  description:
    "Practical guides to buying appliances: what scratch & dent means, whether it is worth it, how delivery works, what to measure before buying a refrigerator, and how to choose between gas and electric.",
  path: "/guides",
});

export default function GuidesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Buying guides"
        title="Know what you're buying"
        description="Six guides covering the questions we get asked most at the warehouse — written to be genuinely useful whether or not you buy from us."
        crumbs={[{ name: "Guides", path: "/guides" }]}
      />

      <Section tone="white" size="md">
        <Container>
          <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((guide) => (
              <li key={guide.slug} className="bg-white">
                <Link
                  href={`/guides/${guide.slug}`}
                  className="group flex h-full flex-col p-6 transition-colors hover:bg-bone-50 sm:p-7"
                >
                  <p className="eyebrow flex items-center gap-2 text-brand-500">
                    {guide.category ? CATEGORIES[guide.category].name : "General"}
                    <span aria-hidden className="text-ink-300">/</span>
                    <span className="flex items-center gap-1 text-ink-500">
                      <Clock aria-hidden className="size-3" strokeWidth={2.5} />
                      {guide.readMinutes} min
                    </span>
                  </p>
                  <h2 className="mt-4 font-display text-[21px] font-bold leading-tight tracking-[-0.02em] text-ink-950">
                    {guide.title}
                  </h2>
                  <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-ink-600">
                    {guide.excerpt}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-1.5 font-display text-[12px] font-bold uppercase tracking-[0.06em] text-ink-950 transition-colors group-hover:text-brand-500">
                    Read guide
                    <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <ContactCta
        title="Still not sure?"
        description="Text us the space you're working with and what you're replacing. We'll tell you what fits and what it costs — no obligation."
        context="guides-footer"
      />
    </>
  );
}
