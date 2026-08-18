import type { ReactNode } from "react";
import { Suspense } from "react";
import { Archivo, Inter } from "next/font/google";

import "./globals.css";

import { AnalyticsScripts } from "@/components/analytics/analytics-scripts";
import { AttributionTracker } from "@/components/analytics/attribution-tracker";
import { JsonLd } from "@/components/seo/json-ld";
import { localBusinessSchema, websiteSchema } from "@/lib/seo/jsonld";
import { indexableLocations } from "@/lib/seo/location-quality";
import { rootMetadata } from "@/lib/seo/metadata";

/** Display face — headings, prices, buttons, the wordmark. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

/** Body face — paragraphs, specs, forms. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = rootMetadata;

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0b0d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink-950 focus:px-4 focus:py-3 focus:font-display focus:text-sm focus:font-bold focus:uppercase focus:text-white"
        >
          Skip to content
        </a>

        {children}

        <Suspense fallback={null}>
          <AttributionTracker />
        </Suspense>
        <AnalyticsScripts />
        {/* The one business entity and the site entity, emitted once site-wide.
            `areaServed` is fed the published service areas so the towns the site
            claims to reach are the towns that actually have a verified page. */}
        <JsonLd data={[localBusinessSchema(indexableLocations()), websiteSchema()]} />
      </body>
    </html>
  );
}
