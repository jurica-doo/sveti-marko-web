"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

import { isModifiedClick, scrollToDeferred } from "@/lib/scroll";

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

    const target = document.getElementById(decodeURIComponent(hash));
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
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
