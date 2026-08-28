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

/** Hosts nothing outside the machine serving them can reach. */
function isLocalHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local")
  );
}

/**
 * A Vercel-assigned hostname.
 *
 * Two very different things wear this suffix. `<project>.vercel.app` is the
 * stable alias of the production deployment; `<project>-<hash>-<team>.vercel.app`
 * is a throwaway that exists for one preview build. The distinction cannot be
 * drawn from the string, so it is drawn from `VERCEL_ENV` in `resolveSiteOrigin`
 * instead.
 */
function isVercelHost(hostname: string): boolean {
  return hostname.trim().toLowerCase().endsWith(".vercel.app");
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
  const configuredHost = configured ? new URL(configured).hostname : null;

  /*
   * A production deploy publishes whatever it is explicitly configured to,
   * `*.vercel.app` included.
   *
   * That last part is the whole point of this branch. `PRODUCTION_ORIGIN` is
   * only the right answer once the domain it names actually resolves — before
   * then, forcing it makes the deploy emit canonicals, `og:url` and `og:image`
   * URLs pointing at a host that does not exist, and every share preview comes
   * up blank because the scraper cannot fetch the picture. Setting
   * `NEXT_PUBLIC_SITE_URL` to the deployment's own address is how a site says
   * "this is where I actually live for now"; that is a deliberate act, not the
   * misconfiguration the rule below guards against.
   *
   * A localhost value here still is a misconfiguration, and is ignored.
   */
  if (process.env.VERCEL_ENV === "production") {
    if (configured && !isLocalHost(configuredHost!)) return configured;
    return PRODUCTION_ORIGIN;
  }

  /*
   * Preview deploys point their canonicals at production instead of at
   * themselves, so they never compete with the real site for the same content
   * — their hostname changes with every build, and `next.config.ts` sends them
   * `X-Robots-Tag: noindex` besides.
   */
  if (process.env.VERCEL_ENV) {
    if (configured && !isLocalHost(configuredHost!) && !isVercelHost(configuredHost!)) {
      return configured;
    }
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
