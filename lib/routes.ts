/**
 * Every internal URL in the app is built here.
 *
 * `next.config.ts` sets `trailingSlash: true`, so a link to `/vijesti` costs a
 * 308 round-trip before the page renders. `internalHref()` normalises anything
 * that comes out of the CMS (where editors type paths by hand) to the canonical
 * trailing-slash form, and leaves external URLs, mailto/tel and hashes alone.
 */

import type { Locale } from "./i18n/config";
import { withLocale } from "./i18n/routes";
import { toAbsoluteUrl } from "./site-url";

/**
 * The mass-times band on the home page. Kept here rather than inline because
 * two places have to agree on it: the element that carries the `id`, and any
 * link that jumps to it.
 */
export const SCHEDULE_ANCHOR = "raspored";

export const ROUTES = {
  home: "/",
  schedule: `/#${SCHEDULE_ANCHOR}`,
  /** The full Raspored page — masses plus catechesis, choirs and groups. */
  schedulePage: "/raspored/",
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

/**
 * Whether `href` points at the page already on screen.
 *
 * Both sides are compared with the trailing slash stripped. `usePathname()`
 * reports the URL as served — with the slash, since `trailingSlash: true` — but
 * a CMS href is typed by hand and arrives either way, and normalising through
 * `internalHref` first would still leave the root as the one path where the
 * slash is not optional.
 *
 * A query or fragment makes it a different destination, so those are not the
 * same page even when the path matches: `?page=2` is somewhere else on the news
 * archive, and a fragment is `HashLink`'s job.
 */
export function isCurrentPage(pathname: string, href: string): boolean {
  const value = (href || "").trim();
  if (!value || isExternalHref(value)) return false;
  if (value.includes("?") || value.includes("#")) return false;

  return stripTrailingSlash(internalHref(value)) === stripTrailingSlash(pathname);
}

/** `/vijesti/` and `/vijesti` collapse to one; `/` stays `/`. */
function stripTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function splitOnce(value: string, separator: string): [string, string] {
  const index = value.indexOf(separator);
  if (index === -1) return [value, ""];
  return [value.slice(0, index), value.slice(index + 1)];
}

/**
 * Absolute canonical URL for metadata and structured data.
 *
 * `locale` is optional (rather than threaded through every existing call
 * site) — omit it for a bare hr URL, pass it to point at that language's
 * copy of the page instead. See `lib/i18n/routes.ts#withLocale`.
 */
export function absoluteUrl(path: string, locale?: Locale): string {
  const localizedPath = locale
    ? withLocale(internalHref(path), locale)
    : internalHref(path);
  return toAbsoluteUrl(localizedPath);
}
