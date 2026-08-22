/**
 * Public media paths.
 *
 * Uploads live in the Supabase bucket under `images/` and `videos/`, but they are
 * never linked directly. `next.config.ts` rewrites these site-local paths onto the
 * bucket, so an asset opens in a new tab as
 * `https://<site>/sv-marko/medija/slike/<filename>` instead of a raw storage URL.
 */

import { toAbsoluteUrl } from "./site-url";

export const IMAGE_BASE_PATH = "/sv-marko/medija/slike";
export const VIDEO_BASE_PATH = "/sv-marko/medija/videa";

type MediaLike = { filename?: string | null; url?: string | null } | null | undefined;

function joinMediaPath(base: string, filename: string): string {
  return `${base}/${filename.replace(/^\/+/, "")}`;
}

/** `/sv-marko/medija/slike/<filename>` for a `media-images` doc (or a bare filename). */
export function imageUrl(media: MediaLike | string): string | undefined {
  const filename = typeof media === "string" ? media : media?.filename;
  if (!filename) return undefined;
  if (filename.startsWith("http://") || filename.startsWith("https://")) return filename;
  return joinMediaPath(IMAGE_BASE_PATH, filename);
}

/** `/sv-marko/medija/videa/<filename>` for a `media-videos` doc (or a bare filename). */
export function videoUrl(media: MediaLike | string): string | undefined {
  const filename = typeof media === "string" ? media : media?.filename;
  if (!filename) return undefined;
  if (filename.startsWith("http://") || filename.startsWith("https://")) return filename;
  return joinMediaPath(VIDEO_BASE_PATH, filename);
}

/** Absolute variant, for sitemaps / OG tags where a full URL is required. */
export function absoluteMediaUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return toAbsoluteUrl(path);
}
