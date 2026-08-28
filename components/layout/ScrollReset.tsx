"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

import { consumeScrollReset } from "@/lib/scroll";

/*
 * `useLayoutEffect` so the correction happens before the browser paints: the
 * router has already committed the new page at the old scroll offset by the
 * time this runs, and doing it in a passive effect would let that offset show
 * for a frame. React warns when `useLayoutEffect` is called during SSR, where
 * it would do nothing anyway, so the passive hook stands in on the server.
 */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Lands link navigations at the very top of the page.
 *
 * The App Router leaves the scroll position alone when the top of the incoming
 * segment is already on screen, which on every page but the home page means a
 * small scroll survives the navigation — see `requestScrollReset` in
 * `lib/scroll.ts` for why. `SamePageLink` flags the clicks that should reset,
 * and this consumes the flag once the new route has rendered.
 *
 * Back and forward never set the flag, so the browser's restored position is
 * left untouched.
 */
export function ScrollReset() {
  const pathname = usePathname();

  useIsomorphicLayoutEffect(() => {
    if (!consumeScrollReset()) return;

    /*
     * `instant` because `scroll-behavior: smooth` is set globally on `<html>`:
     * without it this correction would animate, arriving after the new page has
     * already been painted at the wrong offset — the opposite of the point.
     */
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
