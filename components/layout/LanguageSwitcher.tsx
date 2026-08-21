"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FLAGS } from "@/components/layout/flags";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { LOCALE_META, LOCALES } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/context";
import { swapLocale } from "@/lib/i18n/routes";

const BUBBLE = "h-9 w-9 sm:h-10 sm:w-10";
/** Vertical spacing between stacked bubbles, in px — matches `BUBBLE` + a gap. */
const STEP = 46;

/**
 * Flags only, no text — a trigger bubble showing the active language, which
 * on click blooms into a short column of the other three below it. Collapsed,
 * only the trigger shows; the others sit scaled to nothing directly behind it
 * and grow into place on open, the same "fluid menu" motion as the mobile
 * navigation toggle.
 *
 * Every bubble is a real `<a href>` to the equivalent page in that language
 * (via `swapLocale`) — a plain anchor, not a client-router push, so the
 * language actually changes on click with no JavaScript required to work at
 * all; the bloom-open animation is a progressive enhancement on top.
 */
export function LanguageSwitcher({
  dict,
  solid,
}: {
  dict: Dictionary;
  solid: boolean;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const others = LOCALES.filter((code) => code !== locale);
  const CurrentFlag = FLAGS[locale];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="language-switcher-menu"
        aria-label={dict.languageSwitcher.label}
        className={`press relative z-20 flex ${BUBBLE} shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full shadow-sm ring-2 transition-shadow duration-hover ${
          open
            ? "ring-brass-500"
            : solid
              ? "ring-stone-200"
              : "ring-stone-50/50"
        }`}
      >
        <CurrentFlag />
      </button>

      <div
        id="language-switcher-menu"
        role="menu"
        aria-label={dict.languageSwitcher.label}
        aria-hidden={!open}
        className="absolute top-0 left-1/2"
      >
        {others.map((target, index) => {
          const Flag = FLAGS[target];
          const y = (index + 1) * STEP;

          return (
            <a
              key={target}
              role="menuitem"
              href={swapLocale(pathname, target)}
              aria-label={LOCALE_META[target].nativeName}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              className={`press absolute top-0 left-0 flex ${BUBBLE} items-center justify-center overflow-hidden rounded-full bg-stone-50 shadow-md ring-1 ring-stone-200 will-change-transform ${
                open ? "" : "pointer-events-none"
              }`}
              style={{
                transform: open
                  ? `translate(-50%, ${y}px) scale(1)`
                  : "translate(-50%, 0px) scale(0.4)",
                opacity: open ? 1 : 0,
                zIndex: others.length - index,
                transition: `transform var(--duration-hover) var(--ease-parish), opacity var(--duration-hover) var(--ease-parish)`,
                transitionDelay: open ? `${index * 45}ms` : "0ms",
              }}
            >
              <Flag />
            </a>
          );
        })}
      </div>
    </div>
  );
}
