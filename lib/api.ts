import {
  AboutPageType,
  ContactPageType,
  HomePageType,
  MediaImageType,
  MediaVideoType,
  NewsPageType,
  NewsType,
  PaginatedDocs,
  ScheduleType,
  SettingsType,
  UsefulLinkType,
} from "./types";

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3001";

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
  });

  if (!res.ok) {
    console.error(`${label} failed:`, res.status, res.statusText);
    throw new Error(`Failed to fetch ${label}`);
  }

  return (await res.json()) as T;
}

/** `GET /api/globals/<slug>` */
export async function getGlobal<T>(
  slug: string,
  { depth = 3, revalidate }: { depth?: number; revalidate?: number } = {},
): Promise<T> {
  return cmsFetch<T>(`/api/globals/${slug}?depth=${depth}`, {
    label: `global ${slug}`,
    revalidate,
  });
}

/** `GET /api/<slug>` — returns `docs`. */
export async function getCollection<T>(
  slug: string,
  {
    depth = 2,
    limit = 1000,
    revalidate,
  }: { depth?: number; limit?: number; revalidate?: number } = {},
): Promise<T[]> {
  const data = await cmsFetch<PaginatedDocs<T>>(
    `/api/${slug}?limit=${limit}&depth=${depth}`,
    { label: `collection ${slug}`, revalidate },
  );
  return data.docs ?? [];
}

/** `GET /api/<slug>?where[slug][equals]=<value>` — first match only. */
export async function getBySlug<T>(
  collection: string,
  slug: string,
  { depth = 3, revalidate }: { depth?: number; revalidate?: number } = {},
): Promise<T> {
  const data = await cmsFetch<PaginatedDocs<T>>(
    `/api/${collection}?where[slug][equals]=${encodeURIComponent(
      slug,
    )}&depth=${depth}&limit=1&draft=false`,
    { label: `${collection} by slug`, revalidate },
  );

  if (!data.docs?.length) {
    throw new Error(`${collection} not found: ${slug}`);
  }

  return data.docs[0];
}

/** `GET /api/<slug>/<id>` */
export async function getById<T>(
  collection: string,
  id: number | string,
  { depth = 3, revalidate }: { depth?: number; revalidate?: number } = {},
): Promise<T> {
  return cmsFetch<T>(`/api/${collection}/${id}?depth=${depth}`, {
    label: `${collection} by id`,
    revalidate,
  });
}

/** Cheap liveness probe — used by the root layout to render an offline state. */
export async function checkCmsHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${CMS_URL}/api/media-images?depth=0&limit=0`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getAllImages(): Promise<MediaImageType[]> {
  return getCollection<MediaImageType>("media-images", {
    depth: 0,
    limit: 1000,
  });
}

export async function getAllVideos(): Promise<MediaVideoType[]> {
  return getCollection<MediaVideoType>("media-videos", {
    depth: 0,
    limit: 1000,
  });
}

/* --------------------------------------------------------------- globals */

export async function getSettings(): Promise<SettingsType> {
  return getGlobal<SettingsType>("settings", { depth: 1 });
}

export async function getSchedule(): Promise<ScheduleType> {
  return getGlobal<ScheduleType>("schedule", { depth: 0 });
}

export async function getHomePage(): Promise<HomePageType> {
  return getGlobal<HomePageType>("home-page", { depth: 1 });
}

export async function getNewsPage(): Promise<NewsPageType> {
  return getGlobal<NewsPageType>("news-page", { depth: 1 });
}

export async function getAboutPage(): Promise<AboutPageType> {
  return getGlobal<AboutPageType>("about-page", { depth: 1 });
}

export async function getContactPage(): Promise<ContactPageType> {
  return getGlobal<ContactPageType>("contact-page", { depth: 1 });
}

/* ----------------------------------------------------------- collections */

/**
 * Published news, newest first. `featured` is sorted ahead of the rest so the
 * home page teaser can reuse the same ordering as the archive.
 */
export async function getNews({
  limit = 100,
  featuredFirst = false,
}: { limit?: number; featuredFirst?: boolean } = {}): Promise<NewsType[]> {
  const sort = featuredFirst ? "-featured,-publishedAt" : "-publishedAt";
  const data = await cmsFetch<PaginatedDocs<NewsType>>(
    `/api/news?limit=${limit}&depth=2&sort=${encodeURIComponent(sort)}&where[_status][equals]=published`,
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
export function newsPagePath({
  page = 1,
  limit = 9,
}: { page?: number; limit?: number } = {}): string {
  return `${CMS_URL}/api/news?limit=${limit}&page=${page}&depth=2&sort=-publishedAt&where[_status][equals]=published`;
}

/** One page of published news, newest first, with the paging flags. */
export async function getNewsPaginated({
  page = 1,
  limit = 9,
}: { page?: number; limit?: number } = {}): Promise<PaginatedDocs<NewsType>> {
  return cmsFetch<PaginatedDocs<NewsType>>(
    newsPagePath({ page, limit }).replace(CMS_URL, ""),
    { label: "news page" },
  );
}

export async function getNewsBySlug(slug: string): Promise<NewsType | null> {
  const data = await cmsFetch<PaginatedDocs<NewsType>>(
    `/api/news?where[slug][equals]=${encodeURIComponent(
      slug,
    )}&where[_status][equals]=published&depth=2&limit=1`,
    { label: "news by slug" },
  );
  return data.docs?.[0] ?? null;
}

export async function getUsefulLinks(): Promise<UsefulLinkType[]> {
  return getCollection<UsefulLinkType>("useful-links", {
    depth: 0,
    limit: 100,
  });
}
