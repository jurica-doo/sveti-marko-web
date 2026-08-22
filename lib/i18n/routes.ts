import { DEFAULT_LOCALE, LOCALES, type Locale } from "./config";

/** `''` for hr (unprefixed), `/en` / `/it` / `/pl` otherwise. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

/**
 * Prefixes an already-normalised internal path (leading slash, trailing
 * slash — see `internalHref()`) with the current locale. The root path is
 * special-cased so `/en` + `/` comes out `/en/`, not `/en`.
 */
export function withLocale(path: string, locale: Locale): string {
  const prefix = localePrefix(locale);
  if (!prefix) return path;
  return path === "/" ? `${prefix}/` : `${prefix}${path}`;
}

/**
 * Strips whichever locale prefix (if any) leads `pathname`, leaving the bare
 * internal path — the inverse of `withLocale()`.
 *
 * Iterates every locale, `hr` included, even though `hr` is never *emitted*
 * with a prefix. Two different inputs arrive carrying `/hr`:
 *
 *   - a real `/hr/...` URL, which `proxy.ts` 308s to the unprefixed form;
 *   - `usePathname()` in production, which reports the proxy's **rewrite
 *     destination** — so the Croatian home page reads as `/hr`, not `/`.
 *
 * The second is why this cannot iterate `PREFIXED_LOCALES`: leaving `/hr`
 * in place made the language switcher build `/en` + `/hr` = `/en/hr` (a 404),
 * and made every `=== ROUTES.home` comparison fail on the Croatian home page.
 * Both are the same locale either way, so stripping it is correct for both.
 *
 * A path that merely *starts with* a locale's letters is unaffected: the
 * match requires the following `/`, so `/energetika/` is never read as `en`.
 */
export function stripLocale(pathname: string): string {
  for (const locale of LOCALES) {
    const prefix = `/${locale}`;
    if (pathname === prefix) return "/";
    if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  }
  return pathname;
}

/**
 * "This same page, in another language" — what the language switcher links
 * to. News slugs are canonical across locales (see the CMS plan), and every
 * other path segment is identical in every language by design, so swapping
 * the prefix is all that is needed — no CMS lookup.
 */
export function swapLocale(pathname: string, target: Locale): string {
  return withLocale(stripLocale(pathname) || "/", target);
}
