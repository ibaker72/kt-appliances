import type { NextConfig } from "next";

/**
 * Product photography is served from Supabase Storage in production. The bucket
 * host is derived from the project URL so there is no second place to update
 * when the project changes.
 */
function supabaseImageHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const host = supabaseImageHost();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    // Sized for the widths actually used: card thumbs, gallery, and full-bleed hero.
    imageSizes: [96, 128, 200, 256, 384],
    deviceSizes: [360, 420, 640, 768, 1024, 1280, 1600, 1920],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: host
      ? [{ protocol: "https", hostname: host, pathname: "/storage/v1/object/public/**" }]
      : [],
  },

  async headers() {
    return [
      {
        // Admin and auth surfaces must never be indexed, regardless of what a
        // page-level robots tag says.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      {
        source: "/img/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Ambient video clips from scripts/process-media.mjs. Filenames carry a
        // content hash, so immutable is safe and replacements never go stale.
        source: "/video/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
