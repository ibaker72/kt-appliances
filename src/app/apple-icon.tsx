import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site-config";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const alt = `${siteConfig.name} icon`;

/**
 * iOS home-screen icon.
 *
 * Rendered as PNG rather than served as SVG because iOS still ignores SVG for
 * `apple-touch-icon`. Deliberately edge-to-edge with no inner padding and no
 * rounded corners — iOS applies its own mask, and a pre-rounded icon ends up
 * double-rounded with a pale border.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#c8202b",
          color: "#ffffff",
          fontSize: 104,
          fontWeight: 800,
          letterSpacing: -6,
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        KT
      </div>
    ),
    size,
  );
}
