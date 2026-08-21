import type { ReactNode } from "react";

import { ApplianceAssistant } from "@/components/chat/appliance-assistant";
import { MobileBottomActions } from "@/components/layout/mobile-bottom-actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { DemoDataNotice } from "@/components/layout/demo-data-notice";
import { getCachedNavigationMenu } from "@/lib/inventory/navigation-cache";
import { quickLinksFor } from "@/lib/navigation";

/** Public site shell. The admin area has its own layout and is not wrapped by this. */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const { categories, facets } = await getCachedNavigationMenu();

  return (
    <>
      <DemoDataNotice />
      <SiteHeader categories={categories} quickLinks={quickLinksFor(facets)} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <MobileBottomActions />
      {/* Floating shopping assistant. Renders a launcher button and nothing
          else until it is opened — the panel is a separate chunk, fetched on
          the first click. It suppresses itself inside /admin. */}
      <ApplianceAssistant />
    </>
  );
}
