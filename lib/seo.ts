import type { Metadata } from "next";

import { getHomePage } from "./api";
import { LOCALES, LOCALE_META, type Locale } from "./i18n/config";
import { getDictionary } from "./i18n/dictionaries";
import { withLocale } from "./i18n/routes";
import { imageUrl } from "./media";
import { IS_INDEXABLE_DEPLOYMENT, SITE_ORIGIN, toAbsoluteUrl } from "./site-url";

/** Last resort only — stands in when the CMS cannot be reached. See `getShareImage()`. */
const DEFAULT_OG_IMAGE = "/og.png";
/** `public/og.png`'s real dimensions — declaring them lets a card render before the file loads. */
const OG_IMAGE_SIZE = { width: 1200, height: 630 };

/**
 * Where the church actually stands.
 *
 * Read from the Google Maps place embed for "Crkva sv. Marko" — the `!3d`
 * (latitude) and `!2d` (longitude) parameters of its `pb` string. Because the
 * embed is a *place* embed rather than an address query, these are the pin
 * Google itself holds for the building, not a geocode of the street.
 *
 * Six decimals is ~0.1 m, far finer than the building; the raw values carry
 * more digits than the position is meaningful to.
 *
 * A constant rather than a CMS field: a church does not move, and a wrong
 * value here sends people to the wrong place — so it should change only
 * through a reviewed commit.
 */
const PARISH_GEO = { latitude: 43.521141, longitude: 16.476021 } as const;

/**
 * The parish's own name for itself, per language. A searcher in Rome looks
 * for "San Marco Evangelista", not "Župa sv. Marka" — so the name, the
 * fallback description and the image alt all come out of the dictionary
 * rather than being one hardcoded Croatian string.
 */
function brand(locale: Locale) {
  return getDictionary(locale).seo;
}

const toAbsoluteSiteUrl = toAbsoluteUrl;

