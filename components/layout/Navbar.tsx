"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { MenuToggleIcon } from "@/components/ui/MenuToggleIcon";
import { SmartLink } from "@/components/ui/SmartLink";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { stripLocale } from "@/lib/i18n/routes";
import { internalHref, ROUTES } from "@/lib/routes";
import type { ScheduleType, SettingsType } from "@/lib/types";

export function Navbar({
  settings,
  schedule,
  dict,
}: {
  settings: SettingsType;
  schedule?: ScheduleType | null;
  dict: Dictionary;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const items = (settings.navigation ?? [])
    .filter((item): item is { label: string; href: string } =>
      Boolean(item?.label && item?.href),
    )
    .map((item) => ({ label: item.label, href: internalHref(item.href) }));

  const fallbackNav = [
    { label: dict.nav.fallback.home, href: ROUTES.home },
    { label: dict.nav.fallback.news, href: ROUTES.news },
    { label: dict.nav.fallback.about, href: ROUTES.about },
    { label: dict.nav.fallback.contact, href: ROUTES.contact },
  ];

  const navItems = items.length ? items : fallbackNav;

  /*
   * Compared without the locale prefix. `usePathname()` reports the URL as
   * served — `/it/vijesti/` — while `ROUTES` and the CMS's own nav hrefs are
   * bare (`/vijesti/`), because `SmartLink` is what adds the prefix, and only
   * at render time. Matching the two directly would therefore fail on every
   * locale but hr, leaving the home page without its transparent header and
   * no nav item ever marked current.
   */
  const localePath = stripLocale(pathname);

  // The home hero sits under the header, so the bar starts transparent there.
  const overlay = localePath === ROUTES.home;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrolledOrInner = scrolled || !overlay;

  /*
   * The bar goes opaque while the menu is open as well. The sheet behind it is
   * stone, and on the home hero the bar is transparent with white type — which
   * would be invisible against it. Going solid also means bar and sheet share
   * one surface rather than looking like two stacked panels.
   */
  const solid = scrolledOrInner || open;

  const isActive = (href: string) =>
    href === ROUTES.home ? localePath === href : localePath.startsWith(href);

  // The bottom hairline is a shadow rather than a border on purpose. The home
  // hero cancels the header with `-mt-18 lg:-mt-20` to sit underneath it; a
  // border would add a 1px row that the pull-up does not cover, and the page
  // background would show through as a pale line above the hero.
  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-move ${
          solid
            ? "bg-stone-50/95 shadow-[0_1px_0_0_var(--color-stone-200)] backdrop-blur-md"
            : "bg-transparent shadow-none"
        }`}
      >
        <div className="shell flex h-18 items-center justify-between gap-6 lg:h-20">
          {/*
          Closes the menu on its way home: the wordmark stays in the bar while
          the panel is open, so it is the one link that the menu's own items do
          not already close.
        */}
          <SmartLink
            href={ROUTES.home}
            onClick={() => setOpen(false)}
            className="group flex items-center gap-3 leading-none sm:gap-4"
          >
            {/*
            `.brand-mark` fills the church outline with `currentColor`, so
            setting the same colour as the wordmark keeps the two in step
            through the header's transparent-to-solid change instead of
            needing a second image.
          */}
            <span
              aria-hidden="true"
              className={`brand-mark indicator h-8 w-10 shrink-0 transition-colors group-hover:scale-110 sm:h-9 sm:w-11 ${
                solid ? "text-ink-900" : "text-stone-50"
              }`}
            />

            {/* The two labels keep their own baseline; the mark has none. */}
            <span className="flex items-baseline gap-3">
              <span
                className={`font-display text-[1.35rem] transition-colors sm:text-[1.5rem] ${
                  solid ? "text-ink-900" : "text-stone-50"
                }`}
              >
                {settings.shortName || settings.siteName}
              </span>
              <span
                className={`hidden text-[0.62rem] font-semibold uppercase tracking-[0.2em] transition-colors sm:inline ${
                  solid ? "text-brass-600" : "text-brass-300"
                }`}
              >
                Neslanovac
              </span>
            </span>
          </SmartLink>

          <nav className="hidden lg:block" aria-label={dict.nav.ariaLabel}>
            <ul className="flex items-center gap-9">
              {navItems.map((item, index) => {
                const active = isActive(item.href);
                return (
                  <li key={`${item.href}-${index}`}>
                    <SmartLink
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`nav-underline py-2 text-[0.78rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                        solid
                          ? active
                            ? "text-brass-600"
                            : "text-ink-700 hover:text-brass-600"
                          : active
                            ? "text-brass-300"
                            : "text-stone-50/90 hover:text-brass-300"
                      }`}
                    >
                      {item.label}
                    </SmartLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {settings.headerCta?.label && settings.headerCta.href ? (
              <SmartLink
                href={settings.headerCta.href}
                className={`hover-lift hidden px-5 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] lg:inline-flex ${
                  solid
                    ? "bg-sea-800 text-stone-50 hover:bg-sea-700"
                    : "border border-stone-50/50 text-stone-50 hover:border-brass-300 hover:text-brass-300"
                }`}
              >
                {settings.headerCta.label}
              </SmartLink>
            ) : null}

            {/*
              Desktop only. At `lg` and up the bar has room for it beside the
              CTA; below that the bar is just the wordmark and the toggle, and
              `MobileMenu` carries the same choice inside the sheet instead —
              laid out flat, so it is one tap rather than two.
            */}
            <div className="hidden lg:block">
              <LanguageSwitcher dict={dict} solid={solid} />
            </div>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? dict.nav.closeMenu : dict.nav.openMenu}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className={`-mr-2 flex h-10 w-10 items-center justify-center transition-colors lg:hidden ${
                solid ? "text-ink-900" : "text-stone-50"
              }`}
            >
              <MenuToggleIcon open={open} className="h-9 w-9" />
            </button>
          </div>
        </div>
      </header>

      {/*
        A sibling of the header, not a child of it. The header's `z-50` opens a
        stacking context, so a sheet nested inside it would be layered against
        the bar rather than against the page — and at `z-40` it would have
        covered the very bar it belongs to. Out here the two are ordered against
        each other: sheet at 40, header at 50, so the wordmark, the mark and the
        toggle all stay above it and keep working while the menu is open.

        `masses` are the same `highlight` rows the hero band shows, read from the
        same `schedule` global — so the office edits mass times in one place and
        every surface that quotes them follows.
      */}
      <MobileMenu
        open={open}
        onClose={() => setOpen(false)}
        items={navItems}
        cta={settings.headerCta}
        masses={(schedule?.masses ?? []).filter(
          (row) => row.highlight !== false,
        )}
        dict={dict}
      />
    </>
  );
}
