import { getNews } from "@/lib/api";
import { LOCALES } from "@/lib/i18n/config";
import { imageUrl } from "@/lib/media";
import { absoluteUrl, ROUTES } from "@/lib/routes";
import { IS_INDEXABLE_DEPLOYMENT, toAbsoluteUrl } from "@/lib/site-url";
import { generateUrlSetXml, type SitemapUrlEntry } from "@/utils/sitemap";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

/**
 * Image sitemap.
 *
 * Images are declared as `<image:image>` children of the page they appear on,
 * which is the only shape the protocol defines. An earlier version listed the
 * image files themselves as `<loc>` entries — that asks Google to crawl JPEGs
 * as though they were pages, and they can never be indexed as such.
 *
 * News articles are the pages that carry galleries, so they are what this
 * covers; the standing pages' artwork is already reachable from the HTML.
 */
export async function GET() {
  if (!IS_INDEXABLE_DEPLOYMENT) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const generatedPath = path.join(
      process.cwd(),
      ".generated",
      "media-sitemap.xml",
    );
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

  // Slugs and artwork are the same document in every language, so one read is
  // enough — only the surrounding page URL changes per locale.
  const news = await getNews("hr", { limit: 500 }).catch(() => []);

  const entries: SitemapUrlEntry[] = news
    .filter((item) => item.slug)
    .flatMap((item) => {
      const images = [
        imageUrl(item.coverImage),
        ...(item.gallery ?? []).map((row) => imageUrl(row.image)),
      ]
        .filter((src): src is string => Boolean(src))
        .map((src) => toAbsoluteUrl(src));

      // De-duplicated: the CMS gallery can repeat the same upload.
      const unique = [...new Set(images)];
      if (!unique.length) return [];

      return LOCALES.map((locale) => ({
        loc: absoluteUrl(ROUTES.newsDetail(item.slug as string), locale),
        lastmod: item.updatedAt || item.publishedAt,
        images: unique,
      }));
    });

  return new Response(generateUrlSetXml(entries), {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
