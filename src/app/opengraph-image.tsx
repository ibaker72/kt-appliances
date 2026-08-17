import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const alt = `${siteConfig.name} — Scratch & Dent Appliance Warehouse`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default social share card. Individual product pages override the image with
 * their own photograph via `pageMetadata({ image })`; this is the fallback for
 * everything else.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0b0d",
          padding: "64px 72px",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 76,
              height: 76,
              background: "#c8202b",
              color: "#ffffff",
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: -2,
            }}
          >
            KT
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                color: "#ffffff",
                fontSize: 38,
                fontWeight: 800,
                letterSpacing: -0.5,
                textTransform: "uppercase",
              }}
            >
              Appliances
            </div>
            <div style={{ color: "#8d949c", fontSize: 17, letterSpacing: 3, marginTop: 4 }}>
              SCRATCH &amp; DENT WAREHOUSE
            </div>
            {/* From the company logo, so it is a fact rather than a flourish. */}
            <div style={{ color: "#a58d57", fontSize: 16, letterSpacing: 1, marginTop: 6 }}>
              {siteConfig.brand.ownership}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#ffffff", fontSize: 78, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>
            Name-Brand Appliances.
          </div>
          <div style={{ color: "#c8202b", fontSize: 78, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>
            Warehouse Prices.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #23272c",
            paddingTop: 28,
            color: "#b9bfc6",
            fontSize: 24,
          }}
        >
          <div style={{ display: "flex" }}>
            {siteConfig.address.street}, {siteConfig.address.city}, {siteConfig.address.state}
          </div>
          <div style={{ display: "flex", color: "#ffffff", fontWeight: 700 }}>
            {siteConfig.phone.display}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
