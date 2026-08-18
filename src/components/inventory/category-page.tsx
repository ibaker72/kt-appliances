import { Suspense } from "react";
import Link from "next/link";

import { InventoryBrowser } from "@/components/inventory/inventory-browser";
import { ProductGridSkeleton } from "@/components/inventory/inventory-grid";
import { ListViewTracker } from "@/components/inventory/product-view-tracker";
import { ContactCta } from "@/components/shared/contact-cta";
import { FaqSection } from "@/components/shared/faq-section";
import { PageHeader } from "@/components/shared/page-header";
import { Container } from "@/components/ui/container";
import { ModuleHeader, Section } from "@/components/ui/section";
import { buttonStyles } from "@/components/ui/button";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { getCategoryCounts } from "@/lib/inventory/repository";
import { getCachedNavigationMenu } from "@/lib/inventory/navigation-cache";
import { CATEGORIES, CATEGORY_LIST, type ApplianceCategory } from "@/lib/inventory/types";
import type { RawSearchParams } from "@/lib/inventory/search-params";
import { CATEGORY_FAQS, CATEGORY_SHARED_FAQS } from "@/lib/content/faq";
import { siteConfig } from "@/lib/site-config";

/**
 * Category-specific copy.
 *
 * Each category page needs a reason to exist beyond a filtered grid, so every
 * one carries buying guidance written for that appliance — what to measure, what
 * hookup it needs, what the common gotcha is. That is also what makes these
 * pages worth ranking.
 */
const BUYING_NOTES: Record<ApplianceCategory, { title: string; points: string[] }> = {
  refrigerators: {
    title: "Before you buy a refrigerator",
    points: [
      "Measure the opening width, depth and height — then measure the doorway and hallway the unit has to pass through. A standard 36-inch fridge will not fit through a 32-inch door without removing the doors.",
      "Leave about an inch of clearance on the sides and top for airflow, and check that the door has room to swing fully open against an adjacent wall or cabinet.",
      "A water and ice dispenser needs a water line. If your kitchen does not have one, plan for a line to be run or choose a unit without a dispenser.",
      "Check where the cosmetic damage is on the listing. Damage on a side panel usually disappears once the unit is between cabinets; damage on a door is visible every day.",
    ],
  },
  washers: {
    title: "Before you buy a washer",
    points: [
      "Front load and top load fit differently. Front load units can be stacked with a matching dryer; top load units cannot.",
      "Confirm you have hot and cold hookups and a drain standpipe, and measure the space including room for hoses behind the machine.",
      "If the washer is going upstairs or into a closet, check the door and stair width before you buy — laundry pairs are heavy and awkward.",
      "Every washer we list is run through a test cycle. The listing tells you what was checked.",
    ],
  },
  dryers: {
    title: "Before you buy a dryer",
    points: [
      "Check your hookup first. An electric dryer needs a 240V outlet; a gas dryer needs a gas line plus a standard outlet. They are not interchangeable.",
      "Electric dryers use either a 3-prong or 4-prong cord depending on the age of the house. Cords are inexpensive and swappable, but you need the right one.",
      "Confirm the vent location. Most dryers vent out the back, and a tight closet install may need a periscope vent.",
      "Measure the depth with the door open if the dryer is going into a closet with bifold doors.",
    ],
  },
  "washer-dryer-sets": {
    title: "Before you buy a laundry set",
    points: [
      "Buying the pair together is usually the cheapest way to replace a full laundry room, and the units match.",
      "Confirm both hookups: water plus drain for the washer, and either 240V or gas for the dryer.",
      "If you plan to stack a front load pair, you need the manufacturer's stacking kit for those specific models — it is sold separately.",
      "Measure the total footprint side by side, plus a few inches behind for hoses and venting.",
    ],
  },
  ranges: {
    title: "Before you buy a range or oven",
    points: [
      "Fuel type is the first question: gas needs a gas line, electric needs a 240V outlet, and dual fuel needs both. Converting is not a small job.",
      "Standard freestanding ranges are 30 inches wide. Slide-in models sit flush with the counter and usually need a specific counter cutout.",
      "Check the depth against your counter, and confirm the oven door has room to open fully in front of an island.",
      "Induction cooktops need magnetic cookware — test a pan with a magnet before committing.",
    ],
  },
  dishwashers: {
    title: "Before you buy a dishwasher",
    points: [
      "Nearly all built-in dishwashers fit a standard 24-inch opening, but confirm the height of your cabinet run — some counters sit lower than standard.",
      "You need a water supply, a drain connection and power. Some units are hardwired and some plug in; ask which the unit you want uses.",
      "Installation is available if you need the old dishwasher pulled out and the new one hooked up.",
      "Check whether the listing is a built-in or a portable unit — portables roll up to the sink and need no cabinet space.",
    ],
  },
  other: {
    title: "Before you buy",
    points: [
      "Over-the-range microwaves need a 30-inch cabinet opening above the range plus mounting hardware and, for a vented install, a duct path.",
      "Freezers need clearance for airflow and a dedicated outlet. Check whether a unit is rated for garage temperatures if that is where it is going.",
      "Measure the space and the path in — chest freezers in particular are wider than most doorways expect.",
      "Stock in this category changes fastest. Call or text to ask what came in this week.",
    ],
  },
};

