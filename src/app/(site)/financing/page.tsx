import { CreditCard, ListChecks, MessageSquareText, ShieldQuestion } from "lucide-react";

import { LeadForm } from "@/components/forms/lead-form";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { ContactCta } from "@/components/shared/contact-cta";
import { FaqSection } from "@/components/shared/faq-section";
import { PageHeader } from "@/components/shared/page-header";
import { Container } from "@/components/ui/container";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { FINANCING_FAQS } from "@/lib/content/faq";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata = pageMetadata({
  title: "Appliance Financing — Buy Now, Pay Later",
  description:
    "Financing options are available on appliances at KT Appliances in East Stroudsburg, PA, including buy now, pay later. Ask about financing for the appliance you want — call or text 973-519-9717.",
  path: "/financing",
});

/**
 * Financing page.
 *
 * Deliberately does NOT name a provider, quote an APR, promise approval, or
 * claim "no credit check". Nothing about the actual financing terms has been
 * supplied, and inventing them would be both misleading and a regulatory
 * problem. When a provider is configured, this page is where the application
 * link and the disclosure copy go.
 */
export default function FinancingPage() {
  return (
    <>
      <PageHeader
        title={
          <>
            Buy now,
            <br />
            pay later
          </>
        }
        description="Financing options are available on appliances at KT Appliances. What you qualify for depends on the provider and your application, so we walk through the options with you directly rather than publishing terms that may not apply to your situation."
        crumbs={[{ name: "Financing", path: "/financing" }]}
        actions={
          <>
            <a href="#ask" className={buttonStyles("primary", "lg")}>
              Ask About Financing
            </a>
            <CallLink context="financing-header" className={buttonStyles("outlineLight", "lg")}>
              Call {siteConfig.phone.display}
            </CallLink>
          </>
        }
      />

      <Section tone="white" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-7">
              <ModuleHeader title="Straightforward, and no surprises" />
              <p className="text-[15px] leading-relaxed text-ink-600">
                Financing is one of the reasons a warehouse price makes sense — you are already
                paying less than retail, and paying over time makes a full kitchen or laundry
                replacement manageable.
              </p>

              <ol className="mt-9 border-t border-line">
                {[
                  {
                    title: "Pick the appliance first",
                    body: "Financing options can depend on the purchase amount, so it is easiest once you know which unit you want. Browse inventory or tell us what you need and we'll find it.",
                  },
                  {
                    title: "Ask us what applies",
                    body: "Call, text, or send the form on this page. We'll explain which financing options are available for that purchase and what the application involves.",
                  },
                  {
                    title: "Apply, then take it home",
                    body: "Once you are approved, we schedule delivery or warehouse pickup the same way as any other order — including installation and haul-away if you need them.",
                  },
                ].map((step, index) => (
                  <li key={step.title} className="flex gap-5 border-b border-line py-6">
                    <span className="font-display text-[13px] font-bold text-brand-500 tnum">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold tracking-[-0.02em] text-ink-950">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Honest boundary — what this page will not claim */}
              <div className="mt-9 border border-line bg-bone-50 p-6">
                <ShieldQuestion aria-hidden className="size-6 text-ink-700" strokeWidth={1.9} />
                <h3 className="mt-4 font-display text-lg font-bold text-ink-950">
                  What we will not tell you on a web page
                </h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-600">
                  We do not advertise guaranteed approval, no credit check, a specific interest rate
                  or a specific payment schedule. Those depend entirely on the financing provider and
                  your application, and any number published here would be wrong for most people.
                  Ask us and you will get an accurate answer for your situation.
                </p>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-5">
              <div className="sticky top-32 space-y-6">
                <div className="border border-line bg-white p-6">
                  <CreditCard aria-hidden className="size-7 text-brand-500" strokeWidth={1.9} />
                  <h3 className="mt-4 font-display text-xl font-bold text-ink-950">
                    Fastest way to get an answer
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">
                    Text us the appliance you want. We&apos;ll tell you what financing options apply
                    to that purchase.
                  </p>
                  <div className="mt-5 flex flex-col gap-2.5">
                    <TextLink
                      context="financing"
                      message={`Hi ${siteConfig.name}, I'd like to ask about financing options.`}
                      className={buttonStyles("primary", "md", "w-full")}
                    >
                      <MessageSquareText aria-hidden className="size-4" strokeWidth={2.5} />
                      Text {siteConfig.phone.display}
                    </TextLink>
                    <CallLink context="financing" className={buttonStyles("outline", "md", "w-full")}>
                      Call the warehouse
                    </CallLink>
                  </div>
                </div>

                <div className="border border-line bg-bone-50 p-6">
                  <ListChecks aria-hidden className="size-6 text-ink-700" strokeWidth={1.9} />
                  <h3 className="mt-4 font-display text-lg font-bold text-ink-950">
                    Helpful to have ready
                  </h3>
                  <ul className="mt-3 space-y-2 text-[14.5px] leading-relaxed text-ink-600">
                    <li className="flex gap-2.5">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 bg-brand-500" />
                      Which appliance (or appliances) you want
                    </li>
                    <li className="flex gap-2.5">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 bg-brand-500" />
                      Your ZIP code, if you will need delivery
                    </li>
                    <li className="flex gap-2.5">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 bg-brand-500" />
                      Roughly what monthly payment works for you
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="bone" size="md" id="ask">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-5">
              <ModuleHeader title="Ask about financing" />
              <p className="text-[15px] leading-relaxed text-ink-600">
                Send this and we&apos;ll follow up with the options available for what you&apos;re
                buying. Submitting this form is not an application and does not affect your credit.
              </p>
              <div className="mt-8">
                <FaqSection entries={FINANCING_FAQS} />
              </div>
            </div>
            <div className="min-w-0 lg:col-span-7">
              <div className="border border-line bg-white p-6 sm:p-8">
                <LeadForm
                  inquiryType="financing"
                  formLocation="financing"
                  submitLabel="Ask About Financing"
                  messageLabel="What are you looking to finance?"
                  messagePlaceholder="e.g. a washer and dryer set, and possibly a refrigerator"
                />
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <ContactCta
        title="Shop first, then ask"
        message={`Hi ${siteConfig.name}, I'd like to ask about financing options.`}
        description="Browse what's on the warehouse floor, pick what you need, then text us and we'll go through payment options for that purchase."
        context="financing-footer"
      />
    </>
  );
}
