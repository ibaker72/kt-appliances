import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MobileBottomActions } from "@/components/layout/mobile-bottom-actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { Container } from "@/components/ui/container";
import { buttonStyles } from "@/components/ui/button";
import { CATEGORY_LIST } from "@/lib/inventory/types";
import { siteConfig } from "@/lib/site-config";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/**
 * 404. Lives at the app root rather than inside the (site) group so it can be
 * served for any unmatched URL, which means it composes the shell itself.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="on-dark bg-ink-950 text-white">
          <Container className="py-16 sm:py-24">
            <p className="eyebrow text-brand-400">404 — Page not found</p>
            <h1 className="mt-5 max-w-3xl font-display text-[2.25rem] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              Looks like this appliance moved out of the warehouse.
            </h1>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-white/70">
              The page you were after is not here. It may have sold, or the link may be out of date.
              Current inventory is one click away — or text us what you were looking for and
              we&apos;ll tell you what&apos;s on the floor.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/inventory" className={buttonStyles("primary", "lg", "w-full sm:w-auto")}>
                Browse Current Inventory
                <ArrowRight aria-hidden className="size-4" strokeWidth={2.5} />
              </Link>
              <TextLink
                context="404"
                message={`Hi ${siteConfig.name}, I'm looking for a specific appliance. What do you have available?`}
                className={buttonStyles("outlineLight", "lg", "w-full sm:w-auto")}
              >
                Text {siteConfig.phone.display}
              </TextLink>
              <CallLink context="404" className={buttonStyles("outlineLight", "lg", "w-full sm:w-auto")}>
                Call the warehouse
              </CallLink>
            </div>
          </Container>
        </section>

        <section className="bg-white py-14 sm:py-16">
          <Container>
            <h2 className="eyebrow text-ink-500">Shop by category</h2>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {CATEGORY_LIST.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={category.path}
                    className="inline-flex min-h-11 items-center border border-line px-4 py-2 text-[14.5px] font-medium text-ink-800 transition-colors hover:border-ink-950 hover:text-brand-500"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>

            <h2 className="eyebrow mt-12 text-ink-500">Or head to</h2>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {[
                { label: "Delivery & Installation", href: "/delivery-installation" },
                { label: "Financing", href: "/financing" },
                { label: "Warranty", href: "/warranty" },
                { label: "Buying Guides", href: "/guides" },
                { label: "Contact & Hours", href: "/contact" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center border border-line px-4 py-2 text-[14.5px] font-medium text-ink-800 transition-colors hover:border-ink-950 hover:text-brand-500"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      </main>
      <SiteFooter />
      <MobileBottomActions />
    </>
  );
}
