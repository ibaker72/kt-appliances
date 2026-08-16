import { Bullet, LegalSection } from "@/components/shared/legal-content";
import { PageHeader } from "@/components/shared/page-header";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata = pageMetadata({
  title: "Accessibility",
  description:
    "How KT Appliances approaches website accessibility, what has been implemented, and how to reach us if something on this site is difficult to use.",
  path: "/accessibility",
});

export default function AccessibilityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Accessibility"
        description="What we have done to make this site usable for everyone, and how to tell us when we have missed something."
        crumbs={[{ name: "Accessibility", path: "/accessibility" }]}
        tone="bone"
      />

      <Section tone="white" size="md">
        <Container width="narrow">
          <div>
            <LegalSection heading="Our approach">
              <p>
                We want anyone to be able to browse inventory, read an appliance&apos;s condition and
                contact us, regardless of how they use the web. We build toward the Web Content
                Accessibility Guidelines (WCAG) 2.1 Level AA as a working standard. We do not claim
                full conformance — that is an audited statement, and we would rather tell you what we
                have actually done.
              </p>
            </LegalSection>

            <LegalSection heading="What is implemented">
              <ul>
                <Bullet>Semantic HTML structure with a single, ordered heading hierarchy per page.</Bullet>
                <Bullet>A skip-to-content link as the first focusable element on every page.</Bullet>
                <Bullet>
                  Visible focus indicators on every interactive element, on both light and dark
                  backgrounds.
                </Bullet>
                <Bullet>
                  Text and interface colours checked for contrast against their backgrounds.
                </Bullet>
                <Bullet>
                  Descriptive alternative text on product images, and decorative images marked as
                  such.
                </Bullet>
                <Bullet>
                  Form inputs with associated labels, inline error messages tied to their fields, and
                  errors announced to assistive technology.
                </Bullet>
                <Bullet>
                  Touch targets sized for comfortable use on a phone, including the filter controls
                  and the persistent call/text bar.
                </Bullet>
                <Bullet>
                  Keyboard operation for menus, filters, the product gallery and the mobile filter
                  drawer, including closing with the Escape key.
                </Bullet>
                <Bullet>
                  Reduced-motion support: animations and smooth scrolling are disabled when your
                  system requests it.
                </Bullet>
              </ul>
            </LegalSection>

            <LegalSection heading="Known limitations">
              <p>
                The warehouse location map is an embedded third-party service, and we do not control
                its accessibility. The full address is always written out in text next to it, and a
                directions link is provided, so no information is available only through the map.
              </p>
            </LegalSection>

            <LegalSection heading="Tell us if something does not work">
              <p>
                If any part of this site is difficult or impossible for you to use, we want to hear
                about it — and in the meantime we will simply help you directly. Call or text{" "}
                <a href={`tel:${siteConfig.phone.e164}`}>{siteConfig.phone.display}</a> or email{" "}
                <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> and we will read you
                inventory, send photographs, quote delivery, or take your order over the phone.
              </p>
              <p>
                Please tell us the page and what happened, and we will work on it and follow up with
                you.
              </p>
            </LegalSection>

            <LegalSection heading="The warehouse">
              <p>
                If you have accessibility needs for an in-person visit to{" "}
                {siteConfig.address.street}, call or text ahead and we will make arrangements —
                including bringing a unit to the front for you to inspect.
              </p>
            </LegalSection>
          </div>
        </Container>
      </Section>
    </>
  );
}
