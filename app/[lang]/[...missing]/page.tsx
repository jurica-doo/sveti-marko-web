import { notFound } from "next/navigation";

/**
 * Catches every URL no other route claims and turns it into a proper 404.
 *
 * Next only renders `not-found.js` for *unmatched* URLs when the file sits at
 * the app root, and this app has no root — the layout and `not-found.tsx` both
 * live under `[lang]`. Without this route a mistyped address such as
 * `/kontakt/j/` fell through to Next's bare black default page instead.
 *
 * Calling `notFound()` here instead hands the request to `[lang]/not-found.tsx`,
 * so a lost visitor gets the site's own page — header, footer, the right
 * language — and a real 404 status. Every real route is more specific than a
 * catch-all, so none of them are shadowed by it.
 */
export default function MissingPage() {
  notFound();
}
