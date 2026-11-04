import type { Metadata } from "next";

import { LOCALES, LOCALE_META, type Locale } from "./i18n/config";
import { getDictionary } from "./i18n/dictionaries";
import { withLocale } from "./i18n/routes";
import { IS_INDEXABLE_DEPLOYMENT, SITE_ORIGIN, toAbsoluteUrl } from "./site-url";

/**
 * The picture every link to this site unfurls with, in WhatsApp, Messages,
 * Facebook, Slack — anywhere a URL is pasted.
 *
 * One image for the whole site, deliberately: the parish mark on the ink
 * ground, built by `npm run generate:icons` from `brand/mark-light.png`. A
 * share preview is the parish introducing itself to someone who has not been
 * here yet, and it should look the same whichever page the link happens to
 * point at.
 *
 * A news article is the one exception, and it passes `SeoInput.image` to say
 * so — see the note there.
 *
 * 1200x630 is the 1.91:1 that Facebook, LinkedIn and WhatsApp all crop toward.
 * The mark itself occupies only the middle quarter of the width (x 446-752),
 * so the platforms that crop to a square instead take the centre 630x630 and
 * lose nothing but empty ground.
 *
 * Declaring the dimensions is not decoration: a scraper that knows the size
 * can lay the card out before the file arrives, and WhatsApp is markedly more
 * willing to render a large preview when the tags state one.
 */
const SHARE_IMAGE = { url: "/og.png", width: 1200, height: 630 } as const;

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

export type SeoInput = {
  title: string;
  absoluteTitle?: boolean;
  description?: string | null;
  /** Bare, un-prefixed path (e.g. `ROUTES.news`) — `locale` supplies the prefix. */
  path: string;
  locale: Locale;
  /**
   * A picture of the page's own, shown instead of `SHARE_IMAGE`.
   *
   * Only a news article passes one. Its cover *is* the story, and ten articles
   * unfurling as ten copies of the same parish card tells a reader nothing
   * about which one they were sent. Every other page is the parish itself, and
   * takes the parish's card.
   */
  image?: {
    url: string;
    alt?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  type?: "website" | "article";
  keywords?: string[];
};

export function buildSeoMetadata(input: SeoInput): Metadata {
  const { siteName, defaultDescription, imageAlt } = brand(input.locale);

  const description = (input.description || defaultDescription).trim();
  const absolutePageUrl = toAbsoluteSiteUrl(withLocale(input.path, input.locale));

  const share = input.image ?? SHARE_IMAGE;
  const shareImageUrl = toAbsoluteSiteUrl(share.url);
  const images = [
    {
      url: shareImageUrl,
      ...(share.width ? { width: share.width } : {}),
      ...(share.height ? { height: share.height } : {}),
      // A cover with no alt of its own still gets the parish's description
      // rather than nothing at all.
      alt: (input.image?.alt || imageAlt).trim(),
    },
  ];

  const metadataTitle: Metadata["title"] = input.absoluteTitle
    ? { absolute: input.title }
    : input.title;

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
export function seoRootDefaults(locale: Locale): Metadata {
  const { siteName, shortName, defaultDescription, imageAlt } = brand(locale);

  // Also carried here, not only in `buildSeoMetadata`, so routes rendered
  // inside this layout that generate no metadata of their own — `not-found`,
  // `error` — still unfurl with a picture instead of a bare link.
  const images = [
    {
      url: toAbsoluteSiteUrl(SHARE_IMAGE.url),
      width: SHARE_IMAGE.width,
      height: SHARE_IMAGE.height,
      alt: imageAlt.trim(),
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
      images: [toAbsoluteSiteUrl(SHARE_IMAGE.url)],
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

/** `9:00` / `09.00` → `09:00`; anything that is not a time of day → null. */
function isoTime(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

/**
 * A Croatian number as written by the office, in international form:
 * `(021) 367-422` → `+385 21 367 422`. A leading `0` is the domestic trunk
 * prefix and gives way to `+385`; `00…` and `+…` are already international.
 */
function internationalPhone(value?: string | null): string | undefined {
  if (!value) return undefined;
  const plus = value.trim().startsWith("+");
  let digits = value.replace(/\D/g, "");
  if (!digits) return undefined;
  if (!plus) {
    if (digits.startsWith("00")) digits = digits.slice(2);
    else if (digits.startsWith("0")) digits = `385${digits.slice(1)}`;
  }
  if (!digits.startsWith("385")) return `+${digits}`;
  const national = digits.slice(3);
  // Split (021) numbers are area code 21 + six digits; anything else is
  // grouped by threes, which reads fine for mobiles (09x xxx xxxx).
  const area = national.startsWith("1") ? national.slice(0, 1) : national.slice(0, 2);
  const rest = national.slice(area.length).replace(/(\d{3})(?=\d)/g, "$1 ");
  return `+385 ${area} ${rest}`;
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
    // Split on an en dash or a plain hyphen — the CMS field's own hint shows
    // `09:00 - 11:00`, so office copy arrives either way.
    const [from, to, ...rest] = (row.hours ?? "").split(/\s*[–-]\s*/);
    if (!row.day || rest.length || !from || !to) return [];

    // A label naming no recognisable day cannot be expressed as a valid
    // `dayOfWeek`, so the row is left out rather than emitting one a
    // validator would reject.
    const dayOfWeek = parseDaysOfWeek(row.day);
    if (!dayOfWeek) return [];

    // schema.org wants `HH:MM`; office copy says `9:00`.
    const opens = isoTime(from);
    const closes = isoTime(to);
    if (!opens || !closes) return [];

    return [{ "@type": "OpeningHoursSpecification", dayOfWeek, opens, closes }];
  });

  const sameAs = (social ?? []).map((item) => item.url).filter(Boolean);
  // International form (`+385 21 367 422`): the local `(021) 367-422` the
  // office writes is ambiguous to anyone outside Croatia, a crawler included.
  const telephone = internationalPhone(contact?.phone || contact?.mobile);

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
    ...(logoUrl ? { logo: logoUrl, image: logoUrl } : { image: toAbsoluteSiteUrl(SHARE_IMAGE.url) }),
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

