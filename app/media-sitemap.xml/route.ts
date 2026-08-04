import { getAllImages, getAllVideos } from "@/lib/api";
import { IMAGE_BASE_PATH, VIDEO_BASE_PATH } from "@/lib/media";
import {
  generateUrlSetXml,
  resolveAbsoluteUrl,
  type SitemapUrlEntry,
} from "@/utils/sitemap";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sv-marko.hr";

/** Media is indexed under the site-local media paths, not the raw bucket URL. */
function mediaEntry(
  basePath: string,
  filename?: string | null,
  updatedAt?: string,
): SitemapUrlEntry | null {
  if (!filename) return null;
  return {
    loc: resolveAbsoluteUrl(`${basePath}/${filename}`, SITE_URL),
    lastmod: updatedAt,
    changefreq: "monthly",
    priority: 0.3,
  };
}

export async function GET() {
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

  const [images, videos] = await Promise.all([
    getAllImages().catch(() => []),
    getAllVideos().catch(() => []),
  ]);

  const imageEntries = images
    .map((img) => mediaEntry(IMAGE_BASE_PATH, img.filename, img.updatedAt))
    .filter((e): e is SitemapUrlEntry => e !== null);

  const videoEntries = videos
    .map((vid) => mediaEntry(VIDEO_BASE_PATH, vid.filename, vid.updatedAt))
    .filter((e): e is SitemapUrlEntry => e !== null);

  // Include the site root so the sitemap isn't "only" media.
  const root: SitemapUrlEntry[] = [
    {
      loc: resolveAbsoluteUrl("/", SITE_URL),
      lastmod: new Date().toISOString(),
      changefreq: "weekly",
      priority: 0.1,
    },
  ];

  const xml = generateUrlSetXml([...root, ...imageEntries, ...videoEntries]);

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
