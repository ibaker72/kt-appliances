import Link from "next/link";
import { ArrowRight, MessageSquareText, Truck, ShieldCheck } from "lucide-react";

import { AvailabilityBadge, ConditionBadge } from "@/components/inventory/availability-badge";
import { ProductImage } from "@/components/inventory/product-image";
import { ProductPrice } from "@/components/inventory/product-price";
import { TextLink } from "@/components/contact/contact-links";
import { CATEGORIES, isPurchasable, type Appliance } from "@/lib/inventory/types";
import { siteConfig } from "@/lib/site-config";
import { cn, relativeTime } from "@/lib/utils";

/** SMS body pre-filled when a shopper taps "Text about this item". */
export function inquiryMessage(appliance: Appliance): string {
  const model = appliance.modelNumber ? ` (model ${appliance.modelNumber})` : "";
  return `Hi ${siteConfig.name}, I'm interested in the ${appliance.brand} ${appliance.title}${model} listed on your website.`;
}

interface ProductCardProps {
  appliance: Appliance;
  /** LCP candidates on a grid's first row. */
  priority?: boolean;
  sizes?: string;
  className?: string;
}

export function ProductCard({
  appliance,
  priority = false,
  sizes = "(min-width: 1280px) 300px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 92vw",
  className,
}: ProductCardProps) {
  const href = `/inventory/${appliance.slug}`;
  const available = isPurchasable(appliance);
  const category = CATEGORIES[appliance.category];

  return (
    <article
      className={cn(
        "group flex flex-col border border-line bg-white transition-colors duration-200 hover:border-ink-400",
        className,
      )}
    >
      {/* Image link is skipped in the tab order — the heading link below is the
          keyboard path to the same page. */}
      <Link href={href} className="zoom-frame relative block overflow-hidden" tabIndex={-1}>
        <ProductImage appliance={appliance} sizes={sizes} priority={priority} />
        <span className="absolute left-0 top-0 flex flex-col items-start gap-1 p-2.5">
          <ConditionBadge condition={appliance.condition} />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-brand-500">{appliance.brand}</p>
          <AvailabilityBadge appliance={appliance} />
        </div>

        <h3 className="mt-2 font-display text-[17px] font-bold leading-tight tracking-[-0.015em] text-ink-950 sm:text-[18px]">
          <Link href={href} className="clamp-2 hover:text-brand-500">
            {appliance.title}
          </Link>
        </h3>

        <p className="mt-1.5 text-[12.5px] text-ink-500">
          {appliance.modelNumber ? (
            <>
              Model <span className="font-medium text-ink-700 tnum">{appliance.modelNumber}</span>
              <span aria-hidden className="mx-1.5 text-ink-300">·</span>
            </>
          ) : null}
          {appliance.subcategory ?? category.name}
        </p>

        <div className="mt-4 border-t border-line pt-4">
          <ProductPrice appliance={appliance} size="sm" />
        </div>

        {(appliance.warrantyAvailable || appliance.deliveryAvailable) && available ? (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-600">
            {appliance.warrantyAvailable ? (
              <li className="flex items-center gap-1.5">
                <ShieldCheck aria-hidden className="size-3.5 text-ink-400" strokeWidth={2.5} />
                Warranty available
              </li>
            ) : null}
            {appliance.deliveryAvailable ? (
              <li className="flex items-center gap-1.5">
                <Truck aria-hidden className="size-3.5 text-ink-400" strokeWidth={2.5} />
                Delivery available
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="mt-5 flex flex-1 items-end">
          {available ? (
            <div className="grid w-full grid-cols-[1fr_auto] gap-2">
              <Link
                href={href}
                className="flex h-11 items-center justify-center gap-2 border border-ink-900 bg-white font-display text-[11.5px] font-bold uppercase tracking-[0.06em] text-ink-900 transition-colors hover:bg-ink-950 hover:text-white"
              >
                View Appliance
                <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
              </Link>
              <TextLink
                context="product-card"
                message={inquiryMessage(appliance)}
                aria-label={`Text about the ${appliance.brand} ${appliance.title}`}
                className="grid h-11 w-11 place-items-center border border-brand-500 bg-brand-500 text-white transition-colors hover:bg-brand-600 hover:border-brand-600"
              >
                <MessageSquareText aria-hidden className="size-[18px]" strokeWidth={2.5} />
              </TextLink>
            </div>
          ) : (
            <Link
              href={href}
              className="flex h-11 w-full items-center justify-center gap-2 border border-line bg-bone-50 font-display text-[11.5px] font-bold uppercase tracking-[0.06em] text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-950"
            >
              See Similar Appliances
              <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Sold units, shown as proof of turnover. Visually distinct from live inventory:
 * desaturated photo, struck price and a SOLD marker, with no purchase action.
 */
export function SoldProductCard({
  appliance,
  sizes = "(min-width: 1280px) 260px, (min-width: 768px) 30vw, 45vw",
}: {
  appliance: Appliance;
  sizes?: string;
}) {
  const sold = relativeTime(appliance.soldAt ?? appliance.updatedAt);

  return (
    <article className="group flex flex-col border border-line bg-bone-50">
      <Link href={`/inventory/${appliance.slug}`} className="relative block overflow-hidden">
        <div className="opacity-55 grayscale transition-opacity duration-200 group-hover:opacity-70">
          <ProductImage appliance={appliance} sizes={sizes} />
        </div>
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-ink-950/90 py-2 text-center font-display text-[13px] font-extrabold uppercase tracking-[0.3em] text-white">
          Sold
        </span>
      </Link>
      <div className="p-4">
        <p className="eyebrow text-ink-500">{appliance.brand}</p>
        <h3 className="mt-1.5 clamp-2 font-display text-[15px] font-bold leading-tight text-ink-700">
          {appliance.title}
        </h3>
        <p className="mt-2.5 flex items-baseline gap-2">
          <span className="font-display text-lg font-bold text-ink-400 line-through decoration-2 tnum">
            ${appliance.price.toLocaleString("en-US")}
          </span>
          {sold ? <span className="text-[12px] text-ink-500">{sold}</span> : null}
        </p>
      </div>
    </article>
  );
}
