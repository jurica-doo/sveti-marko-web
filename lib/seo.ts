import type { Metadata } from "next";

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
  path: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  type?: "website" | "article";
  keywords?: string[];
};

export function buildSeoMetadata(input: SeoInput): Metadata {
  const description = (input.description || DEFAULT_DESCRIPTION).trim();
  const absolutePageUrl = toAbsoluteSiteUrl(input.path);
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

  return {
    title: metadataTitle,
    description,
    alternates: {
      canonical: absolutePageUrl,
      languages: { "hr-HR": absolutePageUrl },
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
      locale: "hr_HR",
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
      "content-language": "hr",
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
          openingHoursSpecification: contact.workingHours.map((wh) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: wh.day,
            opens: wh.hours.split("-")[0]?.trim() ?? "",
            closes: wh.hours.split("-")[1]?.trim() ?? "",
          })),
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

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: toAbsoluteSiteUrl(item.href),
    })),
  };
}

export const siteSeoText = {
  siteName: SITE_NAME,
  defaultDescription: DEFAULT_DESCRIPTION,
  siteUrl: SITE_URL,
};
