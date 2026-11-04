import "server-only";

/**
 * A fixed-window rate limiter kept in the memory of the running server.
 *
 * Honest about its reach: on Vercel every serverless instance has its own
 * memory, so this caps what one client can do against one warm instance — it
 * stops a single script hammering the endpoint in a burst, which is the abuse a
 * small contact form actually sees — but it is not a global limit across
 * instances. That one belongs at the platform edge (a Vercel Firewall rate-limit
 * rule on `/api/contact`), which this complements rather than replaces.
 *
 * Expired windows are swept on each call, so the map cannot grow without bound.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();

  for (const [entry, window] of windows) {
    if (window.resetAt <= now) windows.delete(entry);
  }

  const current = windows.get(key);
  if (!current) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;
  return {
    allowed: current.count <= limit,
    retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
  };
}

/**
 * The client's address as the hosting platform reports it.
 *
 * `x-real-ip` is set by Vercel's edge and cannot be supplied by the client; the
 * first `x-forwarded-for` entry is the fallback for other proxies. Neither is
 * used for anything but this limit, so a spoofed value elsewhere only ever
 * costs the spoofer their own budget.
 */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
