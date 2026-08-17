import { cookies } from "next/headers";
import Link from "next/link";

import { InventoryGrid } from "@/components/inventory/inventory-grid";
import { ClearSavedButton } from "@/components/inventory/save-button";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { Container } from "@/components/ui/container";
import { buttonStyles } from "@/components/ui/button";
import { getAppliancesBySlugs } from "@/lib/inventory/repository";
import { SAVED_COOKIE, parseSaved } from "@/lib/inventory/saved";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata = pageMetadata({
  title: "Saved appliances",
  description: "The appliances you have saved from KT Appliances' warehouse inventory.",
  path: "/inventory/saved",
  // One shopper's personal shortlist — nothing to index.
  noindex: true,
});

export default async function SavedPage() {
  const store = await cookies();
  const slugs = parseSaved(store.get(SAVED_COOKIE)?.value);

  // Re-read from the catalogue rather than trusting the cookie: prices and
  // availability are current, and a unit that has since been delisted drops out.
  const items = await getAppliancesBySlugs(slugs);
  const missing = slugs.length - items.length;

  return (
    <>
      <div className="border-b border-line bg-bone-50">
        <Container className="py-4">
          <Breadcrumbs
            crumbs={[
              { name: "Inventory", path: "/inventory" },
              { name: "Saved", path: "/inventory/saved" },
            ]}
          />
          <h1 className="mt-3 font-display text-[1.6rem] font-extrabold text-ink-950 sm:text-[2rem]">
            Saved appliances
          </h1>
        </Container>
      </div>

      <Container className="py-8">
        {items.length === 0 ? (
          <div className="rounded-md border border-line bg-bone-50 px-6 py-14 text-center">
            <h2 className="font-display text-xl font-bold text-ink-950">Nothing saved yet</h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-600">
              Tap the heart on any appliance to keep it here while you shop. The list stays on this
              device — there is no account to create.
            </p>
            <Link href="/inventory" className={buttonStyles("primary", "md", "mt-6")}>
              Browse inventory
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-ui text-ink-600">
                <span className="font-semibold text-ink-950 tnum">{items.length}</span> saved
                {missing > 0 ? (
                  // Said plainly rather than silently dropping them.
                  <span className="text-ink-500">
                    {" "}
                    · {missing} no longer listed
                  </span>
                ) : null}
              </p>
              <ClearSavedButton />
            </div>

            <InventoryGrid appliances={items} columns={4} priorityCount={4} />

            <div className="mt-10 rounded-md border border-line bg-bone-50 p-6 text-center">
              <h2 className="font-display text-lg font-bold text-ink-950">
                Ready to ask about these?
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-ink-600">
                Text or call and we&apos;ll confirm what&apos;s still on the floor, quote delivery,
                and hold anything you want to come see.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <TextLink
                  context="saved-list"
                  message={`Hi ${siteConfig.name}, I have a few appliances saved on your site and wanted to ask about them.`}
                  className={buttonStyles("primary", "md")}
                >
                  Text {siteConfig.phone.display}
                </TextLink>
                <CallLink context="saved-list" className={buttonStyles("outline", "md")}>
                  Call the warehouse
                </CallLink>
              </div>
            </div>
          </>
        )}
      </Container>
    </>
  );
}
