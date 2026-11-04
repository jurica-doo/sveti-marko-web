import { generateUrlSetXml, type SitemapAlternate, type SitemapUrlEntry } from "@/utils/sitemap";
import {
  getAboutPage,
  getContactPage,
  getHomePage,
  getNews,
  getNewsPage,
  getPrivacyPage,
  getSchedule,
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

  /*
   * `lastmod` is whatever the CMS says the backing document was last changed,
   * or nothing at all. It is deliberately never `new Date()`: a timestamp that
   * moves on every request claims the page changed when it did not, and Google
   * discounts the signal once it stops correlating with real edits.
   */
  // The Raspored page's content is the `schedule` global, so its `lastmod`
  // follows that rather than the page's own (rarely edited) wording.
  const [home, schedule, newsPage, about, contactPage, privacy, news] = await Promise.all([
    getHomePage("hr").catch(() => null),
    getSchedule("hr").catch(() => null),
    getNewsPage("hr").catch(() => null),
    getAboutPage("hr").catch(() => null),
    getContactPage("hr").catch(() => null),
    getPrivacyPage("hr").catch(() => null),
    getNews("hr", { limit: 500 }).catch(() => null),
  ]);

  /*
   * Built live from the CMS, so an article published after a deploy is in the
   * sitemap within the hour rather than at the next build. The copy written by
   * `scripts/generate-sitemaps.mjs` at build time is only the fallback for when
   * the CMS cannot be reached — better a slightly stale map than none, or one
   * missing every article.
   */
  if (!home && !news) {
    const generated = await readGenerated("sitemap.xml");
    if (generated) return xmlResponse(generated);
  }

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
    ...localizedEntries(ROUTES.schedulePage, "weekly", 0.9, schedule?.updatedAt),
    ...localizedEntries(ROUTES.news, "weekly", 0.8, newsPage?.updatedAt),
    ...localizedEntries(ROUTES.about, "monthly", 0.7, about?.updatedAt),
    ...localizedEntries(ROUTES.contact, "monthly", 0.7, contactPage?.updatedAt),
    ...localizedEntries(ROUTES.privacy, "yearly", 0.2, privacy?.updatedAt),
  ];

  const newsEntries: SitemapUrlEntry[] = (news ?? [])
    .filter((item) => Boolean(item.slug))
    .flatMap((item) =>
      localizedEntries(
        ROUTES.newsDetail(item.slug as string),
        "monthly",
        0.6,
        item.updatedAt || item.publishedAt,
      ),
    );

  return xmlResponse(generateUrlSetXml([...base, ...newsEntries]));
}

function xmlResponse(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

/** The build-time copy from `scripts/generate-sitemaps.mjs`, if there is one. */
async function readGenerated(name: string): Promise<string | null> {
  try {
    return await readFile(path.join(process.cwd(), ".generated", name), "utf8");
  } catch {
    return null;
  }
}
