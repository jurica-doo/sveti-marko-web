const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sv-marko.hr";

export function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /*?*
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/media-sitemap.xml
`;

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
