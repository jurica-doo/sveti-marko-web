/**
 * The one origin every public URL the site emits is built from — canonicals,
 * hreflang alternates, sitemap entries, OG tags and JSON-LD `@id`s.
 *
 * It lives on its own, and everything else imports it, because the value had
 * been redeclared in six places with two different fallbacks (one of them
 * `http://localhost:3000`). Any of those drifting sends Google a canonical
 * pointing at a host that is not the site.
 */

/** The domain the site is actually served from. */
const PRODUCTION_ORIGIN = "https://sv-marko.hr";

/** Hosts that must never appear in a public URL on a production deploy. */
function isNonPublicHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    // Every preview deployment gets its own *.vercel.app hostname. Canonicals
    // pointing at one would have Google index the preview alongside — or
    // instead of — the real site.
    host.endsWith(".vercel.app")
  );
}

/** Trailing slash removed, so callers can always join with a leading-slash path. */
function normaliseOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function resolveSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
    ? normaliseOrigin(process.env.NEXT_PUBLIC_SITE_URL)
    : null;

  /*
   * On a real Vercel deploy the production domain is the only acceptable
   * answer, whatever the environment happens to say — a preview or localhost
   * value there is a misconfiguration, not an intention.
   *
   * Preview deploys deliberately fall into this branch too: they point their
   * canonicals at production so they never compete with it for the same
   * content, and `next.config.ts` sends them `X-Robots-Tag: noindex` besides.
   */
  if (process.env.VERCEL_ENV) {
    if (configured && !isNonPublicHost(new URL(configured).hostname)) return configured;
    return PRODUCTION_ORIGIN;
  }

  // Local dev and self-hosted builds honour whatever is configured, so a
  // `localhost` origin still works when running the site on your own machine.
  return configured ?? PRODUCTION_ORIGIN;
}

export const SITE_ORIGIN = resolveSiteOrigin();

/**
 * Whether this deployment should be indexed at all.
 *
 * Only a Vercel *production* deploy is; previews are not, so the same content
 * on a `*.vercel.app` host cannot be indexed as a duplicate of the live site.
 * Anything outside Vercel (local, self-hosted) is treated as indexable, since
 * there is nothing to distinguish it from the real thing.
 */
export const IS_INDEXABLE_DEPLOYMENT =
  !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";

/** Absolute URL on the canonical origin. `path` should start with `/`. */
export function toAbsoluteUrl(path: string): string {
  try {
    return new URL(path, SITE_ORIGIN).toString();
  } catch {
    return SITE_ORIGIN;
  }
}
