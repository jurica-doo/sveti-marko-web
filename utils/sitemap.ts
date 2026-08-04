export type SitemapChangeFreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type SitemapUrlEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: SitemapChangeFreq;
  priority?: number;
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
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
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