export async function CategoryPage({
  slug,
  searchParams,
}: {
  slug: ApplianceCategory;
  searchParams: RawSearchParams;
}) {
  const category = CATEGORIES[slug];
  const [counts, menu] = await Promise.all([getCategoryCounts(), getCachedNavigationMenu()]);
  const count = counts[slug] ?? 0;
  const notes = BUYING_NOTES[slug];
  // Category-specific answers first, then the two shared ones every shopper
  // still needs. One `FAQPage` graph per route, and no two routes emit the same
  // one — duplicate FAQ structured data across seven near-identical pages is
  // exactly what gets rich results discarded.
  const faqs = [...(CATEGORY_FAQS[slug] ?? []), ...CATEGORY_SHARED_FAQS];
  // Reuses the header's cached read, so the merchandising strip costs no query.
  const panel = menu.categories.find((entry) => entry.slug === slug);

  return (
    <>
      <ListViewTracker listName={category.name} category={slug} resultCount={count} />

      <PageHeader
        title={category.name}
        description={category.intro}
        crumbs={[
          { name: "Inventory", path: "/inventory" },
          { name: category.name, path: category.path },
        ]}
        actions={
          <>
            <TextLink
              context={`category-${slug}`}
              message={`Hi ${siteConfig.name}, what ${category.name.toLowerCase()} do you have available right now?`}
              className={buttonStyles("primary", "lg")}
            >
              Text About {category.name}
            </TextLink>
            <CallLink context={`category-${slug}`} className={buttonStyles("outlineLight", "lg")}>
              Call {siteConfig.phone.display}
            </CallLink>
          </>
        }
      />

      {/* Merchandising strip: how much is here, the types worth jumping straight
          to, and the price bands — all gated on real stock by `getNavigationMenu`. */}
      {panel && (panel.subcategories.length > 0 || panel.priceBands.length > 0) ? (
        <div className="border-b border-line bg-bone-50">
          <Container className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            {count > 0 ? (
              <p className="text-ui font-semibold text-ink-950 tnum">
                {count} available
              </p>
            ) : null}
            {panel.subcategories.length > 0 ? (
              <nav aria-label={`${category.name} types`} className="min-w-0">
                <ul className="no-scrollbar flex items-center gap-2 overflow-x-auto">
                  {panel.subcategories.map((link) => (
                    <li key={link.href} className="shrink-0">
                      <Link
                        href={link.href}
                        className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-white px-3 py-1 text-ui text-ink-700 transition-colors hover:border-ink-950 hover:text-brand-500"
                      >
                        {link.label}
                        <span className="text-ink-400 tnum">{link.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            {panel.priceBands.length > 0 ? (
              <ul className="ml-auto hidden items-center gap-2 lg:flex">
                {panel.priceBands.map((band) => (
                  <li key={band.href}>
                    <Link
                      href={band.href}
                      className="text-ui text-ink-600 underline underline-offset-4 hover:text-brand-500"
                    >
                      {band.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </Container>
        </div>
      ) : null}

      <Suspense
        key={JSON.stringify(searchParams)}
        fallback={
          <Container className="py-10">
            <ProductGridSkeleton count={8} />
          </Container>
        }
      >
        <InventoryBrowser
          searchParams={searchParams}
          basePath={category.path}
          category={slug}
          listName={`${siteConfig.name} ${category.name}`}
          emptyTitle={`No ${category.name.toLowerCase()} listed right now`}
          emptyDescription="Stock in this category turns over quickly and new units arrive most weeks. Call or text us and we'll tell you what's coming in."
        />
      </Suspense>

      {/* Buying guidance — the reason this page deserves to rank */}
      <Section tone="bone" size="md">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-5">
              <ModuleHeader title={notes.title} />
              <p className="mt-5 text-[15px] leading-relaxed text-ink-600">
                Measuring wrong is the most common reason an appliance goes back. If you are not
                sure, text us the dimensions of your space and we will check them against the unit
                before you commit.
              </p>
              <TextLink
                context={`category-${slug}-measure`}
                message={`Hi ${siteConfig.name}, can you help me check whether a ${category.singular.toLowerCase()} will fit my space?`}
                className={buttonStyles("dark", "md", "mt-6")}
              >
                Text us your measurements
              </TextLink>
            </div>

            <div className="min-w-0 lg:col-span-7">
              <ul className="border-t border-line">
                {notes.points.map((point, index) => (
                  <li key={point} className="flex gap-5 border-b border-line py-5">
                    <span className="font-display text-[13px] font-bold text-brand-500 tnum">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="text-[15px] leading-relaxed text-ink-700">{point}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-16 grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-4">
              <ModuleHeader title={`${category.name} FAQs`} />
            </div>
            <div className="min-w-0 lg:col-span-8">
              <FaqSection entries={faqs} />
            </div>
          </div>
        </Container>
      </Section>

      {/* Cross-category navigation */}
      <Section tone="white" size="sm">
        <Container>
          <h2 className="text-ui font-semibold uppercase tracking-wide text-ink-500">Shop other categories</h2>
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {CATEGORY_LIST.filter((entry) => entry.slug !== slug).map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={entry.path}
                  className="inline-flex min-h-11 items-center border border-line px-4 py-2 text-[14px] font-medium text-ink-800 transition-colors hover:border-ink-950 hover:text-brand-500"
                >
                  {entry.name}
                  {counts[entry.slug] ? (
                    <span className="ml-2 text-[12.5px] text-ink-400 tnum">
                      {counts[entry.slug]}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <ContactCta
        title={`Looking for a specific ${category.singular.toLowerCase()}?`}
        message={`Hi ${siteConfig.name}, I'm looking for a ${category.singular.toLowerCase()}. What do you have available?`}
        description="Tell us the brand, size or budget you're working with. We'll check the floor and let you know what's coming in."
        context={`category-${slug}-footer`}
      />
    </>
  );
}
