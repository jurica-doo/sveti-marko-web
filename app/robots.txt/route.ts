import { IS_INDEXABLE_DEPLOYMENT, SITE_ORIGIN } from "@/lib/site-url";

/**
 * `robots.txt`, built from the one canonical origin so the sitemap it points
 * at can never be a localhost or preview URL.
 *
 * A preview deploy disallows everything: its pages also carry `noindex`, but
 * a blanket disallow keeps crawlers off the duplicate entirely. Production
 * allows everything except the API, and deliberately does **not** disallow
 * query strings — a URL arriving with `?utm_source=…` needs to be crawlable
 * for Google to read its canonical and fold it into the clean URL. Blocking
 * it in robots.txt hides that canonical and can leave the parameterised URL
 * indexed on its own.
 */
export function GET() {
  const body = IS_INDEXABLE_DEPLOYMENT
    ? `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE_ORIGIN}/sitemap.xml
Sitemap: ${SITE_ORIGIN}/media-sitemap.xml
`
    : `User-agent: *
Disallow: /
`;

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
