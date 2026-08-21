/**
 * The four languages the site serves. hr is primary: it is unprefixed in the
 * URL (`proxy.ts` rewrites bare paths to it) and it is what the CMS falls
 * back to for any field a translation is still missing on.
 */
export const LOCALES = ["hr", "en", "it", "pl"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "hr";

/** Locales that carry a URL prefix — every locale except the default. */
export const PREFIXED_LOCALES = LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE,
) as Exclude<Locale, typeof DEFAULT_LOCALE>[];

export function hasLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

type LocaleMeta = {
  /** The language's own name for itself, used in the switcher's aria-label. */
  nativeName: string;
  /** BCP 47 tag for `<html lang>`, `hreflang` and OpenGraph's dashed form. */
  tag: string;
  /** `og:locale` — same information, underscored. */
  ogLocale: string;
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  hr: { nativeName: "Hrvatski", tag: "hr", ogLocale: "hr_HR" },
  en: { nativeName: "English", tag: "en", ogLocale: "en_US" },
  it: { nativeName: "Italiano", tag: "it", ogLocale: "it_IT" },
  pl: { nativeName: "Polski", tag: "pl", ogLocale: "pl_PL" },
};
