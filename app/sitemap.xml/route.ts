import { generateUrlSetXml, type SitemapAlternate, type SitemapUrlEntry } from "@/utils/sitemap";
import { getNews } from "@/lib/api";
import { LOCALE_META, LOCALES } from "@/lib/i18n/config";
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

  /** This same path, once per locale, each carrying the others as `<xhtml:link alternate>`. */
  function localizedEntries(
    path: string,
    changefreq: SitemapUrlEntry["changefreq"],
    priority: number,
    lastmod = nowIso,
  ): SitemapUrlEntry[] {
    const alternates: SitemapAlternate[] = LOCALES.map((locale) => ({
      hreflang: LOCALE_META[locale].tag,
      href: absoluteUrl(path, locale),
    }));

    return LOCALES.map((locale) => ({
      loc: absoluteUrl(path, locale),
      lastmod,
      changefreq,
      priority,
      alternates,
    }));
  }

  // `absoluteUrl()` runs every path through the trailing-slash normaliser, so
  // the sitemap advertises exactly the URLs the site serves — no 308s.
  const base: SitemapUrlEntry[] = [
    ...localizedEntries(ROUTES.home, "weekly", 1),
    ...localizedEntries(ROUTES.news, "weekly", 0.8),
    ...localizedEntries(ROUTES.about, "monthly", 0.7),
    ...localizedEntries(ROUTES.contact, "monthly", 0.7),
  ];

  const news = await getNews("hr", { limit: 500 }).catch(() => []);
  const newsEntries: SitemapUrlEntry[] = news
    .filter((item) => Boolean(item.slug))
    .flatMap((item) =>
      localizedEntries(
        ROUTES.newsDetail(item.slug as string),
        "monthly",
        0.6,
        item.updatedAt || item.publishedAt,
      ),
    );

  const xml = generateUrlSetXml([...base, ...newsEntries]);

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
