import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Mirrors `lib/site-url.ts`. Duplicated rather than imported because this is a
 * plain Node script run by `prebuild`, before any TypeScript is compiled — but
 * it must resolve the origin to exactly the same value, or the sitemap would
 * advertise URLs on a different host than the pages' own canonicals.
 */
const PRODUCTION_ORIGIN = "https://sv-marko.hr";

function resolveSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return PRODUCTION_ORIGIN;

  let origin;
  try {
    origin = new URL(configured).origin;
  } catch {
    return PRODUCTION_ORIGIN;
  }

  // On a real deploy, a localhost/preview origin is a misconfiguration — a
  // sitemap full of *.vercel.app URLs is worse than no sitemap.
  if (process.env.VERCEL_ENV) {
    const host = new URL(origin).hostname.toLowerCase();
    const nonPublic =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      host.endsWith(".vercel.app");
    if (nonPublic) return PRODUCTION_ORIGIN;
  }

  return origin;
}

const SITE_URL = resolveSiteUrl();
const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3001";

const IMAGE_BASE_PATH = "/sv-marko/medija/slike";

/**
 * Mirrors `lib/i18n/config.ts` — hr is primary and unprefixed, en/it/pl are
 * prefixed. Duplicated here (a plain Node script, not built through the
 * Next/TS toolchain) rather than imported, same reasoning as the XML helpers
 * below already being their own copy of the `lib/`/`utils/` originals.
 */
const LOCALES = ["hr", "en", "it", "pl"];
const DEFAULT_LOCALE = "hr";
const HREFLANG = { hr: "hr", en: "en", it: "it", pl: "pl" };

/** A global's own `updatedAt`, or undefined — never a fabricated "now". */
async function fetchGlobalUpdatedAt(slug) {
  try {
    const data = await fetchJson(`${CMS_URL}/api/globals/${slug}?depth=0`);
    return data?.updatedAt || undefined;
  } catch {
    return undefined;
  }
}

/** Mirrors `lib/i18n/routes.ts#withLocale`. */
function withLocale(pathname, locale) {
  if (locale === DEFAULT_LOCALE) return pathname;
  return pathname === "/" ? `/${locale}/` : `/${locale}${pathname}`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toIsoDate(value) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * Mirrors `lib/routes.ts#internalHref` — the site is served with
 * `trailingSlash: true`, so every sitemap entry must carry the slash or search
 * engines crawl a 308 first.
 */
function withTrailingSlash(path) {
  const value = String(path || "/").trim();
  const [pathAndQuery, hash = ""] = value.split("#");
  const [rawPath, query = ""] = pathAndQuery.split("?");

  let normalised = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const hasExtension = /\.[a-z0-9]{2,5}$/i.test(normalised);
  if (!hasExtension && !normalised.endsWith("/")) normalised = `${normalised}/`;

  return `${normalised}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

function resolveAbsoluteUrl(urlOrPath, baseUrl) {
  try {
    return new URL(withTrailingSlash(urlOrPath), baseUrl).toString();
  } catch {
    return String(urlOrPath);
  }
}

/** Trailing-slash-normalises `pagePath`, then prefixes it for `locale`. */
function resolveLocalizedUrl(pagePath, locale, baseUrl) {
  return resolveAbsoluteUrl(withLocale(withTrailingSlash(pagePath), locale), baseUrl);
}

/** This same page, once per locale, each carrying the others as `<xhtml:link alternate>`. */
function localizedEntries(pagePath, changefreq, priority, lastmod) {
  const alternates = LOCALES.map((locale) => ({
    hreflang: HREFLANG[locale],
    href: resolveLocalizedUrl(pagePath, locale, SITE_URL),
  }));

  return LOCALES.map((locale) => ({
    loc: resolveLocalizedUrl(pagePath, locale, SITE_URL),
    lastmod,
    changefreq,
    priority,
    alternates,
  }));
}

function isValidPriority(priority) {
  return Number.isFinite(priority) && priority >= 0 && priority <= 1;
}

function generateUrlSetXml(entries) {
  const urls = (entries || [])
    .filter((e) => e && typeof e.loc === "string" && e.loc.trim().length > 0)
    .map((e) => {
      const loc = escapeXml(e.loc.trim());
      const lastmod = toIsoDate(e.lastmod);
      const changefreq = e.changefreq;
      const priority = e.priority;

      const alternates = (e.alternates || [])
        .map(
          (alt) =>
            `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}" />`,
        )
        .join("\n");

      const images = (e.images || [])
        .filter(Boolean)
        .map(
          (src) =>
            `    <image:image>\n      <image:loc>${escapeXml(src)}</image:loc>\n    </image:image>`,
        )
        .join("\n");

      const lines = [
        "  <url>",
        `    <loc>${loc}</loc>`,
        lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
        changefreq
          ? `    <changefreq>${escapeXml(changefreq)}</changefreq>`
          : null,
        isValidPriority(priority)
          ? `    <priority>${priority.toFixed(1)}</priority>`
          : null,
        alternates || null,
        images || null,
        "  </url>",
      ].filter(Boolean);

      return lines.join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' +
      ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' +
      ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "sv-marko-sitemap-generator",
      accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

