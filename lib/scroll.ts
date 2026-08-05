import type { MouseEvent } from "react";

import { easeParish, SCROLL } from "@/lib/motion";

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
export function animateScrollTo(top: number) {
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
 * Starts a scroll two frames from now.
 *
 * A link in the mobile menu closes the sheet on the same click, and that panel
 * locks `overflow: hidden` on `<body>` until its effect cleanup runs. Starting
 * synchronously would burn the opening frames against the lock and the scroll
 * would jump in halfway.
 *
 * Pass a function when the destination has to be measured from the layout: the
 * unlock moves everything below the fold, so a position read at click time is
 * stale by the time the scroll begins.
 */
export function scrollToDeferred(top: number | (() => number)) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animateScrollTo(typeof top === "function" ? top() : top);
    });
  });
}

/**
 * True for the clicks the browser owns: new tab, new window, middle button.
 * Handling those ourselves would swallow a navigation the viewer asked for.
 */
export function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}
