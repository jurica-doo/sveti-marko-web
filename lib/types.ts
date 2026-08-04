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
