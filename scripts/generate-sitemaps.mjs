import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sv-marko.hr";
const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3001";

const IMAGE_BASE_PATH = "/sv-marko/medija/slike";
const VIDEO_BASE_PATH = "/sv-marko/medija/videa";

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
        "  </url>",
      ].filter(Boolean);

      return lines.join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
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

async function fetchDocs(collection) {
  try {
    const data = await fetchJson(
      `${CMS_URL}/api/${collection}?limit=1000&depth=0`,
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

async function fetchMediaEntries() {
  const [images, videos] = await Promise.all([
    fetchDocs("media-images"),
    fetchDocs("media-videos"),
  ]);

  const toEntry = (basePath) => (doc) => {
    const filename = doc?.filename;
    if (!filename) return null;
    return {
      loc: resolveAbsoluteUrl(`${basePath}/${filename}`, SITE_URL),
      lastmod: doc?.updatedAt,
      changefreq: "monthly",
      priority: 0.3,
    };
  };

  return {
    imageEntries: images.map(toEntry(IMAGE_BASE_PATH)).filter(Boolean),
    videoEntries: videos.map(toEntry(VIDEO_BASE_PATH)).filter(Boolean),
  };
}

async function main() {
  const nowIso = new Date().toISOString();

  const baseEntries = [
    { path: "/", changefreq: "weekly", priority: 1.0 },
    { path: "/vijesti/", changefreq: "weekly", priority: 0.8 },
    { path: "/o-nama/", changefreq: "monthly", priority: 0.7 },
    { path: "/kontakt/", changefreq: "monthly", priority: 0.7 },
  ].map((entry) => ({
    loc: resolveAbsoluteUrl(entry.path, SITE_URL),
    lastmod: nowIso,
    changefreq: entry.changefreq,
    priority: entry.priority,
  }));

  const newsDocs = await fetchDocs("news");
  const newsEntries = newsDocs
    .filter((doc) => doc?.slug && doc?._status !== "draft")
    .map((doc) => ({
      loc: resolveAbsoluteUrl(`/vijesti/${doc.slug}/`, SITE_URL),
      lastmod: doc.updatedAt || doc.publishedAt,
      changefreq: "monthly",
      priority: 0.6,
    }));

  const media = await fetchMediaEntries();

  const sitemapXml = generateUrlSetXml([...baseEntries, ...newsEntries]);
  const mediaSitemapXml = generateUrlSetXml([
    {
      loc: resolveAbsoluteUrl("/", SITE_URL),
      lastmod: nowIso,
      changefreq: "weekly",
      priority: 0.1,
    },
    ...media.imageEntries,
    ...media.videoEntries,
  ]);

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