export type ShareImage = {
  /** Site-relative or absolute; `buildSeoMetadata` absolutises it. */
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

/**
 * The picture a link to this site shows when it is pasted into WhatsApp,
 * Messages, Facebook, Slack — anywhere that unfurls a URL.
 *
 * It is the home page hero, read from the CMS rather than committed as a file
 * in `public/`, so swapping the hero in the admin swaps every share preview on
 * the site within the ISR window — no code change, no deploy.
 *
 * A page that carries its own picture (a news article's cover, a page hero)
 * still uses it; this is what every *other* URL falls back to, which today is
 * all of them. If the CMS is unreachable the packaged `og.png` stands in, so a
 * shared link never unfurls blank.
 *
 * The hero's own dimensions and alt text come along with it: a scraper that
 * knows the size can lay out the card before the image finishes loading, and
 * WhatsApp in particular is more willing to render a large preview when the
 * tags declare one.
 */
export async function getShareImage(locale: Locale): Promise<ShareImage> {
  const home = await getHomePage(locale).catch(() => null);
  const hero = home?.hero?.image;
  const url = imageUrl(hero);

  if (!url) return { url: DEFAULT_OG_IMAGE, ...OG_IMAGE_SIZE };

  return {
    url,
    ...(hero?.width ? { width: hero.width } : {}),
    ...(hero?.height ? { height: hero.height } : {}),
    ...(hero?.alt ? { alt: hero.alt } : {}),
  };
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

export async function buildSeoMetadata(input: SeoInput): Promise<Metadata> {
  const { siteName, defaultDescription, imageAlt: defaultImageAlt } = brand(input.locale);

  const description = (input.description || defaultDescription).trim();
  const absolutePageUrl = toAbsoluteSiteUrl(withLocale(input.path, input.locale));

  // The page's own picture if it has one, otherwise the site-wide share image
  // (the home hero, straight from the CMS).
  const share: ShareImage = input.imageUrl
    ? {
        url: input.imageUrl,
        ...(input.imageWidth ? { width: input.imageWidth } : {}),
        ...(input.imageHeight ? { height: input.imageHeight } : {}),
        ...(input.imageAlt ? { alt: input.imageAlt } : {}),
      }
    : await getShareImage(input.locale);

  const shareImageUrl = toAbsoluteSiteUrl(share.url);

  const metadataTitle: Metadata["title"] = input.absoluteTitle
    ? { absolute: input.title }
    : input.title;

  const imageAlt = (input.imageAlt || share.alt || defaultImageAlt).trim();
  const images = [
    {
      url: shareImageUrl,
      ...(share.width ? { width: share.width } : {}),
      ...(share.height ? { height: share.height } : {}),
      alt: imageAlt,
    },
  ];

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
    /*
     * A preview deploy serves the whole site on its own *.vercel.app host.
     * Left indexable that is a complete duplicate of production competing
     * with it, so previews go `noindex` while still being followable for
     * anyone reviewing them.
     */
    robots: IS_INDEXABLE_DEPLOYMENT
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: true },
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
      images: [shareImageUrl],
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
export async function seoRootDefaults(locale: Locale): Promise<Metadata> {
  const { siteName, shortName, defaultDescription, imageAlt } = brand(locale);

  // Also carried here, not only in `buildSeoMetadata`, so routes rendered
  // inside this layout that generate no metadata of their own — `not-found`,
  // `error` — still unfurl with a picture instead of a bare link.
  const share = await getShareImage(locale);
  const images = [
    {
      url: toAbsoluteSiteUrl(share.url),
      ...(share.width ? { width: share.width } : {}),
      ...(share.height ? { height: share.height } : {}),
      alt: (share.alt || imageAlt).trim(),
    },
  ];

  return {
    metadataBase: new URL(SITE_ORIGIN),
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
    openGraph: {
      siteName,
      locale: LOCALE_META[locale].ogLocale,
      type: "website",
      url: toAbsoluteSiteUrl(withLocale("/", locale)),
      images,
    },
    twitter: {
      card: "summary_large_image",
      images: [toAbsoluteSiteUrl(share.url)],
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

/** Stable identifiers, so every reference resolves to the same node. */
export const ENTITY_ID = {
  organization: `${SITE_ORIGIN}/#organization`,
  church: `${SITE_ORIGIN}/#church`,
  website: `${SITE_ORIGIN}/#website`,
} as const;

export type SiteJsonLdInput = {
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
  /** Absolute URL of the parish logo, from `settings.logo`. */
  logoUrl?: string | null;
  /**
   * Latitude/longitude of the church building. Defaults to `PARISH_GEO`;
   * pass `null` to omit the `geo` node entirely.
   */
  geo?: { latitude: number; longitude: number } | null;
};

/**
 * The site's entity graph: the parish, the building, and the website.
 *
 * Modelled as three linked nodes rather than one, because `Church` sits under
 * `Place` in the schema.org hierarchy (Thing → Place → CivicStructure →
 * PlaceOfWorship → Church) and a place cannot carry the properties an
 * institution has. Collapsing them put `parentOrganization` (defined on
 * `Organization`), `email` (`Organization`/`Person`/`ContactPoint`) and
 * `inLanguage` (`CreativeWork`/`Event`) on a `Place`, and left
 * `NewsArticle.publisher` — which ranges over `Organization`/`Person` —
 * pointing at one.
 *
 * So:
 *   `#organization` is the parish as an institution: who it is, who it
 *     belongs to, how to contact it, and what it publishes.
 *   `#church` is the building: where it is, and when its doors are open.
 *   `#website` is this site, and the languages it is published in.
 *
 * `location` ties the institution to its building; `publisher` ties the site
 * (and every article) to the institution.
 *
 * `alternateName` carries the parish's name in the other three languages, so
 * someone searching "Church of St Mark Split" reaches the same entity as
 * someone searching "Župa sv. Marka".
 */
export function buildSiteJsonLd(input: SiteJsonLdInput) {
  const {
    locale,
    contact,
    diocese,
    social,
    directionsUrl,
    officeHours,
    logoUrl,
    // `undefined` means "not specified" and takes the parish's own
    // coordinates; an explicit `null` opts out.
    geo = PARISH_GEO,
  } = input;
  const { siteName, defaultDescription } = brand(locale);

  const alternateName = LOCALES.filter((l) => l !== locale).map((l) => brand(l).siteName);

  // "Zatvoreno" / "Closed" has no dash to split on, and a row the office has
  // not filled in for this locale has nothing to read — both are skipped
  // rather than emitted as a half-built spec.
  const hours = (officeHours ?? []).flatMap((row) => {
    if (!row.day || !row.hours?.includes("–")) return [];

    // A label naming no recognisable day cannot be expressed as a valid
    // `dayOfWeek`, so the row is left out rather than emitting one a
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
  const telephone = contact?.phone || contact?.mobile || undefined;

  const address = {
    "@type": "PostalAddress",
    ...(contact?.street ? { streetAddress: contact.street } : {}),
    ...(contact?.postalCode ? { postalCode: contact.postalCode } : {}),
    ...(contact?.city ? { addressLocality: contact.city } : {}),
    addressCountry: "HR",
  };

  const organization = {
    "@type": "Organization",
    "@id": ENTITY_ID.organization,
    name: siteName,
    alternateName,
    url: toAbsoluteSiteUrl(withLocale("/", locale)),
    description: defaultDescription,
    address,
    ...(logoUrl ? { logo: logoUrl, image: logoUrl } : { image: toAbsoluteSiteUrl(DEFAULT_OG_IMAGE) }),
    ...(telephone ? { telephone } : {}),
    ...(contact?.email ? { email: contact.email } : {}),
    ...(diocese ? { parentOrganization: { "@type": "Organization", name: diocese } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    location: { "@id": ENTITY_ID.church },
  };

  const church = {
    "@type": "Church",
    "@id": ENTITY_ID.church,
    name: siteName,
    address,
    ...(telephone ? { telephone } : {}),
    ...(geo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: geo.latitude,
            longitude: geo.longitude,
          },
        }
      : {}),
    ...(directionsUrl ? { hasMap: directionsUrl } : {}),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
  };

  const website = {
    "@type": "WebSite",
    "@id": ENTITY_ID.website,
    url: toAbsoluteSiteUrl("/"),
    name: siteName,
    // Valid here and nowhere else in this graph: `inLanguage` is a
    // `CreativeWork` property, and the website is the only CreativeWork.
    inLanguage: LOCALES.map((l) => LOCALE_META[l].tag),
    publisher: { "@id": ENTITY_ID.organization },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [organization, church, website],
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

