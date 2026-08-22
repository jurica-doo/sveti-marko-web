import type { Metadata } from "next";

import { LOCALES, LOCALE_META, type Locale } from "./i18n/config";
import { getDictionary } from "./i18n/dictionaries";
import { withLocale } from "./i18n/routes";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sv-marko.hr";

const DEFAULT_OG_IMAGE = "/og.png";
/** `public/og.png`'s real dimensions — declaring them lets a card render before the file loads. */
const OG_IMAGE_SIZE = { width: 1200, height: 630 };

/**
 * The parish's own name for itself, per language. A searcher in Rome looks
 * for "San Marco Evangelista", not "Župa sv. Marka" — so the name, the
 * fallback description and the image alt all come out of the dictionary
 * rather than being one hardcoded Croatian string.
 */
function brand(locale: Locale) {
  return getDictionary(locale).seo;
}

function toAbsoluteSiteUrl(pathOrUrl: string): string {
  try {
    return new URL(pathOrUrl, SITE_URL).toString();
  } catch {
    return SITE_URL;
  }
}

function cmsBaseUrl(): string {
  return process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3001";
}

/**
 * Absolute URL for a CMS asset. Prefer `imageUrl()` from `lib/media.ts` for
 * anything rendered on the page — this is for metadata/OG tags, which require a
 * fully-qualified URL.
 */
export function resolveCmsImageUrl(
  image?: { url?: string | null } | null,
): string | undefined {
  const url = image?.url;
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return new URL(url, cmsBaseUrl()).toString();
}

export type SeoInput = {
  title: string;
  absoluteTitle?: boolean;
  description?: string | null;
  /** Bare, un-prefixed path (e.g. `ROUTES.news`) — `locale` supplies the prefix. */
  path: string;
  locale: Locale;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  type?: "website" | "article";
  keywords?: string[];
};

export function buildSeoMetadata(input: SeoInput): Metadata {
  const { siteName, defaultDescription, imageAlt: defaultImageAlt } = brand(input.locale);

  const description = (input.description || defaultDescription).trim();
  const absolutePageUrl = toAbsoluteSiteUrl(withLocale(input.path, input.locale));

  const usingDefaultImage = !input.imageUrl;
  const imageUrl = toAbsoluteSiteUrl(input.imageUrl || DEFAULT_OG_IMAGE);

  const metadataTitle: Metadata["title"] = input.absoluteTitle
    ? { absolute: input.title }
    : input.title;

  const imageAlt = (input.imageAlt || defaultImageAlt).trim();
  // A CMS upload carries its own dimensions; the packaged fallback's are known.
  const imageSize = usingDefaultImage
    ? OG_IMAGE_SIZE
    : {
        ...(input.imageWidth ? { width: input.imageWidth } : {}),
        ...(input.imageHeight ? { height: input.imageHeight } : {}),
      };
  const images = [{ url: imageUrl, ...imageSize, alt: imageAlt }];

  // Every language's copy of this same page, plus `x-default` pointing at the
  // hr URL — hr is what a visitor with no locale preference lands on.
  const languages: Record<string, string> = {
    "x-default": toAbsoluteSiteUrl(withLocale(input.path, "hr")),
  };
  for (const locale of LOCALES) {
    languages[LOCALE_META[locale].tag] = toAbsoluteSiteUrl(withLocale(input.path, locale));
  }

  return {
    title: metadataTitle,
    description,
    alternates: {
      canonical: absolutePageUrl,
      languages,
    },
    keywords: input.keywords,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      siteName,
      locale: LOCALE_META[input.locale].ogLocale,
      // Tells a scraper the other three exist, so a share in one language can
      // surface the reader's own.
      alternateLocale: LOCALES.filter((l) => l !== input.locale).map(
        (l) => LOCALE_META[l].ogLocale,
      ),
      title: input.title,
      description,
      type: input.type || "website",
      url: absolutePageUrl,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: [imageUrl],
    },
    other: {
      "content-language": input.locale,
    },
  };
}

/**
 * Defaults every page inherits, in the language it is being rendered in.
 *
 * The title template is what a search result actually shows: an inner page
 * passing "Kontakt" surfaces as "Kontakt — Župa sv. Marka Evanđelista", so
 * the parish is identifiable from the SERP alone rather than only from the
 * one page whose title happens to name it. A page that already names the
 * parish (the home page) opts out with `absoluteTitle`.
 */
export function seoRootDefaults(locale: Locale): Metadata {
  const { siteName, shortName, defaultDescription } = brand(locale);

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: shortName,
    title: {
      default: siteName,
      template: `%s — ${siteName}`,
    },
    description: defaultDescription,
    creator: siteName,
    publisher: siteName,
    formatDetection: {
      telephone: true,
      email: true,
      address: true,
    },
  };
}

/** Weekday order, so a range like "Monday – Friday" can be expanded. */
const WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/**
 * How each weekday starts, in all four languages, after `normalise()` below.
 *
 * Matched by prefix rather than in full because the office writes days in
 * whatever case the sentence needs — Croatian "Nedjelja" and "Nedjeljom" are
 * the same day — and a prefix survives that where an exact match would not.
 *
 * Anchored to the start of a word, which is load-bearing: Croatian
 * "poNEDJELJak" (Monday) contains "nedjelj" (Sunday), so an unanchored
 * search reads "Ponedjeljak – petak" as spanning Sunday to Friday.
 */
