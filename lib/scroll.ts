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

/*
 * A one-shot request to land the next navigation at the very top.
 *
 * WHY THIS IS NEEDED
 *
 * The App Router does not simply scroll to the top when the route changes. It
 * finds the DOM node of the segment that changed and, in `layout-router`, does:
 *
 *     if (getScrollTargetState(domNode, viewportHeight, ...) === 1) return
 *     htmlElement.scrollTop = 0
 *
 * ...where state 1 means "the node's top edge is between `scroll-padding-top`
 * and the bottom of the viewport". In other words, if the top of the new page's
 * content is already on screen, the router considers the job done and does not
 * scroll at all.
 *
 * On this site the changed segment is `{children}` inside `<main>`, which sits
 * below the sticky header — so at rest its top edge is ~80px down. Scroll less
 * than the header's height and that edge is still on screen, the router returns
 * early, and the new page renders at whatever offset the old one was left at.
 * The home page escapes this only because its hero cancels the header with
 * `-mt-18 lg:-mt-20`, putting the segment's top edge at 0, where any scroll at
 * all pushes it out of view and the router's own reset kicks in.
 *
 * WHY A FLAG RATHER THAN RESETTING ON EVERY PATHNAME CHANGE
 *
 * Back and forward are pathname changes too, and there the browser restores the
 * position the viewer left — which is the correct behaviour and must not be
 * overridden. Only a click on a link should force the top, so only `SamePageLink`
 * sets this, and `ScrollReset` clears it as it consumes it.
 *
 * Cross-page fragment links (`/o-nama/#raspored`) go through `HashLink`, never
 * set the flag, and are left to the router's own hash handling.
 */
let resetPending = false;

/** Called from a link click that is about to navigate to a different page. */
export function requestScrollReset() {
  resetPending = true;
}

/** Reads and clears the request. True only once per `requestScrollReset()`. */
export function consumeScrollReset(): boolean {
  const pending = resetPending;
  resetPending = false;
  return pending;
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
