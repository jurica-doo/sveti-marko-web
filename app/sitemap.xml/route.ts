import { generateUrlSetXml, type SitemapAlternate, type SitemapUrlEntry } from "@/utils/sitemap";
import {
  getAboutPage,
  getContactPage,
  getHomePage,
  getNews,
  getNewsPage,
} from "@/lib/api";
import { LOCALE_META, LOCALES } from "@/lib/i18n/config";
import { absoluteUrl, ROUTES } from "@/lib/routes";
import { IS_INDEXABLE_DEPLOYMENT } from "@/lib/site-url";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  // A preview deploy must not hand crawlers a map of itself.
  if (!IS_INDEXABLE_DEPLOYMENT) {
    return new Response("Not found", { status: 404 });
  }

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

  /*
   * `lastmod` is whatever the CMS says the backing document was last changed,
   * or nothing at all. It is deliberately never `new Date()`: a timestamp that
   * moves on every request claims the page changed when it did not, and Google
   * discounts the signal once it stops correlating with real edits.
   */
  const [home, newsPage, about, contactPage] = await Promise.all([
    getHomePage("hr").catch(() => null),
    getNewsPage("hr").catch(() => null),
    getAboutPage("hr").catch(() => null),
    getContactPage("hr").catch(() => null),
  ]);

  /** This same path, once per locale, each carrying the others as `<xhtml:link alternate>`. */
  function localizedEntries(
    path: string,
    changefreq: SitemapUrlEntry["changefreq"],
    priority: number,
    lastmod?: string,
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
    ...localizedEntries(ROUTES.home, "weekly", 1, home?.updatedAt),
    ...localizedEntries(ROUTES.news, "weekly", 0.8, newsPage?.updatedAt),
    ...localizedEntries(ROUTES.about, "monthly", 0.7, about?.updatedAt),
    ...localizedEntries(ROUTES.contact, "monthly", 0.7, contactPage?.updatedAt),
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
