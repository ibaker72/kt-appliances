import { MapPin, Navigation, Phone } from "lucide-react";

import { CallLink, DirectionsLink, TextLink } from "@/components/contact/contact-links";
import { StoreHours } from "@/components/layout/store-hours";
import { buttonStyles } from "@/components/ui/button";
import { mapEmbedSrc, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * Warehouse address, hours, map and the three actions that follow from them.
 *
 * The map uses the keyless Google Maps embed unless a Maps API key is set, so a
 * missing key degrades to a working map rather than a broken iframe.
 */
export function WarehousePanel({
  className,
  showMap = true,
}: {
  className?: string;
  showMap?: boolean;
}) {
  return (
    <div className={cn("grid gap-px border border-line bg-line lg:grid-cols-2", className)}>
      <div className="bg-white p-6 sm:p-8">
        <p className="eyebrow text-brand-500">Warehouse</p>
        <h3 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.025em] text-ink-950 sm:text-3xl">
          {siteConfig.address.street}
        </h3>
        <p className="mt-1 text-[16px] text-ink-600">
          {siteConfig.address.city}, {siteConfig.address.state} {siteConfig.address.postalCode}
        </p>

        <div className="mt-7 border-t border-line pt-7">
          <StoreHours />
        </div>

        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <DirectionsLink context="warehouse-panel" className={buttonStyles("dark", "md")}>
            <Navigation aria-hidden className="size-4" strokeWidth={2.5} />
            Get Directions
          </DirectionsLink>
          <CallLink context="warehouse-panel" className={buttonStyles("outline", "md")}>
            <Phone aria-hidden className="size-4" strokeWidth={2.5} />
            {siteConfig.phone.display}
          </CallLink>
          <TextLink
            context="warehouse-panel"
            message={`Hi ${siteConfig.name}, I'd like to schedule an after-hours visit to the warehouse.`}
            className={buttonStyles("outline", "md")}
          >
            Schedule After-Hours Visit
          </TextLink>
        </div>

        <p className="mt-5 flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-500">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-400" strokeWidth={2.25} />
          Walk in any day between {siteConfig.hours.regular.label}. Between{" "}
          {siteConfig.hours.afterHours.label} we open by appointment only — text or call first so
          someone is there to meet you.
        </p>
      </div>

      {showMap ? (
        <div className="relative min-h-[320px] bg-bone-100 lg:min-h-full">
          <iframe
            src={mapEmbedSrc()}
            title={`Map showing ${siteConfig.name} at ${siteConfig.address.oneLine}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 size-full border-0"
          />
        </div>
      ) : null}
    </div>
  );
}
