"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { animateScrollTo, consumeScrollGlide } from "@/lib/scroll";

/**
 * Glides a link navigation up to the top of the new page.
 *
 * `SamePageLink` hands the router `scroll={false}`, so the incoming page is
 * painted at whatever offset the outgoing one was left at. This picks it up
 * from there and animates to the top on the site's curve — the same motion
 * clicking the current page's own link already makes.
 *
 * See `requestScrollGlide` in `lib/scroll.ts` for why the router cannot be left
 * to do this itself.
 *
 * A passive effect, deliberately: the new page is *meant* to be seen at the old
 * offset for a frame before it starts moving, which is the whole point of the
 * animation. `animateScrollTo` reads the position on its first frame, so it
 * picks up wherever the browser settled — including the case where the incoming
 * page is shorter and the offset was clamped.
 *
 * Back and forward never set the flag, so the position the browser restores for
 * them is left alone.
 */
export function ScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    if (!consumeScrollGlide()) return;
    animateScrollTo(0);
  }, [pathname]);

  return null;
}
