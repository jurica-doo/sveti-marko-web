import type { Metadata } from "next";

import { LOCALES, LOCALE_META, type Locale } from "./i18n/config";
import { withLocale } from "./i18n/routes";

// TODO: replace the brand constants below once the real copy/branding lands.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sv-marko.hr";
const SITE_NAME = "Sv. Marko";

const DEFAULT_DESCRIPTION = "";

const DEFAULT_OG_IMAGE = "/og.png";
const DEFAULT_IMAGE_ALT = SITE_NAME;

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
  const description = (input.description || DEFAULT_DESCRIPTION).trim();
  const absolutePageUrl = toAbsoluteSiteUrl(withLocale(input.path, input.locale));
  const imageUrl = toAbsoluteSiteUrl(input.imageUrl || DEFAULT_OG_IMAGE);

  const metadataTitle: Metadata["title"] = input.absoluteTitle
    ? { absolute: input.title }
    : input.title;

  const imageAlt = (input.imageAlt || DEFAULT_IMAGE_ALT).trim();
  const images = [
    {
      url: imageUrl,
      ...(input.imageWidth ? { width: input.imageWidth } : {}),
      ...(input.imageHeight ? { height: input.imageHeight } : {}),
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
      siteName: SITE_NAME,
      locale: LOCALE_META[input.locale].ogLocale,
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

export const seoRootDefaults: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s`,
  },
  description: DEFAULT_DESCRIPTION,
  category: "business",
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
};

export function buildBusinessJsonLd(contact?: {
  phone?: string;
  email?: string;
  address?: string;
  workingHours?: { day: string; hours: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "Organization"],
    "@id": `${SITE_URL}/#business`,
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    ...(contact?.phone ? { telephone: contact.phone } : {}),
    ...(contact?.email ? { email: contact.email } : {}),
    address: {
      "@type": "PostalAddress",
      ...(contact?.address ? { streetAddress: contact.address } : {}),
      addressCountry: "HR",
    },
    sameAs: [] as string[],
    ...(contact?.workingHours && contact.workingHours.length > 0
      ? {
          // Only rows that are both filled in and actually a range (not
          // "Zatvoreno"/"Closed", which has no dash to split on) become a
          // spec entry — CMS content that's missing or unrecognised for
          // this locale is skipped rather than emitted as a broken one.
          openingHoursSpecification: contact.workingHours
            .filter((wh) => wh.day && wh.hours?.includes("–"))
            .map((wh) => {
              const [opens, closes] = wh.hours.split("–");
              return {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: wh.day,
                opens: opens?.trim() ?? "",
                closes: closes?.trim() ?? "",
              };
            }),
        }
      : {}),
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

export const siteSeoText = {
  siteName: SITE_NAME,
  defaultDescription: DEFAULT_DESCRIPTION,
  siteUrl: SITE_URL,
};
