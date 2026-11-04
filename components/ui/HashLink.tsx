"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

import { isModifiedClick, scrollToDeferred } from "@/lib/scroll";

/** Fired on `window` after a same-page fragment jump; `detail` is the fragment. */
export const HASH_JUMP_EVENT = "hashlink:jump";

type HashLinkProps = {
  /** Already normalised by `internalHref`, so it always carries a `#`. */
  href: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

/**
 * A fragment link that actually glides.
 *
 * Cross-page links fall through untouched: there is nothing to scroll to yet,
 * so the router navigates and lands already positioned.
 */
export function HashLink({ href, children, onClick, ...rest }: HashLinkProps) {
  const hash = href.slice(href.indexOf("#") + 1);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;

    // Leave new-tab, new-window and middle clicks to the browser.
    if (isModifiedClick(event)) return;

    const id = decodeURIComponent(hash);
    const element = document.getElementById(id);
    /*
     * An anchor can belong to a layout that is hidden at this width — the
     * Raspored page's phone sections carry the ids, and on desktop the tile
     * board stands in for them. A hidden element has no box to scroll to, so
     * fall back to whatever visible element declares the id in
     * `data-anchors`.
     */
    const target =
      element && element.getClientRects().length === 0
        ? (Array.from(document.querySelectorAll<HTMLElement>("[data-anchors]")).find(
            (candidate) =>
              candidate.dataset.anchors?.split(" ").includes(id) &&
              candidate.getClientRects().length > 0,
          ) ?? element)
        : element;
    // Not on this page — let the router navigate there instead.
    if (!target) return;

    event.preventDefault();

    /*
     * Measured inside the deferral rather than now, because the two frames it
     * waits on are the ones the mobile menu uses to unlock `<body>` — and the
     * target's position moves when it does.
     */
    scrollToDeferred(() => {
      /*
       * Read the target's own `scroll-margin-top` rather than hard-coding the
       * header height, so the two cannot drift apart.
       */
      const margin =
        Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;

      const documentTop =
        target.getBoundingClientRect().top + window.scrollY - margin;

      const furthest =
        document.documentElement.scrollHeight - window.innerHeight;

      return Math.max(0, Math.min(documentTop, furthest));
    });

    // Keep the address bar in step without handing the scroll back to the
    // router. The existing state object is preserved so Back still works.
    window.history.replaceState(window.history.state, "", href);

    // `replaceState` fires no `hashchange`, so announce the jump for anything
    // on the page that reacts to its own fragment — the Raspored page opens
    // the section it was sent to (see `ScheduleAccordion`).
    window.dispatchEvent(new CustomEvent(HASH_JUMP_EVENT, { detail: hash }));
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
