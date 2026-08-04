import { generateUrlSetXml, type SitemapUrlEntry } from "@/utils/sitemap";
import { getNews } from "@/lib/api";
import { absoluteUrl, ROUTES } from "@/lib/routes";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const generatedPath = path.join(process.cwd(), ".generated", "sitemap.xml");
    const xml = await readFile(generatedPath, "utf8");
    return new Response(xml, {
      status: 200,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    // Fallback to dynamic generation below.
  }

  const nowIso = new Date().toISOString();

  // `absoluteUrl()` runs every path through the trailing-slash normaliser, so
  // the sitemap advertises exactly the URLs the site serves — no 308s.
  const base: SitemapUrlEntry[] = [
    { loc: absoluteUrl(ROUTES.home), lastmod: nowIso, changefreq: "weekly", priority: 1 },
    { loc: absoluteUrl(ROUTES.news), lastmod: nowIso, changefreq: "weekly", priority: 0.8 },
    { loc: absoluteUrl(ROUTES.about), lastmod: nowIso, changefreq: "monthly", priority: 0.7 },
    { loc: absoluteUrl(ROUTES.contact), lastmod: nowIso, changefreq: "monthly", priority: 0.7 },
  ];

  const news = await getNews({ limit: 500 }).catch(() => []);
  const newsEntries: SitemapUrlEntry[] = news
    .filter((item) => Boolean(item.slug))
    .map((item) => ({
      loc: absoluteUrl(ROUTES.newsDetail(item.slug as string)),
      lastmod: item.updatedAt || item.publishedAt,
      changefreq: "monthly" as const,
      priority: 0.6,
    }));

  const xml = generateUrlSetXml([...base, ...newsEntries]);

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
