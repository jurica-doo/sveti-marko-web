"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import { SmartLink } from "@/components/ui/SmartLink";
import { bindTimeRanges } from "@/lib/format";
import type { LinkItem, ScheduleRow } from "@/lib/types";

type NavItem = { label: string; href: string };

/** Matches the header's own `h-18`, so the sheet starts under the bar. */
const BAR_HEIGHT = "4.5rem";

/**
 * Full-screen navigation sheet.
 *
 * It is always mounted and switched with opacity and `pointer-events` rather
 * than being added and removed. That is what lets it fade out on the way back:
 * a panel that unmounts the instant it closes has nothing left to animate, so
 * the exit is always a disappearance no matter what transition is declared on
 * it.
 *
 * The bar itself stays put and stays on top — the sheet fills everything under
 * it, and the same toggle in the bar closes it.
 */
export function MobileMenu({
  open,
  onClose,
  items,
  cta,
  masses = [],
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  cta?: LinkItem | null;
  masses?: ScheduleRow[];
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    /*
     * Back to the top on every open. The sheet is never unmounted — that is
     * what lets it fade out — so its scroll position survives being closed, and
     * without this a menu left scrolled down reopens partway through the list
     * with the first links above the fold.
     *
     * `behavior: "instant"` because `scroll-behavior: smooth` is set globally
     * and would otherwise animate this, which is visible as the sheet fades in.
     */
    scroller.current?.scrollTo({ top: 0, behavior: "instant" });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    /*
     * Hiding the page's own scrollbar reclaims its width, and everything under
     * it jumps sideways by that much — visibly, on the frame the menu opens.
     * Replacing it with equivalent padding keeps the layout still. On touch
     * devices the scrollbar is an overlay with no width, so this measures zero
     * and nothing is added.
     */
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  /*
   * Close the menu when the viewport grows past the point this sheet exists at.
   *
   * The sheet and its toggle are both `lg:hidden`, so widening the window past
   * `lg` hides them — but only visually. `open` stays true, which means the
   * effect above never cleans up and `<body>` keeps `overflow: hidden`, while
   * the button that would clear it is now display:none. The page loses its
   * scroll with nothing left to unlock it short of a reload.
   *
   * 64rem is Tailwind's `lg`: it has to match the `lg:hidden` below.
   */
  useEffect(() => {
    if (!open) return;

    const isDesktop = window.matchMedia("(min-width: 64rem)");
    if (isDesktop.matches) {
      onClose();
      return;
    }

    const onBreakpointChange = (event: MediaQueryListEvent) => {
      if (event.matches) onClose();
    };

    isDesktop.addEventListener("change", onBreakpointChange);
    return () => isDesktop.removeEventListener("change", onBreakpointChange);
  }, [open, onClose]);

  /** Rows arrive in sequence, the last one after the list it follows. */
  const revealDelay = (index: number): CSSProperties =>
    ({
      "--menu-delay": open ? `${120 + index * 75}ms` : "0ms",
    }) as CSSProperties;

  return (
    <div
      id="mobile-menu"
      aria-hidden={!open}
      className={`menu-sheet fixed inset-0 z-40 bg-stone-50 lg:hidden ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* The brass rule that heads the footer and the schedule band. */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brass-500/60 to-transparent" />

      <div className="flex h-full flex-col">
        {/* Clears the bar, which sits above this and stays visible. */}
        <div className="shrink-0" style={{ height: BAR_HEIGHT }} />

        {/*
          `overscroll-contain` stops a flick past the end of this list from
          chaining to the page behind it, which on iOS otherwise scrolls the
          body under the open sheet and leaves it somewhere else on close.
        */}
        <div
          ref={scroller}
          className="scroll-slim flex-1 overflow-y-auto overscroll-contain"
        >
          <nav aria-label="Glavni izbornik" className="shell pt-2 pb-10">
            {items.map((item, index) => (
              <SmartLink
                key={`${item.href}-${index}`}
                href={item.href}
                onClick={onClose}
                tabIndex={open ? undefined : -1}
                style={revealDelay(index)}
                className={`menu-reveal group flex items-baseline border-b border-stone-200 py-5 ${
                  open
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-3 opacity-0"
                }`}
              >
                <span className="font-display text-[1.65rem] leading-none text-ink-900 transition-colors group-hover:text-brass-600 sm:text-[2rem]">
                  {item.label}
                </span>
              </SmartLink>
            ))}

            {cta?.label && cta.href ? (
              <div
                style={revealDelay(items.length)}
                className={`menu-reveal pt-7 ${
                  open
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-3 opacity-0"
                }`}
              >
                <SmartLink
                  href={cta.href}
                  onClick={onClose}
                  tabIndex={open ? undefined : -1}
                  className="press flex items-center justify-center bg-sea-800 px-6 py-4 text-[0.78rem] font-semibold tracking-[0.16em] text-stone-50 uppercase hover:bg-sea-700"
                >
                  {cta.label}
                </SmartLink>
              </div>
            ) : null}

            {/*
              A glance at the times, so the commonest question the site is asked
              is answered without leaving the menu. The button above still goes
              to the full schedule for everything else — confessions, devotions,
              office hours.
            */}
            {masses.length ? (
              <div
                style={revealDelay(items.length + 1)}
                className={`menu-reveal pt-9 ${
                  open
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-3 opacity-0"
                }`}
              >
                <p className="text-[0.6rem] tracking-[0.3em] text-ink-400 uppercase">
                  Raspored misa
                </p>

                {/*
                  Day above, times below, rather than the two on one line. At
                  this width "Nedjeljom i blagdanom" and "9:00, 11:00 i 20:00"
                  are each about 150px, so side by side they wrap into a ragged
                  two-column block. Stacked, each reads in one go.
                */}
                <dl className="mt-5 space-y-4">
                  {masses.map((row, index) => (
                    <div key={row.id ?? `${row.day}-${index}`}>
                      <dt className="text-[0.85rem] text-ink-400">{row.day}</dt>
                      <dd className="mt-0.5 font-display text-[1.15rem] text-ink-900">
                        {bindTimeRanges(row.times)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </nav>
        </div>
      </div>
    </div>
  );
}
