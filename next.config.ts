import type { NextConfig } from "next";

const BUCKET_URL =
  process.env.NEXT_PUBLIC_BUCKET_URL || "http://localhost:3001";

type RemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  pathname: string;
  port?: string;
};

function getCmsRemotePattern(): RemotePattern {
  try {
    const url = new URL(BUCKET_URL);
    const pattern: RemotePattern = {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      pathname: "/**",
    };
    if (url.port) pattern.port = url.port;
    return pattern;
  } catch {
    return {
      protocol: "http",
      hostname: "localhost",
      pathname: "/**",
    };
  }
}

function isPrivateImageHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  return (
    h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0"
  );
}

const cmsPattern = getCmsRemotePattern();
const cmsHostname = cmsPattern.hostname;

/**
 * Hosts allowed to hit `next dev` from outside the machine — needed to open the
 * site on a phone over the LAN. Dev only; production ignores this.
 * Override per machine with `DEV_ORIGINS=192.168.1.50,10.0.0.7`.
 */
const devOrigins = (process.env.DEV_ORIGINS || "192.168.1.145")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  trailingSlash: true,
  allowedDevOrigins: devOrigins,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    unoptimized:
      process.env.NODE_ENV === "development" || isPrivateImageHost(cmsHostname),
    formats: ["image/avif", "image/webp"],
    qualities: [75, 100],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [cmsPattern],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/sv-marko/medija/slike/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/sv-marko/medija/videa/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.woff2",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [];
  },
  async rewrites() {
    // Media never links to the raw Supabase storage URL. These site-local paths
    // proxy the bucket, so assets open as /sv-marko/medija/slike/<filename>.
    return [
      {
        source: "/sv-marko/medija/slike/:path*",
        destination: `${BUCKET_URL}/images/:path*`,
      },
      {
        source: "/sv-marko/medija/videa/:path*",
        destination: `${BUCKET_URL}/videos/:path*`,
      },
    ];
  },
};

export default nextConfig;