async function fetchDocs(collection, depth = 0) {
  try {
    const data = await fetchJson(
      `${CMS_URL}/api/${collection}?limit=1000&depth=${depth}`,
    );
    return data?.docs || [];
  } catch (err) {
    console.warn(
      `[sitemaps] Failed to fetch ${collection}:`,
      err?.message || err,
    );
    return [];
  }
}

/**
 * Image sitemap entries: one `<url>` per article page per locale, with the
 * artwork on that page as `<image:image>` children.
 *
 * The protocol has no standalone image URL — an image is always declared
 * against the page it appears on. Mirrors `app/media-sitemap.xml/route.ts`.
 */
function mediaEntriesFromNews(newsDocs) {
  const fileOf = (media) => {
    const filename = typeof media === "string" ? media : media?.filename;
    if (!filename) return null;
    if (filename.startsWith("http://") || filename.startsWith("https://")) return filename;
    return resolveAbsoluteUrl(`${IMAGE_BASE_PATH}/${filename}`, SITE_URL);
  };

  return newsDocs
    .filter((doc) => doc?.slug && doc?._status !== "draft")
    .flatMap((doc) => {
      const images = [
        fileOf(doc.coverImage),
        ...(doc.gallery || []).map((row) => fileOf(row?.image)),
      ].filter(Boolean);

      const unique = [...new Set(images)];
      if (!unique.length) return [];

      return LOCALES.map((locale) => ({
        loc: resolveLocalizedUrl(`/vijesti/${doc.slug}/`, locale, SITE_URL),
        lastmod: doc.updatedAt || doc.publishedAt,
        images: unique,
      }));
    });
}

async function main() {
  /*
   * `lastmod` comes from the CMS document behind each page, never from the
   * clock: stamping "now" on every build tells Google the whole site changed
   * each time it is deployed, which is false and devalues the signal. A page
   * whose global cannot be read simply ships without a `lastmod`.
   */
  const [homeAt, newsPageAt, aboutAt, contactAt] = await Promise.all([
    fetchGlobalUpdatedAt("home-page"),
    fetchGlobalUpdatedAt("news-page"),
    fetchGlobalUpdatedAt("about-page"),
    fetchGlobalUpdatedAt("contact-page"),
  ]);

  const baseEntries = [
    { path: "/", changefreq: "weekly", priority: 1.0, lastmod: homeAt },
    { path: "/vijesti/", changefreq: "weekly", priority: 0.8, lastmod: newsPageAt },
    { path: "/o-nama/", changefreq: "monthly", priority: 0.7, lastmod: aboutAt },
    { path: "/kontakt/", changefreq: "monthly", priority: 0.7, lastmod: contactAt },
  ].flatMap((entry) =>
    localizedEntries(entry.path, entry.changefreq, entry.priority, entry.lastmod),
  );

  const newsDocs = await fetchDocs("news", 1);
  const newsEntries = newsDocs
    .filter((doc) => doc?.slug && doc?._status !== "draft")
    .flatMap((doc) =>
      localizedEntries(
        `/vijesti/${doc.slug}/`,
        "monthly",
        0.6,
        doc.updatedAt || doc.publishedAt,
      ),
    );

  const sitemapXml = generateUrlSetXml([...baseEntries, ...newsEntries]);
  const mediaSitemapXml = generateUrlSetXml(mediaEntriesFromNews(newsDocs));

  const outDir = path.join(process.cwd(), ".generated");
  await mkdir(outDir, { recursive: true });

  await Promise.all([
    writeFile(path.join(outDir, "sitemap.xml"), sitemapXml, "utf8"),
    writeFile(path.join(outDir, "media-sitemap.xml"), mediaSitemapXml, "utf8"),
  ]);

  console.log(`[sitemaps] Wrote ${path.join(outDir, "sitemap.xml")}`);
  console.log(`[sitemaps] Wrote ${path.join(outDir, "media-sitemap.xml")}`);
}

main().catch((err) => {
  console.error("[sitemaps] Generation failed:", err);
  // Do not hard-fail builds by default; sitemaps can still be served dynamically.
  process.exitCode = 0;
});
