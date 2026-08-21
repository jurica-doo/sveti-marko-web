import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DEFAULT_LOCALE, PREFIXED_LOCALES } from "@/lib/i18n/config";

/**
 * hr is the primary language and stays unprefixed at the URL bar
 * (`/vijesti/`, not `/hr/vijesti/`); en/it/pl are prefixed
 * (`/en/vijesti/`). Every route lives under `app/[lang]/`, so this is what
 * makes the hidden default locale actually resolve to `lang: 'hr'`.
 *
 * Next 16 renamed middleware to Proxy — same mechanism, this file replaces
 * what would have been `middleware.ts`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPrefixed = PREFIXED_LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (isPrefixed) return; // /en, /it, /pl already match `[lang]` directly.

  const hasDefaultPrefix =
    pathname === `/${DEFAULT_LOCALE}` || pathname.startsWith(`/${DEFAULT_LOCALE}/`);
  if (hasDefaultPrefix) {
    // Canonicalise: hr has exactly one URL, and it's the unprefixed one.
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(`/${DEFAULT_LOCALE}`.length) || "/";
    return NextResponse.redirect(url, 308);
  }

  // Bare path — rewrite internally to hr so `[lang]` resolves, while the
  // address bar keeps showing the unprefixed URL the visitor requested.
  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Skip _next, api, the top-level route handlers, and anything that looks
    // like a static file (has a dot in the last path segment) — favicons,
    // images, fonts, sitemap.xml, manifest.webmanifest, robots.txt, etc.
    "/((?!_next|api|sitemap\\.xml|media-sitemap\\.xml|robots\\.txt|manifest|favicon\\.ico|icon\\.png|apple-icon\\.png|.*\\..*).*)",
  ],
};
