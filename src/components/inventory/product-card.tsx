import Link from "next/link";
import { Check, MapPin, Truck } from "lucide-react";

import { ConditionBadge } from "@/components/inventory/availability-badge";
import { DealBadges } from "@/components/inventory/deal-badge";
import { ProductImage } from "@/components/inventory/product-image";
import { SaveButton } from "@/components/inventory/save-button";
import { CATEGORIES, formatPrice, isPurchasable, savingsFor, type Appliance } from "@/lib/inventory/types";
import { siteConfig } from "@/lib/site-config";
import { cn, relativeTime } from "@/lib/utils";

/** SMS body pre-filled when a shopper taps "Text about this item". */
export function inquiryMessage(appliance: Appliance): string {
  const model = appliance.modelNumber ? ` (model ${appliance.modelNumber})` : "";
  return `Hi ${siteConfig.name}, I'm interested in the ${appliance.brand} ${appliance.title}${model} listed on your website.`;
}

export type ProductCardVariant = "grid" | "rail" | "compact";

interface ProductCardProps {
  appliance: Appliance;
  /** LCP candidates on a grid's first row. */
  priority?: boolean;
  sizes?: string;
  variant?: ProductCardVariant;
  /**
   * Toggles this unit in the URL's compare list. Supplied by the surface that
   * owns the querystring; omitted where comparison makes no sense (a rail on the
   * homepage has no filter state to hang it off).
   */
  compareHref?: string;
  compareChecked?: boolean;
  className?: string;
}

const DEFAULT_SIZES: Record<ProductCardVariant, string> = {
  grid: "(min-width: 1280px) 300px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 92vw",
  rail: "240px",
  compact: "160px",
};

/**
 * Retail product card.
 *
 * The whole card is the target: there is no "View appliance" button, because on
 * a grid of twelve units a per-card CTA is twelve buttons competing with the
 * thing they point at. That is done with a stretched link on the title rather
 * than by wrapping the card in an anchor — the title is what a screen reader
 * should announce, and it leaves room for the compare control to sit above the
 * overlay without nesting interactive elements.
 *
 * Stays a server component. Comparison is a link that edits the URL, so it needs
 * no JavaScript and survives a share; only the save heart is a client island,
 * because a personal list has no server-rendered state to begin with.
 */
