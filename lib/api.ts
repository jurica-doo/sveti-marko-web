import { MediaImageType, MediaVideoType, PaginatedDocs } from "./types";

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

// Content getters (globals + collections) go below, one exported function each,
// e.g. `export async function getHomePage(): Promise<Home> { ... }`.
