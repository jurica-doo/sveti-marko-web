export type SitemapChangeFreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type SitemapAlternate = {
  hreflang: string;
  href: string;
};

export type SitemapUrlEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: SitemapChangeFreq;
  priority?: number;
  /** Other languages' copies of this same page — emits `<xhtml:link rel="alternate">` siblings. */
  alternates?: SitemapAlternate[];
  /**
   * Images that appear *on* this page, as `<image:image>` children.
   *
   * The sitemap protocol has no notion of an image as a URL in its own right:
   * an image is always declared against the page it appears on. Listing image
   * files as `<loc>`s instead asks Google to crawl binaries as if they were
   * pages.
   */
  images?: string[];
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function isValidPriority(priority: number): boolean {
  return Number.isFinite(priority) && priority >= 0 && priority <= 1;
}

function toIsoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function resolveAbsoluteUrl(urlOrPath: string, baseUrl: string): string {
  try {
    return new URL(urlOrPath, baseUrl).toString();
  } catch {
    return urlOrPath;
  }
}

export function generateUrlSetXml(entries: SitemapUrlEntry[]): string {
  const urls = entries
    .filter((e) => typeof e.loc === "string" && e.loc.trim().length > 0)
    .map((e) => {
      const loc = escapeXml(e.loc.trim());
      const lastmod = toIsoDate(e.lastmod);
      const changefreq = e.changefreq;
      const priority = e.priority;

      const alternates = (e.alternates ?? [])
        .map(
          (alt) =>
            `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}" />`,
        )
        .join("\n");

      const images = (e.images ?? [])
        .filter(Boolean)
        .map(
          (src) =>
            `    <image:image>\n      <image:loc>${escapeXml(src)}</image:loc>\n    </image:image>`,
        )
        .join("\n");

      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
        changefreq
          ? `    <changefreq>${escapeXml(changefreq)}</changefreq>`
          : null,
        isValidPriority(priority ?? Number.NaN)
          ? `    <priority>${(priority as number).toFixed(1)}</priority>`
          : null,
        alternates || null,
        images || null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
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
