import type { Locale } from "./i18n/config";
import {
  AboutPageType,
  ContactPageType,
  HomePageType,
  NewsPageType,
  NewsType,
  PaginatedDocs,
  PrivacyPageType,
  SchedulePageType,
  ScheduleType,
  SettingsType,
  UsefulLinkType,
} from "./types";

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3001";

/** Generous for a cold serverless CMS; short enough that a dead one is noticed. */
const CMS_TIMEOUT_MS = 10_000;

/** Default ISR window for every CMS read. */
const REVALIDATE = 60;

/**
 * Low-level fetch against the Payload REST API.
 * Every exported getter below goes through this so caching, error logging and
 * the base URL stay identical across the app.
 */
async function cmsFetch<T>(
  path: string,
  { label, revalidate = REVALIDATE }: { label: string; revalidate?: number },
): Promise<T> {
  const url = `${CMS_URL}${path}`;

  const res = await fetch(url, {
    next: { revalidate },
    // A CMS that hangs rather than failing must not hang the page with it.
    // Timed out, the read fails like any other error: a page being refreshed
    // in the background keeps its last good version, so a CMS outage costs
    // freshness rather than the site.
    signal: AbortSignal.timeout(CMS_TIMEOUT_MS),
  });

  if (!res.ok) {
    console.error(`${label} failed:`, res.status, res.statusText);
    throw new Error(`Failed to fetch ${label}`);
  }

  return (await res.json()) as T;
}

/**
 * `&locale=xx` for every request. Payload is configured with
 * `fallback: true` and `defaultLocale: 'hr'`, so a field the office hasn't
 * translated yet for `locale` comes back as its Croatian value rather than
 * blank — no explicit `fallback-locale` param needed.
 */
function withLocale(path: string, locale: Locale): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}locale=${locale}`;
}

/** `GET /api/globals/<slug>` */
export async function getGlobal<T>(
  slug: string,
  locale: Locale,
  { depth = 3, revalidate }: { depth?: number; revalidate?: number } = {},
): Promise<T> {
  return cmsFetch<T>(
    withLocale(`/api/globals/${slug}?depth=${depth}`, locale),
    {
      label: `global ${slug}`,
      revalidate,
    },
  );
}

/** `GET /api/<slug>` — returns `docs`. */
export async function getCollection<T>(
  slug: string,
  locale: Locale,
  {
    depth = 2,
    limit = 1000,
    revalidate,
  }: { depth?: number; limit?: number; revalidate?: number } = {},
): Promise<T[]> {
  const data = await cmsFetch<PaginatedDocs<T>>(
    withLocale(`/api/${slug}?limit=${limit}&depth=${depth}`, locale),
    { label: `collection ${slug}`, revalidate },
  );
  return data.docs ?? [];
}

/* --------------------------------------------------------------- globals */

export async function getSettings(locale: Locale): Promise<SettingsType> {
  return getGlobal<SettingsType>("settings", locale, { depth: 1 });
}

export async function getSchedule(locale: Locale): Promise<ScheduleType> {
  return getGlobal<ScheduleType>("schedule", locale, { depth: 0 });
}

export async function getHomePage(locale: Locale): Promise<HomePageType> {
  return getGlobal<HomePageType>("home-page", locale, { depth: 1 });
}

export async function getSchedulePage(
  locale: Locale,
): Promise<SchedulePageType> {
  return getGlobal<SchedulePageType>("schedule-page", locale, { depth: 1 });
}

export async function getPrivacyPage(locale: Locale): Promise<PrivacyPageType> {
  return getGlobal<PrivacyPageType>("privacy-page", locale, { depth: 0 });
}

export async function getNewsPage(locale: Locale): Promise<NewsPageType> {
  return getGlobal<NewsPageType>("news-page", locale, { depth: 1 });
}

export async function getAboutPage(locale: Locale): Promise<AboutPageType> {
  return getGlobal<AboutPageType>("about-page", locale, { depth: 1 });
}

export async function getContactPage(locale: Locale): Promise<ContactPageType> {
  return getGlobal<ContactPageType>("contact-page", locale, { depth: 1 });
}

/* ----------------------------------------------------------- collections */

/** Published news, newest first — the same ordering as the archive. */
export async function getNews(
  locale: Locale,
  { limit = 100 }: { limit?: number } = {},
): Promise<NewsType[]> {
  const data = await cmsFetch<PaginatedDocs<NewsType>>(
    withLocale(
      `/api/news?limit=${limit}&depth=2&sort=-publishedAt&where[_status][equals]=published`,
      locale,
    ),
    { label: "news" },
  );
  return data.docs ?? [];
}

/**
 * The path a page of published news lives at.
 *
 * Exported as a string rather than hidden inside a fetch so the archive can
 * request the next page straight from the browser: the CMS origin is public
 * (`NEXT_PUBLIC_CMS_URL`) and already on the CORS allowlist, so paging needs no
 * route of our own standing between the two.
 */
export function newsPagePath(
  locale: Locale,
  { page = 1, limit = 9 }: { page?: number; limit?: number } = {},
): string {
  return `${CMS_URL}${withLocale(
    `/api/news?limit=${limit}&page=${page}&depth=2&sort=-publishedAt&where[_status][equals]=published`,
    locale,
  )}`;
}

/** One page of published news, newest first, with the paging flags. */
export async function getNewsPaginated(
  locale: Locale,
  { page = 1, limit = 9 }: { page?: number; limit?: number } = {},
): Promise<PaginatedDocs<NewsType>> {
  return cmsFetch<PaginatedDocs<NewsType>>(
    newsPagePath(locale, { page, limit }).replace(CMS_URL, ""),
    { label: "news page" },
  );
}

export async function getNewsBySlug(
  slug: string,
  locale: Locale,
): Promise<NewsType | null> {
  const data = await cmsFetch<PaginatedDocs<NewsType>>(
    withLocale(
      `/api/news?where[slug][equals]=${encodeURIComponent(
        slug,
      )}&where[_status][equals]=published&depth=2&limit=1`,
      locale,
    ),
    { label: "news by slug" },
  );
  return data.docs?.[0] ?? null;
}

export async function getUsefulLinks(
  locale: Locale,
): Promise<UsefulLinkType[]> {
  return getCollection<UsefulLinkType>("useful-links", locale, {
    depth: 0,
    limit: 100,
  });
}
