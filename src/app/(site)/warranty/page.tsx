import Link from "next/link";
import { ClipboardCheck, FileText, ShieldCheck } from "lucide-react";

import { CallLink, TextLink } from "@/components/contact/contact-links";
import { PhotoFigure } from "@/components/media/photo";
import { ContactCta } from "@/components/shared/contact-cta";
import { FaqSection } from "@/components/shared/faq-section";
import { PageHeader } from "@/components/shared/page-header";
import { Container } from "@/components/ui/container";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { WARRANTY_FAQS } from "@/lib/content/faq";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata = pageMetadata({
  title: "Appliance Warranty Options",
  description:
    "1-year warranty options are available on qualifying appliances at KT Appliances. Coverage varies by unit — ask about warranty options for the specific appliance before you buy.",
  path: "/warranty",
});

/**
 * Warranty page.
 *
 * The business states "1 Year Warranty Available". That is deliberately not
 * rewritten into "every appliance includes a 1-year warranty" anywhere on this
 * page — availability and inclusion are different promises, and only one of them
 * has been confirmed. When actual warranty terms are supplied, they belong in
 * the "Coverage terms" section below.
 */
export default function WarrantyPage() {
  return (
    <>
      <PageHeader
        title="1-year warranty options"
        description="Warranty options are available on qualifying appliances. Coverage is not automatic on every unit and terms vary, so ask about warranty for the specific appliance you are buying — before the sale, not after."
        crumbs={[{ name: "Warranty", path: "/warranty" }]}
        actions={
          <>
            <TextLink
              context="warranty-header"
              message={`Hi ${siteConfig.name}, what warranty options are available on the appliance I'm looking at?`}
              className={buttonStyles("primary", "lg")}
            >
              Ask About Warranty
            </TextLink>
            <CallLink context="warranty-header" className={buttonStyles("outlineLight", "lg")}>
              Call {siteConfig.phone.display}
            </CallLink>
          </>
        }
      />

      <Section tone="white" size="md">
        <Container>
          <div className="grid gap-px bg-line lg:grid-cols-3">
            {[
              {
                icon: ClipboardCheck,
                title: "Tested before it's listed",
                body: "Every appliance is checked for function at the warehouse before it goes on the floor. What was tested is written on the listing — cooling on a refrigerator, a full cycle on a washer, heat and tumble on a dryer.",
              },
              {
                icon: ShieldCheck,
                title: "Warranty options available",
                body: "1-year warranty options are available on qualifying appliances. Whether a specific unit qualifies, and what the coverage includes, depends on the appliance — we tell you before you buy.",
              },
              {
                icon: FileText,
                title: "Condition disclosed up front",
                body: "The cosmetic damage on each unit is described on its listing. That damage is the reason for the discount — it is disclosed at the time of sale and is not treated as a defect afterwards.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white p-6 sm:p-8">
                <Icon aria-hidden className="size-7 text-brand-500" strokeWidth={1.9} />
                <h2 className="mt-5 font-display text-xl font-bold tracking-[-0.02em] text-ink-950">
                  {title}
                </h2>
                <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">{body}</p>
              </div>
            ))}
          </div>
          <PhotoFigure
            mediaKey="people.testing"
            sizes="(min-width: 1280px) 1280px, 100vw"
            aspect="aspect-[3/2] sm:aspect-[5/2]"
            className="mt-8"
            caption="Function testing at the warehouse — what was tested goes on the listing."
          />
        </Container>
      </Section>

      <Section tone="bone" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-5">
              <ModuleHeader title="Before you pay, ask these" />
              <p className="text-[15px] leading-relaxed text-ink-600">
                A warranty is only useful if you know what it covers. These are the questions worth
                asking on any scratch &amp; dent purchase — here or anywhere else.
              </p>
              <TextLink
                context="warranty-questions"
                message={`Hi ${siteConfig.name}, can you tell me what warranty option is available on a specific appliance?`}
                className={buttonStyles("dark", "md", "mt-7")}
              >
                Text us about a specific unit
              </TextLink>
            </div>

            <div className="min-w-0 lg:col-span-7">
              <ul className="border-t border-line">
                {[
                  "Does this specific unit qualify for a warranty option, and what does it cost?",
                  "What does the coverage include — parts, labour, or both?",
                  "How long does coverage run from the date of purchase?",
                  "What is the process if something fails — who do I call, and what happens next?",
                  "Is any manufacturer coverage still in effect on this unit?",
                  "What is excluded? (The disclosed cosmetic damage always is.)",
                ].map((question, index) => (
                  <li key={question} className="flex gap-5 border-b border-line py-5">
                    <span className="font-display text-[13px] font-bold text-brand-500 tnum">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="text-[15px] leading-relaxed text-ink-800">{question}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      {/* Placeholder for real terms, clearly marked rather than invented */}
      <Section tone="white" size="md">
        <Container width="narrow">
          <ModuleHeader title="Getting the specifics" />
          <p className="mt-5 text-[15.5px] leading-relaxed text-ink-600">
            Written warranty terms are provided with the appliance at the time of purchase. Because
            coverage varies by unit and by the option selected, we do not publish a single set of
            terms on this page — it would not accurately describe every appliance we sell.
          </p>
          <p className="mt-4 text-[15.5px] leading-relaxed text-ink-600">
            If you want the terms in advance, ask us about the specific appliance and we will go
            through exactly what applies to it. If you have already bought from us and need to make
            a claim, call or text the warehouse and we will walk you through it.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <CallLink context="warranty-terms" className={buttonStyles("dark", "md")}>
              Call {siteConfig.phone.display}
            </CallLink>
            <Link href="/inventory" className={buttonStyles("outline", "md")}>
              Browse inventory
            </Link>
          </div>
        </Container>
      </Section>

      <Section tone="bone" size="md">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-4">
              <ModuleHeader title="Warranty FAQs" />
            </div>
            <div className="min-w-0 lg:col-span-8">
              <FaqSection entries={WARRANTY_FAQS} />
            </div>
          </div>
        </Container>
      </Section>

      <ContactCta
        title="Ask before you buy"
        message={`Hi ${siteConfig.name}, what warranty options are available on the appliance I'm looking at?`}
        description="Tell us which appliance you are considering and we will tell you exactly what warranty option applies to that unit."
        context="warranty-footer"
      />
    </>
  );
}