export function ProductCard({
  appliance,
  priority = false,
  sizes,
  variant = "grid",
  compareHref,
  compareChecked = false,
  className,
}: ProductCardProps) {
  const href = `/inventory/${appliance.slug}`;
  const available = isPurchasable(appliance);
  const category = CATEGORIES[appliance.category];
  const savings = savingsFor(appliance);
  const compact = variant === "compact";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-md border border-line bg-white shadow-card transition-shadow duration-200 hover:shadow-hover",
        className,
      )}
    >
      <div className="zoom-frame relative overflow-hidden bg-bone-50">
        <ProductImage
          appliance={appliance}
          sizes={sizes ?? DEFAULT_SIZES[variant]}
          priority={priority}
          framed={false}
          className="aspect-square bg-bone-50"
        />

        {/* Promotional flags top-left; the factual condition chip bottom-left, so
            "why it's cheap" reads separately from "what the deal is". */}
        <DealBadges appliance={appliance} className="absolute left-0 top-0 max-w-[85%] p-2" />
        {!compact ? (
          <span className="absolute bottom-0 left-0 p-2">
            <ConditionBadge condition={appliance.condition} />
          </span>
        ) : null}

        {!compact ? (
          <div className="absolute right-2 top-2 flex items-center gap-1.5">
            {compareHref && available ? (
              <CompareToggle href={compareHref} checked={compareChecked} title={appliance.title} />
            ) : null}
            <SaveButton slug={appliance.slug} title={appliance.title} />
          </div>
        ) : null}
      </div>

      <div className={cn("flex flex-1 flex-col", compact ? "p-2.5" : "p-2.5 sm:p-4")}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
          {appliance.brand}
        </p>

        <h3
          className={cn(
            "mt-1 font-semibold leading-snug text-ink-950",
            compact ? "text-[13px]" : "text-[14px]",
          )}
        >
          {/* Stretched link — covers the card without nesting anchors. */}
          <Link href={href} className="clamp-2 after:absolute after:inset-0 hover:text-brand-500">
            {appliance.title}
          </Link>
        </h3>

        {/* Model/type line is the first thing to go on a 2-up phone grid, where
            the card is ~170px wide and the price matters more. */}
        {!compact ? (
          <p className="mt-1 hidden text-ui text-ink-500 sm:block">
            {appliance.modelNumber ? (
              <>
                <span className="tnum">{appliance.modelNumber}</span>
                <span aria-hidden className="mx-1.5 text-ink-300">·</span>
              </>
            ) : null}
            {appliance.subcategory ?? category.name}
          </p>
        ) : null}

        {/* Price is the loudest thing on the card. A comparison price and the
            savings chip appear only where a verified one is on record. */}
        <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", compact ? "mt-2" : "mt-3")}>
          <span
            className={cn(
              "font-display font-extrabold leading-none tracking-[-0.02em] text-ink-950 tnum",
              compact ? "text-[17px]" : "text-[22px]",
            )}
          >
            <span className="align-top text-[0.62em]">$</span>
            {Math.round(appliance.price).toLocaleString("en-US")}
          </span>
          {savings != null ? (
            <span className="text-ui text-ink-500 line-through tnum">
              {formatPrice(appliance.compareAtPrice!)}
            </span>
          ) : null}
        </div>

        {savings != null && !compact ? (
          <p className="mt-1.5">
            <span className="inline-block rounded-sm bg-save-50 px-1.5 py-0.5 text-[11.5px] font-bold text-save-700 tnum">
              Save {formatPrice(savings)}
            </span>
          </p>
        ) : null}

        {!compact ? (
          <p className="mt-auto hidden items-center gap-1.5 pt-3 text-ui text-ink-600 sm:flex">
            {available ? (
              <>
                <MapPin aria-hidden className="size-3.5 shrink-0 text-ink-400" strokeWidth={2.5} />
                <span className="min-w-0 truncate">
                  Available today · {siteConfig.address.city}
                </span>
              </>
            ) : appliance.deliveryAvailable ? (
              <>
                <Truck aria-hidden className="size-3.5 shrink-0 text-ink-400" strokeWidth={2.5} />
                Delivery available
              </>
            ) : (
              <span className="text-ink-500">Ask about availability</span>
            )}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/**
 * Compare checkbox.
 *
 * A link, not an input: the selection lives in the querystring, so toggling is
 * a navigation and works with scripting disabled. `z-10` lifts it above the
 * title's stretched-link overlay.
 */
function CompareToggle({
  href,
  checked,
  title,
}: {
  href: string;
  checked: boolean;
  title: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={checked}
      className={cn(
        "z-10 flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[11px] font-semibold transition",
        // Once checked it must stay visible, or a shopper cannot see what they picked.
        checked
          ? "border-ink-950 bg-ink-950 text-white"
          : "border-line bg-white/95 text-ink-700 opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-3.5 place-items-center rounded-[2px] border",
          checked ? "border-white bg-white text-ink-950" : "border-ink-300",
        )}
      >
        {checked ? <Check className="size-3" strokeWidth={3.5} /> : null}
      </span>
      Compare
      <span className="sr-only">{checked ? `Remove ${title} from` : `Add ${title} to`} comparison</span>
    </Link>
  );
}

/**
 * Sold units, shown as proof of turnover. Visually distinct from live inventory:
 * desaturated photo, struck price and a SOLD marker, with no purchase action.
 */
export function SoldProductCard({
  appliance,
  sizes = "160px",
}: {
  appliance: Appliance;
  sizes?: string;
}) {
  const sold = relativeTime(appliance.soldAt ?? appliance.updatedAt);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-md border border-line bg-bone-50">
      <div className="relative overflow-hidden">
        <div className="opacity-55 grayscale transition-opacity duration-200 group-hover:opacity-70">
          <ProductImage
            appliance={appliance}
            sizes={sizes}
            framed={false}
            className="aspect-square bg-bone-100"
          />
        </div>
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-ink-950/90 py-1.5 text-center font-display text-[12px] font-extrabold uppercase tracking-[0.3em] text-white">
          Sold
        </span>
      </div>
      <div className="p-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
          {appliance.brand}
        </p>
        <h3 className="mt-1 text-[13px] font-semibold leading-snug text-ink-700">
          <Link href={`/inventory/${appliance.slug}`} className="clamp-2 after:absolute after:inset-0">
            {appliance.title}
          </Link>
        </h3>
        <p className="mt-1.5 flex items-baseline gap-2">
          <span className="font-display text-[15px] font-bold text-ink-500 line-through tnum">
            {formatPrice(appliance.price)}
          </span>
          {sold ? <span className="text-ui text-ink-500">{sold}</span> : null}
        </p>
      </div>
    </article>
  );
}
