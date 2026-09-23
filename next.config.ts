import type { NextConfig } from "next";

const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wyrgczdtqqaimsmghcle.supabase.co").hostname;

// CSP ships REPORT-ONLY first: the browser logs what it would block without
// blocking anything. After a week of clean consoles, flip this one line to
// "Content-Security-Policy" to enforce it.
const CSP_HEADER = "Content-Security-Policy-Report-Only";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'", // move to nonces later via proxy.ts
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://api.mapbox.com",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com",
  "worker-src blob:",
  "child-src blob:", // Mapbox runs its workers from blob: URLs
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    // Only properly sourced photos from our own Supabase Storage bucket.
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/spot-photos/**" }],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [400, 640, 828, 1080, 1440],
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: CSP_HEADER, value: csp },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    }];
  },
};

export default nextConfig;
