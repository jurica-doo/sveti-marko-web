import type { NextConfig } from "next";

/*
 * On Vercel these must be set — the localhost fallbacks below exist for local
 * development only. Without this check a deploy missing them would still build
 * and go live pointing at `localhost`: no content, no images, no error. Failing
 * the build says exactly what is missing instead.
 */
if (process.env.VERCEL) {
  const missing = ["NEXT_PUBLIC_CMS_URL", "NEXT_PUBLIC_BUCKET_URL"].filter(
    (name) => !process.env[name],
  );
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

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

/** Origin of a URL, or `null` when it does not parse. */
function originOf(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Content-Security-Policy, built from what the site actually loads:
 *
 *   - scripts, styles, fonts and images are all served from the site itself —
 *     `next/font` downloads the Google fonts at build time, and media goes
 *     through the `/sv-marko/medija/*` rewrites — so `'self'` covers them
 *   - `'unsafe-inline'` for scripts and styles because the pages are statically
 *     generated: per-request nonces would force every page to render on demand.
 *     Inline styles are also how Framer Motion animates. `'unsafe-eval'` is only
 *     added in development, where React's dev tooling needs it.
 *   - `connect-src` adds the CMS: the news archive's "load more" fetches the
 *     next page from it in the browser
 *   - `frame-src` allows only Google Maps, for the contact page map
 *   - `frame-ancestors 'self'` — the modern form of the X-Frame-Options header
 *     above, which stays for older browsers
 *
 * `wa.me` is opened as a navigation, which CSP does not govern.
 */
function contentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV === "development";
  const cmsOrigin =
    originOf(process.env.NEXT_PUBLIC_CMS_URL) ?? "http://localhost:3001";

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${cmsOrigin}${isDev ? " ws: wss:" : ""}`,
    "frame-src https://www.google.com https://maps.google.com",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    // Only where the site is served over HTTPS; locally it would rewrite the
    // http:// CMS calls into https:// ones that nothing answers.
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
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
    /*
     * Every Vercel deploy that is not production serves the whole site on its
     * own hostname. Without this, a preview is a byte-for-byte duplicate of
     * the live site that Google is free to index and rank against it — and
     * because `robots.txt` on a preview disallows crawling, a `noindex` in
     * the HTML alone might never be read. The header travels with the
     * response itself, so it applies even to assets and non-HTML routes.
     */
    const previewNoIndex =
      process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production"
        ? [
            {
              source: "/(.*)",
              headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
            },
          ]
        : [];

    return [
      ...previewNoIndex,
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
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy(),
          },
          {
            // Nothing on the site uses these; denying them means an injected
            // script or embedded frame cannot ask for them either.
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
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
