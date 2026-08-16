import { Suspense } from "react";

import { InventoryBrowser } from "@/components/inventory/inventory-browser";
import { InventoryGridSkeleton } from "@/components/inventory/inventory-grid";
import { ContactCta } from "@/components/shared/contact-cta";
import { PageHeader } from "@/components/shared/page-header";
import { Container } from "@/components/ui/container";
import { pageMetadata } from "@/lib/seo/metadata";
import type { RawSearchParams } from "@/lib/inventory/search-params";
import { siteConfig } from "@/lib/site-config";

export const revalidate = 120;

export const metadata = pageMetadata({
  title: "Appliance Inventory",
  description:
    "Browse every scratch & dent and open-box appliance currently in the KT Appliances warehouse — refrigerators, washers, dryers, ranges and dishwashers. Filter by brand, price, condition and fuel type.",
  path: "/inventory",
});

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Warehouse inventory"
        title="Every appliance on the floor"
        description={`Each listing shows the brand, model number, cosmetic condition and price. Comparison prices appear only where we have a verified retail price for the same model. Warehouse pickup in ${siteConfig.address.city}, delivery available across ${siteConfig.serviceStatesShort.join(", ")}.`}
        crumbs={[{ name: "Inventory", path: "/inventory" }]}
      />

      <Suspense
        key={JSON.stringify(params)}
        fallback={
          <Container className="py-10">
            <InventoryGridSkeleton count={8} />
          </Container>
        }
      >
        <InventoryBrowser
          searchParams={params}
          basePath="/inventory"
          listName="KT Appliances warehouse inventory"
        />
      </Suspense>

      <ContactCta
        title="Not seeing what you need?"
        description="Inventory turns over daily and units are added before they reach the website. Text us the appliance, brand or size you're after and we'll check the floor."
      />
    </>
  );
}
