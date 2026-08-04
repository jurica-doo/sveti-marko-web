import {
  generateUrlSetXml,
  resolveAbsoluteUrl,
  type SitemapUrlEntry,
} from "@/utils/sitemap";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sv-marko.hr";

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

  // Static routes. Add dynamic (CMS-driven) entries alongside these as the
  // content collections land — see scripts/generate-sitemaps.mjs.
  const base: SitemapUrlEntry[] = [
    {
      loc: resolveAbsoluteUrl("/", SITE_URL),
      lastmod: nowIso,
      changefreq: "weekly",
      priority: 1,
    },
  ];

  const xml = generateUrlSetXml(base);

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
