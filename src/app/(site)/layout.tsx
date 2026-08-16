import type { ReactNode } from "react";

import { MobileBottomActions } from "@/components/layout/mobile-bottom-actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { DemoDataNotice } from "@/components/layout/demo-data-notice";

/** Public site shell. The admin area has its own layout and is not wrapped by this. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DemoDataNotice />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <MobileBottomActions />
    </>
  );
}
