import Link from "next/link";
import { CalendarClock, Mail, MessageSquareText, Navigation, Phone } from "lucide-react";

import { LeadForm } from "@/components/forms/lead-form";
import { CallLink, DirectionsLink, EmailLink, TextLink } from "@/components/contact/contact-links";
import { FaqSection } from "@/components/shared/faq-section";
import { PageHeader } from "@/components/shared/page-header";
import { WarehousePanel } from "@/components/shared/warehouse-panel";
import { Container } from "@/components/ui/container";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { CORE_FAQS } from "@/lib/content/faq";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata = pageMetadata({
  title: "Contact & Warehouse Hours",
  description:
    `KT Appliances, ${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.state}. Call or text ${siteConfig.phone.display}. Open daily ${siteConfig.hours.regular.label}, with after-hours appointments ${siteConfig.hours.afterHours.label}. Get directions to the warehouse.`,
  path: "/contact",
});

const CONTACT_FAQS = [CORE_FAQS[7], CORE_FAQS[8], CORE_FAQS[9], CORE_FAQS[11]];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Call, text, or come see it"
        description={`Texting is usually the fastest way to get an answer on a specific unit — we can send photos of the actual appliance, confirm dimensions, and quote delivery to your ZIP. The warehouse is at ${siteConfig.address.oneLine}.`}
        crumbs={[{ name: "Contact", path: "/contact" }]}
        aside={
          <div className="border border-white/15 bg-white/[0.04] p-6 sm:p-7">
            <p className="text-ui font-semibold uppercase tracking-wide text-white/55">Call or text</p>
            <CallLink
              context="contact-header"
              className="mt-3 block font-display text-[2.25rem] font-extrabold leading-none tracking-[-0.03em] text-white transition-colors hover:text-brand-400 sm:text-[2.75rem] tnum"
            >
              {siteConfig.phone.display}
            </CallLink>
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              <CallLink context="contact-header" className={buttonStyles("primary", "md", "w-full")}>
                <Phone aria-hidden className="size-4" strokeWidth={2.5} />
                Call
              </CallLink>
              <TextLink
                context="contact-header"
                message={`Hi ${siteConfig.name}, I have a question about your appliances.`}
                className={buttonStyles("outlineLight", "md", "w-full")}
              >
                <MessageSquareText aria-hidden className="size-4" strokeWidth={2.5} />
                Text
              </TextLink>
              <DirectionsLink
                context="contact-header"
                className={buttonStyles("outlineLight", "md", "w-full")}
              >
                <Navigation aria-hidden className="size-4" strokeWidth={2.5} />
                Directions
              </DirectionsLink>
              <EmailLink
                context="contact-header"
                className={buttonStyles("outlineLight", "md", "w-full")}
              >
                <Mail aria-hidden className="size-4" strokeWidth={2.5} />
                Email
              </EmailLink>
            </div>
            <p className="mt-5 break-all text-[13.5px] text-white/55">{siteConfig.email}</p>
          </div>
        }
      />

      <Section tone="white" size="md">
        <Container>
          <WarehousePanel />

          {/* After-hours — a genuine differentiator, so it gets its own block */}
          <div className="mt-6 flex flex-col gap-6 border border-line bg-ink-950 p-6 text-white sm:p-8 lg:flex-row lg:items-center lg:justify-between on-dark">
            <div className="flex gap-4">
              <CalendarClock
                aria-hidden
                className="mt-0.5 size-7 shrink-0 text-brand-400"
                strokeWidth={1.9}
              />
              <div>
                <h2 className="font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">
                  Can&apos;t get here before 5 PM?
                </h2>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/70">
                  After-hours visits run {siteConfig.hours.afterHours.label},{" "}
                  {siteConfig.hours.afterHours.days.toLowerCase()}.{" "}
                  {siteConfig.hours.afterHours.note} Book a slot below, or text or call ahead and
                  we&apos;ll set a time and have the unit ready when you arrive.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row">
              <Link href="/schedule" className={buttonStyles("primary", "lg")}>
                Book an Appointment
              </Link>
              <TextLink
                context="after-hours"
                message={`Hi ${siteConfig.name}, I'd like to schedule an after-hours visit to the warehouse.`}
                className={buttonStyles("outlineLight", "lg")}
              >
                Text Us
              </TextLink>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="bone" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-5">
              <ModuleHeader title="Tell us what you need" />
              <p className="text-[15px] leading-relaxed text-ink-600">
                If you&apos;d rather write it out than call, send this and we&apos;ll get back to
                you. Include the appliance, brand or size you&apos;re after — and your ZIP code if
                you&apos;ll need delivery.
              </p>
              <div className="mt-8">
                <FaqSection entries={CONTACT_FAQS} />
              </div>
            </div>

            <div className="min-w-0 lg:col-span-7">
              <div className="border border-line bg-white p-6 sm:p-8">
                <LeadForm
                  inquiryType="general"
                  formLocation="contact"
                  submitLabel="Send Message"
                  messageLabel="How can we help?"
                  messagePlaceholder="e.g. Looking for a 30-inch electric range under $600, and I'd need delivery to 18360"
                />
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