const DAY_PREFIXES: Record<(typeof WEEK)[number], string[]> = {
  Monday: ["ponedjelj", "monday", "lunedi", "poniedzial"],
  Tuesday: ["utor", "tuesday", "martedi", "wtor"],
  Wednesday: ["srijed", "wednesday", "mercoledi", "srod"],
  Thursday: ["cetvrt", "thursday", "giovedi", "czwart"],
  Friday: ["pet", "friday", "venerdi", "piat"],
  Saturday: ["subot", "saturday", "sabat", "sobot"],
  Sunday: ["nedjelj", "sunday", "domenic", "niedziel"],
};

/** Lowercase, strip accents, and fold the letters NFD leaves alone. */
function normalise(value: string): string {
  return value
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Turns a free-text day label into schema.org day names.
 *
 * `dayOfWeek` only accepts the seven `DayOfWeek` values, but the CMS field is
 * a text box the office types into — "Ponedjeljak – petak", "Utorak i
 * četvrtak", "Sunday". A dash between two days is read as a range and
 * expanded; anything else is read as the list of days it names. Text that
 * names no day at all returns `null`, and the caller drops the row rather
 * than emitting a value a validator would reject.
 */
export function parseDaysOfWeek(label: string): string[] | null {
  const text = normalise(label);

  const found: { day: (typeof WEEK)[number]; at: number }[] = [];
  for (const day of WEEK) {
    const at = Math.min(
      ...DAY_PREFIXES[day].map((p) => {
        const match = new RegExp(`(?:^|[^a-z0-9])(${p})`).exec(text);
        return match ? match.index + match[0].length - p.length : Number.POSITIVE_INFINITY;
      }),
    );
    if (Number.isFinite(at)) found.push({ day, at });
  }

  if (!found.length) return null;
  found.sort((a, b) => a.at - b.at);

  const isRange = /[–—-]/.test(text) && found.length === 2;
  if (!isRange) return found.map((f) => f.day);

  const from = WEEK.indexOf(found[0].day);
  const to = WEEK.indexOf(found[1].day);
  if (from === -1 || to === -1 || to < from) return found.map((f) => f.day);

  return WEEK.slice(from, to + 1) as unknown as string[];
}

export type ChurchJsonLdInput = {
  locale: Locale;
  contact?: {
    street?: string | null;
    postalCode?: string | null;
    city?: string | null;
    phone?: string | null;
    mobile?: string | null;
    email?: string | null;
  } | null;
  /** The archdiocese, from `settings.diocese`. */
  diocese?: string | null;
  social?: { url: string }[] | null;
  directionsUrl?: string | null;
  officeHours?: { day: string; hours: string }[];
};

/**
 * The parish as a `Church` rather than a `LocalBusiness`.
 *
 * `Church` (a `PlaceOfWorship`) is what this actually is, and the more
 * specific type is a stronger signal to a search engine deciding whether
 * this page answers "mass times near me". The address is split into real
 * `PostalAddress` fields instead of one concatenated string, so the parish
 * can be matched against a place rather than a line of text.
 *
 * `alternateName` carries the parish's name in the other three languages:
 * someone searching "Church of St Mark Split" in English should reach the
 * same entity as someone searching "Župa sv. Marka".
 */
export function buildChurchJsonLd(input: ChurchJsonLdInput) {
  const { locale, contact, diocese, social, directionsUrl, officeHours } = input;
  const { siteName, defaultDescription } = brand(locale);

  const alternateName = LOCALES.filter((l) => l !== locale).map((l) => brand(l).siteName);

  // "Zatvoreno" / "Closed" has no dash to split on, and a row the office has
  // not filled in for this locale has nothing to read — both are skipped
  // rather than emitted as a half-built spec.
  const hours = (officeHours ?? [])
    .flatMap((row) => {
      if (!row.day || !row.hours?.includes("–")) return [];

      // A label naming no recognisable day cannot be expressed as a valid
      // `dayOfWeek`, so the row is left out rather than emitted as one a
      // validator would reject.
      const dayOfWeek = parseDaysOfWeek(row.day);
      if (!dayOfWeek) return [];

      const [opens, closes] = row.hours.split("–");
      return [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek,
          opens: opens?.trim() ?? "",
          closes: closes?.trim() ?? "",
        },
      ];
    });

  const sameAs = (social ?? []).map((item) => item.url).filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Church",
    "@id": `${SITE_URL}/#church`,
    name: siteName,
    alternateName,
    url: toAbsoluteSiteUrl(withLocale("/", locale)),
    description: defaultDescription,
    image: toAbsoluteSiteUrl(DEFAULT_OG_IMAGE),
    inLanguage: LOCALES.map((l) => LOCALE_META[l].tag),
    address: {
      "@type": "PostalAddress",
      ...(contact?.street ? { streetAddress: contact.street } : {}),
      ...(contact?.postalCode ? { postalCode: contact.postalCode } : {}),
      ...(contact?.city ? { addressLocality: contact.city } : {}),
      addressCountry: "HR",
    },
    ...(contact?.phone || contact?.mobile
      ? { telephone: contact.phone || contact.mobile }
      : {}),
    ...(contact?.email ? { email: contact.email } : {}),
    ...(diocese
      ? { parentOrganization: { "@type": "Organization", name: diocese } }
      : {}),
    ...(directionsUrl ? { hasMap: directionsUrl } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
  };
}

/**
 * JSON-LD payload for a <script> tag. `<` is escaped so CMS copy containing
 * `</script>` cannot break out of the tag.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export type BreadcrumbItem = { name: string; href: string };

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[], locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: toAbsoluteSiteUrl(withLocale(item.href, locale)),
    })),
  };
}

