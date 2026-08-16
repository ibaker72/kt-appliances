import { Bullet, LegalSection } from "@/components/shared/legal-content";
import { PageHeader } from "@/components/shared/page-header";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How KT Appliances collects, uses and protects the information you submit through this website, including contact forms, analytics and advertising measurement.",
  path: "/privacy",
});

const EFFECTIVE = "February 2026";

/**
 * Plain-language privacy policy.
 *
 * Describes only what the site actually does today: form submissions, GA4 and
 * the Meta Pixel when configured, and transactional email. Deliberately contains
 * no SMS marketing consent language, because no marketing SMS program exists —
 * adding that copy before the program does would be both inaccurate and a
 * compliance problem.
 */
export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description={`How we handle the information you give us through this website. Effective ${EFFECTIVE}.`}
        crumbs={[{ name: "Privacy Policy", path: "/privacy" }]}
        tone="bone"
      />

      <Section tone="white" size="md">
        <Container width="narrow">
          <p className="border-l-[3px] border-ink-300 bg-bone-50 py-4 pl-5 pr-4 text-[14.5px] leading-relaxed text-ink-600">
            This page explains our practices in plain language. It is not legal advice, and it is not
            a substitute for a policy reviewed by an attorney for your jurisdiction.
          </p>

          <div className="mt-10">
            <LegalSection heading="Who we are">
              <p>
                {siteConfig.legalName} operates this website. Our warehouse is at{" "}
                {siteConfig.address.street}, {siteConfig.address.city}, {siteConfig.address.state}{" "}
                {siteConfig.address.postalCode}. You can reach us at{" "}
                <a href={`tel:${siteConfig.phone.e164}`}>{siteConfig.phone.display}</a> or{" "}
                <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
              </p>
            </LegalSection>

            <LegalSection heading="Information you give us">
              <p>
                When you submit a form on this site — an appliance inquiry, a delivery quote request,
                a financing question or a general message — we collect what you type into it:
              </p>
              <ul>
                <Bullet>Your name and phone number</Bullet>
                <Bullet>Your email address and ZIP code, if you provide them</Bullet>
                <Bullet>The message you write and which appliance you were viewing</Bullet>
              </ul>
              <p>
                We use this to respond to your request — to answer your question, quote delivery, or
                arrange a purchase. We do not sell it, rent it, or share it with third parties for
                their own marketing.
              </p>
            </LegalSection>

            <LegalSection heading="Phone numbers and text messages">
              <p>
                We use the phone number you give us to reply to your specific request, by call or by
                text. We do not run an SMS marketing program and we do not add your number to a
                promotional text list. If we ever start one, it will be opt-in and separate from
                this, and this page will be updated before it launches.
              </p>
              <p>Standard message and data rates from your carrier may apply to texts you send us.</p>
            </LegalSection>

            <LegalSection heading="Information collected automatically">
              <p>
                Like most websites, this site collects some technical information automatically —
                your IP address, browser and device type, the pages you view, and the site or ad that
                referred you.
              </p>
              <p>
                We also record campaign parameters (such as <code>utm_source</code> and{" "}
                <code>utm_campaign</code>) attached to links in our advertising, so we can tell which
                ads are producing inquiries. If you submit a form, that campaign information is
                attached to your inquiry.
              </p>
            </LegalSection>

            <LegalSection heading="Analytics and advertising">
              <p>
                Where configured, this site uses Google Analytics to understand how the site is used,
                and the Meta (Facebook) Pixel to measure the performance of our advertising. These
                services set cookies or similar identifiers and receive information about your visit.
              </p>
              <ul>
                <Bullet>
                  Google&apos;s handling of that data is governed by Google&apos;s privacy policy.
                </Bullet>
                <Bullet>
                  Meta&apos;s handling of that data is governed by Meta&apos;s data policy.
                </Bullet>
                <Bullet>
                  You can limit this through your browser settings, an ad blocker, or your device&apos;s
                  ad tracking controls.
                </Bullet>
              </ul>
            </LegalSection>

            <LegalSection heading="Cookies and local storage">
              <p>
                We store campaign attribution in your browser&apos;s session storage so that if you
                arrive from an ad and then browse the site before contacting us, the inquiry is still
                credited to the right campaign. That data is cleared when you close the browser tab
                and is never shared with anyone else. Analytics providers may set their own cookies as
                described above.
              </p>
            </LegalSection>

            <LegalSection heading="Email">
              <p>
                If you give us an email address, we may send you a confirmation that we received your
                request, and we may reply to you by email. We do not add you to a newsletter or
                marketing email list from a website inquiry.
              </p>
            </LegalSection>

            <LegalSection heading="How long we keep information">
              <p>
                We keep inquiry records for as long as needed to serve the customer relationship and
                to meet ordinary business and record-keeping needs. You can ask us to delete your
                information at any time using the contact details above.
              </p>
            </LegalSection>

            <LegalSection heading="Your choices">
              <ul>
                <Bullet>Ask us what information we hold about you.</Bullet>
                <Bullet>Ask us to correct or delete it.</Bullet>
                <Bullet>Ask us to stop contacting you — just tell us and we will stop.</Bullet>
                <Bullet>
                  Limit analytics and advertising measurement through your browser and device
                  settings.
                </Bullet>
              </ul>
            </LegalSection>

            <LegalSection heading="Children">
              <p>
                This site is intended for adults purchasing appliances. We do not knowingly collect
                information from children under 13.
              </p>
            </LegalSection>

            <LegalSection heading="Changes to this policy">
              <p>
                If we change how we handle information — for example, if we add a financing provider
                integration or launch an opt-in SMS program — we will update this page and change the
                effective date above.
              </p>
            </LegalSection>

            <LegalSection heading="Contact us">
              <p>
                Questions about this policy? Call or text{" "}
                <a href={`tel:${siteConfig.phone.e164}`}>{siteConfig.phone.display}</a>, email{" "}
                <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>, or write to us at{" "}
                {siteConfig.address.street}, {siteConfig.address.city}, {siteConfig.address.state}{" "}
                {siteConfig.address.postalCode}.
              </p>
            </LegalSection>
          </div>
        </Container>
      </Section>
    </>
  );
}
