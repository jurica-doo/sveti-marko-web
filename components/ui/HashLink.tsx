"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

import { easeParish, SCROLL } from "@/lib/motion";

type HashLinkProps = {
  /** Already normalised by `internalHref`, so it always carries a `#`. */
  href: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

/**
 * Scrolls to `top` one frame at a time.
 *
 * Every native route to a smooth scroll is closed here. `scroll-behavior:
 * smooth` is a CSS property the App Router does not opt into — it scrolls with
 * a bare `scrollIntoView()` — and passing `behavior: "smooth"` explicitly does
 * not help either, because Chromium drops scroll animations altogether once
 * the OS reports reduced motion, which Windows does whenever "Animation
 * effects" is off. The only thing the platform cannot refuse is a sequence of
 * ordinary instant scrolls, so that is what this is.
 *
 * `behavior: "instant"` on each step matters: without it a viewer who has
 * smooth scrolling working would have every frame of this animation animated
 * again by the browser, and the two would fight.
 */
function animateScrollTo(top: number) {
  const start = window.scrollY;
  const distance = top - start;
  if (Math.abs(distance) < 1) return;

  // Long jumps take longer, but only between the bounds — not proportionally
  // forever, or the bottom of a long page would be a journey.
  const duration =
    1000 *
    Math.min(
      SCROLL.max,
      Math.max(SCROLL.min, Math.abs(distance) * SCROLL.perPixel),
    );

  const startedAt = performance.now();
  let cancelled = false;

  // Any deliberate scroll of their own wins immediately.
  const cancel = () => {
    cancelled = true;
  };
  const options = { passive: true, once: true } as const;
  window.addEventListener("wheel", cancel, options);
  window.addEventListener("touchstart", cancel, options);
  window.addEventListener("keydown", cancel, { once: true });

  const cleanup = () => {
    window.removeEventListener("wheel", cancel);
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("keydown", cancel);
  };

  const step = (now: number) => {
    if (cancelled) {
      cleanup();
      return;
    }

    const progress = Math.min(1, (now - startedAt) / duration);
    window.scrollTo({
      top: start + distance * easeParish(progress),
      behavior: "instant",
    });

    if (progress < 1) requestAnimationFrame(step);
    else cleanup();
  };

  requestAnimationFrame(step);
}

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
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = document.getElementById(decodeURIComponent(hash));
    // Not on this page — let the router navigate there instead.
    if (!target) return;

    event.preventDefault();

    /*
     * Deferred by two frames because `onClick` above may have just closed the
     * mobile menu, and that panel locks `overflow: hidden` on <body> until its
     * effect cleanup runs. Starting synchronously would burn the opening
     * frames against the lock and the scroll would jump in halfway.
     */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
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

        animateScrollTo(Math.max(0, Math.min(documentTop, furthest)));
      });
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
