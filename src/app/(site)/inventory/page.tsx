import { Suspense } from "react";

import { InventoryBrowser } from "@/components/inventory/inventory-browser";
import { ProductGridSkeleton } from "@/components/inventory/inventory-grid";
import { QuickCategoryNav } from "@/components/inventory/quick-category-nav";
import { ContactCta } from "@/components/shared/contact-cta";
import { PageHeader } from "@/components/shared/page-header";
import { Container } from "@/components/ui/container";
import { getInventoryFacets } from "@/lib/inventory/repository";
import { quickLinksFor } from "@/lib/navigation";
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
  const [params, facets] = await Promise.all([searchParams, getInventoryFacets()]);
  const quickLinks = quickLinksFor(facets);

  return (
    <>
      <PageHeader
        eyebrow="Warehouse inventory"
        title="Shop all appliances"
        description={`Each listing shows the brand, model number, cosmetic condition and price. Comparison prices appear only where we have a verified retail price for the same model. Warehouse pickup in ${siteConfig.address.city}, delivery available across ${siteConfig.serviceStatesShort.join(", ")}.`}
        crumbs={[{ name: "Inventory", path: "/inventory" }]}
      />

      {quickLinks.length > 0 ? (
        <div className="border-b border-line bg-bone-50">
          <Container className="py-4">
            <h2 className="eyebrow mb-3 text-ink-500">Popular searches</h2>
            <QuickCategoryNav links={quickLinks} />
          </Container>
        </div>
      ) : null}

      <Suspense
        key={JSON.stringify(params)}
        fallback={
          <Container className="py-10">
            <ProductGridSkeleton count={8} />
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
