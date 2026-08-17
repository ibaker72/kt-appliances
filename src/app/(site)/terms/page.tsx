import { Bullet, LegalSection } from "@/components/shared/legal-content";
import { PageHeader } from "@/components/shared/page-header";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata = pageMetadata({
  title: "Terms of Sale & Website Use",
  description:
    "Terms covering use of the KT Appliances website, how pricing and availability work, condition disclosure on scratch & dent appliances, delivery, and warranty options.",
  path: "/terms",
});

const EFFECTIVE = "February 2026";

export default function TermsPage() {
  return (
    <>
      <PageHeader
        title="Terms of Sale & Website Use"
        description={`The basics of how buying from us works and what this website does and does not promise. Effective ${EFFECTIVE}.`}
        crumbs={[{ name: "Terms", path: "/terms" }]}
        tone="bone"
      />

      <Section tone="white" size="md">
        <Container width="narrow">
          <p className="border-l-[3px] border-ink-300 bg-bone-50 py-4 pl-5 pr-4 text-[14.5px] leading-relaxed text-ink-600">
            These terms are written in plain language for clarity. They are not legal advice, and
            they do not replace terms reviewed by an attorney or the written documents provided with
            a purchase.
          </p>

          <div className="mt-10">
            <LegalSection heading="About this website">
              <p>
                This website is operated by {siteConfig.legalName}, {siteConfig.address.street},{" "}
                {siteConfig.address.city}, {siteConfig.address.state}{" "}
                {siteConfig.address.postalCode}. By using it, you agree to these terms.
              </p>
            </LegalSection>

            <LegalSection heading="Inventory listings are not offers of sale">
              <p>
                Appliances shown on this site are single units of physical stock in a working
                warehouse. A listing is an invitation to contact us about a unit, not a binding offer,
                and viewing or inquiring about an appliance does not reserve it.
              </p>
              <p>
                Stock moves quickly. A unit may sell between the time it is listed and the time you
                contact us, and we may not always have removed the listing yet. A sale is complete
                only when payment is made and confirmed.
              </p>
            </LegalSection>

            <LegalSection heading="Pricing and comparison prices">
              <ul>
                <Bullet>
                  Prices shown are in US dollars and do not include applicable sales tax, delivery,
                  installation or haul-away.
                </Bullet>
                <Bullet>
                  Where a comparison price is shown, it reflects a retail price we have on record for
                  the same model. Comparison prices are shown only where we have one — most listings
                  show only our price.
                </Bullet>
                <Bullet>
                  We try to keep the site accurate, but pricing and availability errors can occur. We
                  reserve the right to correct an error and to decline a sale at an incorrectly listed
                  price.
                </Bullet>
              </ul>
            </LegalSection>

            <LegalSection heading="Condition of scratch & dent appliances">
              <p>
                Appliances sold as scratch & dent, open box or refurbished carry cosmetic damage that
                is described on the listing and disclosed before purchase. That disclosed cosmetic
                condition is the basis for the discounted price and is not treated as a defect after
                the sale.
              </p>
              <p>
                We encourage you to inspect an appliance in person, or to request photographs of the
                specific unit, before purchasing. Descriptions and photographs are provided in good
                faith; the unit itself is the definitive statement of its condition.
              </p>
            </LegalSection>

            <LegalSection heading="Fit and measurements">
              <p>
                It is the buyer&apos;s responsibility to confirm that an appliance fits the intended
                space and the path into it, and that the required electrical, gas, water and venting
                connections are present and compatible. We are glad to help you check measurements
                before you buy — ask us, because it is much easier to resolve beforehand.
              </p>
            </LegalSection>

            <LegalSection heading="Delivery, installation and haul-away">
              <ul>
                <Bullet>
                  These are additional services quoted separately based on distance, the appliance and
                  what is required at your location.
                </Bullet>
                <Bullet>
                  Same-day delivery may be available for an extra charge but is not guaranteed and
                  depends on scheduling.
                </Bullet>
                <Bullet>
                  Delivery windows are estimates. Someone aged 18 or over must be present to receive
                  and sign for a delivery.
                </Bullet>
                <Bullet>
                  Installation requires compatible existing connections. Where a hookup is missing or
                  not to code, installation may not be possible on the day.
                </Bullet>
              </ul>
            </LegalSection>

            <LegalSection heading="Warranty">
              <p>
                1-year warranty options are available on qualifying appliances. Coverage is not
                automatic on every unit, terms vary by appliance and by the option selected, and the
                written terms provided at the time of purchase govern. Disclosed cosmetic damage is
                not covered.
              </p>
            </LegalSection>

            <LegalSection heading="Financing">
              <p>
                Financing options are offered through third parties. Approval, rates and terms are
                determined by the financing provider and your application, not by us. Nothing on this
                site is an offer of credit or a promise of approval.
              </p>
            </LegalSection>

            <LegalSection heading="Payment, returns and cancellations">
              <p>
                Payment terms, deposits, returns and cancellations are handled at the point of sale
                and are set out in the documents provided with your purchase. If you have a question
                about a purchase you have made, call or text{" "}
                <a href={`tel:${siteConfig.phone.e164}`}>{siteConfig.phone.display}</a> and we will
                work through it with you.
              </p>
            </LegalSection>

            <LegalSection heading="Website content">
              <p>
                Buying guides and other editorial content on this site are general information, not
                professional installation, electrical or plumbing advice. Work involving gas lines and
                electrical circuits should be carried out by a qualified professional in accordance
                with local code.
              </p>
              <p>
                Brand names and model numbers are used to identify the appliances we sell. Those marks
                belong to their respective owners, and their use here does not imply any affiliation
                with or endorsement by them.
              </p>
            </LegalSection>

            <LegalSection heading="Contact">
              <p>
                Questions about these terms? Call or text{" "}
                <a href={`tel:${siteConfig.phone.e164}`}>{siteConfig.phone.display}</a> or email{" "}
                <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
              </p>
            </LegalSection>
          </div>
        </Container>
      </Section>
    </>
  );
}
