/**
 * Every internal URL in the app is built here.
 *
 * `next.config.ts` sets `trailingSlash: true`, so a link to `/vijesti` costs a
 * 308 round-trip before the page renders. `internalHref()` normalises anything
 * that comes out of the CMS (where editors type paths by hand) to the canonical
 * trailing-slash form, and leaves external URLs, mailto/tel and hashes alone.
 */

/**
 * The mass-times band on the home page. Kept here rather than inline because
 * two places have to agree on it: the element that carries the `id`, and any
 * link that jumps to it.
 */
export const SCHEDULE_ANCHOR = "raspored";

export const ROUTES = {
  home: "/",
  schedule: `/#${SCHEDULE_ANCHOR}`,
  news: "/vijesti/",
  newsDetail: (slug: string) => `/vijesti/${slug}/`,
  about: "/o-nama/",
  contact: "/kontakt/",
} as const;

const EXTERNAL_PREFIXES = [
  "http://",
  "https://",
  "mailto:",
  "tel:",
  "//",
  "#",
];

export function isExternalHref(href: string): boolean {
  const value = href.trim();
  return EXTERNAL_PREFIXES.some((prefix) => value.startsWith(prefix));
}

/** Canonical internal path: leading slash, trailing slash, query/hash preserved. */
export function internalHref(href: string): string {
  const value = (href || "").trim();
  if (!value) return ROUTES.home;
  if (isExternalHref(value)) return value;

  const [pathAndQuery, hash] = splitOnce(value, "#");
  const [rawPath, query] = splitOnce(pathAndQuery, "?");

  let path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  // A path ending in a file extension (/og.png) must not gain a slash.
  const hasExtension = /\.[a-z0-9]{2,5}$/i.test(path);
  if (!hasExtension && !path.endsWith("/")) path = `${path}/`;

  return `${path}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

function splitOnce(value: string, separator: string): [string, string] {
  const index = value.indexOf(separator);
  if (index === -1) return [value, ""];
  return [value.slice(0, index), value.slice(index + 1)];
}

/** Absolute canonical URL for metadata and structured data. */
export function absoluteUrl(
  path: string,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sv-marko.hr",
): string {
  try {
    return new URL(internalHref(path), siteUrl).toString();
  } catch {
    return siteUrl;
  }
}
