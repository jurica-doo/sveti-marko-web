"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { Dictionary } from "@/lib/i18n/dictionaries";
import { LOCALE_META, LOCALES } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/context";
import { swapLocale } from "@/lib/i18n/routes";

const BUBBLE = "h-9 w-9 sm:h-10 sm:w-10";
/** Vertical spacing between stacked bubbles, in px — matches `BUBBLE` + a gap. */
const STEP = 46;

/** The two-letter codes are set like the nav's own small caps. */
const LABEL = "text-[0.68rem] font-semibold uppercase tracking-[0.06em] sm:text-[0.72rem]";

/**
 * A trigger bubble showing the active language's code, which on click blooms
 * into a short column of the other three below it. Collapsed, only the
 * trigger shows; the others sit scaled to nothing directly behind it and
 * grow into place on open, the same "fluid menu" motion as the mobile
 * navigation toggle.
 *
 * Every bubble is a real `<a href>` to the equivalent page in that language
 * (via `swapLocale`) — a plain anchor, not a client-router push, so the
 * language actually changes on click with no JavaScript required to work at
 * all; the bloom-open animation is a progressive enhancement on top.
 *
 * The trigger tracks the header's own transparent/solid state, since over the
 * home hero it sits on a photograph and everywhere else on stone.
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
        className={`press relative z-20 flex ${BUBBLE} ${LABEL} shrink-0 cursor-pointer items-center justify-center rounded-full ring-1 transition-colors duration-hover ${
          open
            ? "bg-sea-800 text-stone-50 ring-brass-500"
            : solid
              ? "bg-stone-100 text-ink-900 ring-stone-200 hover:text-brass-600 hover:ring-brass-500"
              : "bg-stone-50/10 text-stone-50 ring-stone-50/50 backdrop-blur-sm hover:text-brass-300 hover:ring-brass-300"
        }`}
      >
        {LOCALE_META[locale].shortLabel}
      </button>

      <div
        id="language-switcher-menu"
        role="menu"
        aria-label={dict.languageSwitcher.label}
        aria-hidden={!open}
        className="absolute top-0 left-1/2"
      >
        {others.map((target, index) => {
          const y = (index + 1) * STEP;

          return (
            <a
              key={target}
              role="menuitem"
              href={swapLocale(pathname, target)}
              aria-label={LOCALE_META[target].nativeName}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              className={`press absolute top-0 left-0 flex ${BUBBLE} ${LABEL} items-center justify-center rounded-full bg-stone-50 text-ink-700 shadow-md ring-1 ring-stone-200 transition-colors will-change-transform hover:text-brass-600 hover:ring-brass-500 ${
                open ? "" : "pointer-events-none"
              }`}
              style={{
                transform: open
                  ? `translate(-50%, ${y}px) scale(1)`
                  : "translate(-50%, 0px) scale(0.4)",
                opacity: open ? 1 : 0,
                zIndex: others.length - index,
                transition: `transform var(--duration-hover) var(--ease-parish), opacity var(--duration-hover) var(--ease-parish), color var(--duration-hover) var(--ease-parish)`,
                transitionDelay: open ? `${index * 45}ms` : "0ms",
              }}
            >
              {LOCALE_META[target].shortLabel}
            </a>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The same choice, laid out flat — for the mobile menu sheet.
 *
 * Not the bloom-open version above: that trades a second tap for space it
 * does not need to save here, and a dropdown that opens *inside* an already
 * open panel reads as a menu within a menu. The sheet has room to show all
 * four at once, so every language is one tap away and the current one is
 * visibly marked rather than having to be inferred from the trigger.
 *
 * `tabbable` because the sheet is never unmounted — it is switched with
 * opacity so it can animate out — and links inside a hidden panel must stay
 * out of the tab order.
 */
export function LanguageSwitcherInline({
  dict,
  tabbable,
  onNavigate,
}: {
  dict: Dictionary;
  tabbable: boolean;
  onNavigate?: () => void;
}) {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={dict.languageSwitcher.label}>
      <p className="text-[0.6rem] tracking-[0.3em] text-ink-400 uppercase">
        {dict.languageSwitcher.label}
      </p>

      <ul className="mt-5 flex flex-wrap items-center gap-3">
        {LOCALES.map((code) => {
          const active = code === locale;

          return (
            <li key={code}>
              <a
                href={swapLocale(pathname, code)}
                aria-label={LOCALE_META[code].nativeName}
                aria-current={active ? "true" : undefined}
                tabIndex={tabbable ? undefined : -1}
                onClick={onNavigate}
                className={`press flex ${BUBBLE} ${LABEL} items-center justify-center rounded-full ring-1 transition-colors ${
                  active
                    ? "bg-sea-800 text-stone-50 ring-sea-800"
                    : "text-ink-700 ring-stone-200 hover:text-brass-600 hover:ring-brass-500"
                }`}
              >
                {LOCALE_META[code].shortLabel}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
