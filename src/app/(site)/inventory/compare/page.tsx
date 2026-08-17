import Link from "next/link";
import { Check, Minus } from "lucide-react";

import { ProductImage } from "@/components/inventory/product-image";
import { ConditionBadge } from "@/components/inventory/availability-badge";
import { CallLink, TextLink } from "@/components/contact/contact-links";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Container } from "@/components/ui/container";
import { buttonStyles } from "@/components/ui/button";
import { COMPARE_LIMIT, type RawSearchParams } from "@/lib/inventory/search-params";
import { queryInventory } from "@/lib/inventory/repository";
import {
  CATEGORIES,
  CONDITION_LABELS,
  FUEL_LABELS,
  formatPrice,
  savingsFor,
  type Appliance,
} from "@/lib/inventory/types";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata = pageMetadata({
  title: "Compare appliances",
  description:
    "Compare scratch & dent appliances from KT Appliances side by side — price, condition, capacity, dimensions and what each unit includes.",
  path: "/inventory/compare",
  // A comparison of arbitrary ids is a shopper tool, not a page worth indexing.
  noindex: true,
});

/** Rows are only rendered when at least one unit in the comparison has the value. */
const SPEC_ROWS: Array<{ label: string; value: (item: Appliance) => string | null }> = [
  { label: "Brand", value: (item) => item.brand },
  { label: "Model number", value: (item) => item.modelNumber },
  { label: "Type", value: (item) => item.subcategory ?? CATEGORIES[item.category].name },
  { label: "Condition", value: (item) => CONDITION_LABELS[item.condition] },
  { label: "Color", value: (item) => item.color },
  { label: "Finish", value: (item) => item.finish },
  { label: "Capacity", value: (item) => item.capacity },
  { label: "Dimensions (W × D × H)", value: (item) => item.dimensions },
  { label: "Fuel type", value: (item) => (item.fuelType ? FUEL_LABELS[item.fuelType] : null) },
];

const SERVICE_ROWS: Array<{ label: string; value: (item: Appliance) => boolean }> = [
  { label: "Delivery available", value: (item) => item.deliveryAvailable },
  { label: "Installation available", value: (item) => item.installationAvailable },
  { label: "Haul-away available", value: (item) => item.haulAwayAvailable },
  { label: "Warranty available", value: (item) => item.warrantyAvailable },
];

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.ids) ? params.ids.join(",") : (params.ids ?? "");
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, COMPARE_LIMIT);

  // Pulled from the live catalogue rather than trusted from the URL, so a stale
  // or hand-edited link can only ever show fewer units, never invented ones.
  const pool = ids.length > 0 ? await queryInventory({ limit: 200, sort: "featured" }) : null;
  const items = ids
    .map((id) => pool?.items.find((item) => item.id === id))
    .filter((item): item is Appliance => Boolean(item));

  return (
    <>
      <div className="border-b border-line bg-bone-50">
        <Container className="py-4">
          <Breadcrumbs
            crumbs={[
              { name: "Inventory", path: "/inventory" },
              { name: "Compare", path: "/inventory/compare" },
            ]}
          />
          <h1 className="mt-3 font-display text-[1.6rem] font-extrabold text-ink-950 sm:text-[2rem]">
            Compare appliances
          </h1>
        </Container>
      </div>

      <Container className="py-8">
        {items.length === 0 ? (
          <div className="rounded-md border border-line bg-bone-50 px-6 py-14 text-center">
            <h2 className="font-display text-xl font-bold text-ink-950">
              Nothing selected to compare
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-600">
              Tick <span className="font-semibold">Compare</span> on two or more appliances in the
              inventory to see them side by side.
            </p>
            <Link href="/inventory" className={buttonStyles("primary", "md", "mt-6")}>
              Browse inventory
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[14px]">
              <caption className="sr-only">
                Side-by-side comparison of {items.length} appliances
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="w-[150px] text-left align-bottom">
                    <span className="sr-only">Attribute</span>
                  </th>
                  {items.map((item) => {
                    const savings = savingsFor(item);
                    return (
                      <th key={item.id} scope="col" className="p-3 text-left align-bottom">
                        <Link href={`/inventory/${item.slug}`} className="block">
                          <span className="block overflow-hidden rounded-sm bg-bone-50">
                            <ProductImage
                              appliance={item}
                              sizes="220px"
                              framed={false}
                              className="aspect-square"
                            />
                          </span>
                          <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                            {item.brand}
                          </span>
                          <span className="mt-1 block clamp-2 font-semibold leading-snug text-ink-950">
                            {item.title}
                          </span>
                        </Link>
                        <span className="mt-2 block font-display text-[22px] font-extrabold text-ink-950 tnum">
                          <span className="align-top text-[0.62em]">$</span>
                          {Math.round(item.price).toLocaleString("en-US")}
                        </span>
                        {savings != null ? (
                          <span className="mt-1 inline-block rounded-sm bg-save-50 px-1.5 py-0.5 text-[11.5px] font-bold text-save-700 tnum">
                            Save {formatPrice(savings)}
                          </span>
                        ) : null}
                        <span className="mt-2 block">
                          <ConditionBadge condition={item.condition} />
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {SPEC_ROWS.map((row) => {
                  const values = items.map((item) => row.value(item));
                  // A row nobody in the comparison has a value for is noise.
                  if (values.every((value) => !value)) return null;
                  return (
                    <tr key={row.label} className="border-t border-line">
                      <th
                        scope="row"
                        className="py-3 pr-4 text-left align-top text-ui font-semibold uppercase tracking-wide text-ink-500"
                      >
                        {row.label}
                      </th>
                      {values.map((value, index) => (
                        <td key={items[index].id} className="break-words p-3 align-top text-ink-900">
                          {value ?? <span className="text-ink-400">Not listed</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}

                {SERVICE_ROWS.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <th
                      scope="row"
                      className="py-3 pr-4 text-left align-top text-ui font-semibold uppercase tracking-wide text-ink-500"
                    >
                      {row.label}
                    </th>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 align-top">
                        {row.value(item) ? (
                          <>
                            <Check
                              aria-hidden
                              className="size-4 text-save-600"
                              strokeWidth={3}
                            />
                            <span className="sr-only">Yes</span>
                          </>
                        ) : (
                          <>
                            <Minus aria-hidden className="size-4 text-ink-300" strokeWidth={3} />
                            <span className="sr-only">Not on this unit</span>
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}

                <tr className="border-t border-line">
                  <th scope="row" className="py-4 pr-4 text-left align-top">
                    <span className="sr-only">Contact about this appliance</span>
                  </th>
                  {items.map((item) => (
                    <td key={item.id} className="p-3 align-top">
                      <CallLink
                        context="compare"
                        className={buttonStyles("primary", "sm", "w-full")}
                        aria-label={`Call about the ${item.brand} ${item.title}`}
                      >
                        Call about this
                      </CallLink>
                      <TextLink
                        context="compare"
                        message={`Hi ${siteConfig.name}, I'm comparing the ${item.brand} ${item.title} and had a question.`}
                        className={buttonStyles("outline", "sm", "mt-2 w-full")}
                      >
                        Text us
                      </TextLink>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </>
  );
}
