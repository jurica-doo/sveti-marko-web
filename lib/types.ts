/**
 * Mirrors of the Payload generated types (`cms/src/payload-types.ts`).
 * Add a type here for every collection / global the web app consumes.
 */

/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "media-images".
 */
export interface MediaImageType {
  id: number;
  alt: string;
  caption?: string;
  prefix?: string;
  updatedAt: string;
  createdAt: string;
  url?: string;
  thumbnailURL?: string;
  filename?: string;
  mimeType?: string;
  filesize?: number;
  width?: number;
  height?: number;
  focalX?: number;
  focalY?: number;
}

/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "media-videos".
 */
export interface MediaVideoType {
  id: number;
  title: string;
  caption?: string;
  prefix?: string;
  updatedAt: string;
  createdAt: string;
  url?: string;
  thumbnailURL?: string;
  filename?: string;
  mimeType?: string;
  filesize?: number;
  width?: number;
  height?: number;
  focalX?: number;
  focalY?: number;
}

/** Shape of a paginated Payload collection response. */
export interface PaginatedDocs<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

/** Lexical rich text document as returned by the REST API. */
export type RichTextNode = {
  type?: string;
  tag?: string;
  text?: string;
  format?: number | string;
  listType?: string;
  url?: string;
  fields?: { url?: string; newTab?: boolean; linkType?: string };
  children?: RichTextNode[];
  [key: string]: unknown;
};

export type RichText = { root: RichTextNode } | null;

export type LinkItem = { label?: string | null; href?: string | null };

/* ---------------------------------------------------------------- globals */

export interface SettingsType {
  siteName: string;
  shortName?: string | null;
  tagline?: string | null;
  logo?: MediaImageType | null;
  diocese?: string | null;
  announcement?: {
    enabled?: boolean | null;
    text?: string | null;
    href?: string | null;
  } | null;
  navigation?: ({ label: string; href: string; id?: string } | null)[] | null;
  headerCta?: LinkItem | null;
  footerIntro?: string | null;
  footerColumns?:
    | {
        title: string;
        links?: { label: string; href: string; id?: string }[] | null;
        id?: string;
      }[]
    | null;
  copyright?: string | null;
  social?:
    | {
        platform: "facebook" | "instagram" | "youtube" | "whatsapp";
        url: string;
        id?: string;
      }[]
    | null;
}

/** Adoration, rosary and the first-Friday devotions. */
export type DevotionRow = {
  title: string;
  day?: string | null;
  times?: string | null;
  note?: string | null;
  id?: string;
};

export type ScheduleRow = {
  day: string;
  times: string;
  note?: string | null;
  highlight?: boolean | null;
  id?: string;
};

/**
 * A temporary block for a holiday or other one-off occasion — "Božićna
 * ispovijed", "Uskrsne mise" — with its own list of dated entries. Separate
 * from `masses`/`confessions` because those are the evergreen weekly
 * schedule; this is whatever the office is announcing on top of it.
 */
export type SpecialScheduleRow = {
  day: string;
  times: string;
  note?: string | null;
  id?: string;
};

export type SpecialScheduleBlock = {
  title: string;
  active?: boolean | null;
  entries?: SpecialScheduleRow[] | null;
  id?: string;
};

export interface ScheduleType {
  masses?: ScheduleRow[] | null;
  massesNote?: string | null;
  confessions?: ScheduleRow[] | null;
  confessionsNote?: string | null;
  devotions?: DevotionRow[] | null;
  specialSchedule?: SpecialScheduleBlock[] | null;
  officeHours?:
    | { day: string; hours: string; note?: string | null; id?: string }[]
    | null;
  officeNotes?: { title: string; text: string; id?: string }[] | null;
}

export interface HomePageType {
  hero: {
    image?: MediaImageType | null;
    eyebrow?: string | null;
    title: string;
    subtitle?: string | null;
    primaryCta?: LinkItem | null;
    secondaryCta?: LinkItem | null;
    showSchedule?: boolean | null;
    massesTitle?: string | null;
    confessionsTitle?: string | null;
  };
  officeSection?: {
    eyebrow?: string | null;
    title?: string | null;
    intro?: string | null;
    cards?:
      | { title: string; text: string; href?: string | null; id?: string }[]
      | null;
  } | null;
  newsSection?: {
    eyebrow?: string | null;
    title?: string | null;
    intro?: string | null;
    count?: number | null;
    ctaLabel?: string | null;
  } | null;
  quote?: {
    enabled?: boolean | null;
    text?: string | null;
    source?: string | null;
    image?: MediaImageType | null;
  } | null;
  linksSection?: {
    eyebrow?: string | null;
    title?: string | null;
    intro?: string | null;
  } | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface NewsPageType {
  eyebrow?: string | null;
  title: string;
  intro?: string | null;
  heroImage?: MediaImageType | null;
  perPage?: number | null;
  emptyMessage?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface AboutPageType {
  eyebrow?: string | null;
  title: string;
  intro?: string | null;
  heroImage?: MediaImageType | null;
  parish?: {
    title?: string | null;
    body?: RichText;
    image?: MediaImageType | null;
  } | null;
  church?: {
    title?: string | null;
    body?: RichText;
    image?: MediaImageType | null;
  } | null;
  patron?: {
    title?: string | null;
    feastDay?: string | null;
    body?: RichText;
    image?: MediaImageType | null;
  } | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface ContactPageType {
  eyebrow?: string | null;
  title: string;
  intro?: string | null;
  heroImage?: MediaImageType | null;
  contact: {
    parishOfficeName?: string | null;
    street: string;
    postalCode: string;
    city: string;
    country?: string | null;
    phone?: string | null;
    mobile?: string | null;
    email?: string | null;
    iban?: string | null;
    oib?: string | null;
  };
  map?: {
    embedUrl?: string | null;
    directionsUrl?: string | null;
  } | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

/* ------------------------------------------------------------ collections */

export interface NewsCategoryType {
  id: number;
  title: string;
  slug?: string | null;
  description?: string | null;
}

export interface NewsType {
  id: number;
  title: string;
  slug?: string | null;
  publishedAt: string;
  category?: NewsCategoryType | number | null;
  featured?: boolean | null;
  coverImage?: MediaImageType | null;
  excerpt: string;
  content?: RichText;
  gallery?: { image: MediaImageType; id?: string }[] | null;
  author?: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface UsefulLinkType {
  id: number;
  title: string;
  url: string;
  description?: string | null;
  group?: "crkva" | "duhovnost" | "zajednica" | null;
  featuredOnHome?: boolean | null;
  order?: number | null;
}
