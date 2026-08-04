"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { MobileMenu } from "@/components/layout/MobileMenu";
import { SmartLink } from "@/components/ui/SmartLink";
import { internalHref, ROUTES } from "@/lib/routes";
import type { SettingsType } from "@/lib/types";

const FALLBACK_NAV = [
  { label: "Naslovnica", href: ROUTES.home },
  { label: "Vijesti", href: ROUTES.news },
  { label: "O nama", href: ROUTES.about },
  { label: "Kontakt", href: ROUTES.contact },
];

/**
 * The three rules of the menu button, closed and open. The outer two travel to
 * the middle and cross; the middle one has nowhere to go, so it fades and
 * collapses its width rather than sitting under the cross.
 */
const BAR_POSITIONS = [
  { closed: "-translate-y-1.5", open: "translate-y-0 rotate-45" },
  { closed: "opacity-100", open: "w-0 opacity-0" },
  { closed: "translate-y-1.5", open: "translate-y-0 -rotate-45" },
];

export function Navbar({ settings }: { settings: SettingsType }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const items = (settings.navigation ?? [])
    .filter((item): item is { label: string; href: string } => Boolean(item?.label && item?.href))
    .map((item) => ({ label: item.label, href: internalHref(item.href) }));

  const navItems = items.length ? items : FALLBACK_NAV;

  // The home hero sits under the header, so the bar starts transparent there.
  const overlay = pathname === ROUTES.home;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || !overlay;

  const isActive = (href: string) =>
    href === ROUTES.home ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/*
        The bottom hairline is a shadow rather than a border on purpose. The
        home hero cancels the header with `-mt-18 lg:-mt-20` to sit underneath
        it; a border would add a 1px row that the pull-up does not cover, and
        the page background would show through as a pale line above the hero.
      */}
      <header
        className={`sticky top-0 transition-all duration-move ${
          // Above the menu overlay (z-100) while it is open, so the one toggle
          // stays reachable instead of being buried under the scrim.
          open ? "z-101" : "z-50"
        } ${
          solid
            ? "bg-stone-50/95 shadow-[0_1px_0_0_var(--color-stone-200)] backdrop-blur-md"
            : "bg-transparent shadow-none"
        }`}
      >
        <div className="shell flex h-18 items-center justify-between gap-6 lg:h-20">
          {/*
            The wordmark stays above the open panel, so it is the one way to
            navigate that the menu's own links do not already close.
          */}
          <SmartLink
            href={ROUTES.home}
            onClick={() => setOpen(false)}
            className="group flex items-baseline gap-3 leading-none"
          >
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
          </SmartLink>

          <nav className="hidden lg:block" aria-label="Glavni izbornik">
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

          <div className="flex items-center gap-3">
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
              One control for both states. It used to be a hamburger here and a
              separate cross inside the panel, so opening the menu swapped one
              button for another in a different place — which is what made the
              whole thing feel abrupt. Now the three rules fold into the cross
              and unfold back, in place, on the shared motion clock.
            */}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? "Zatvori izbornik" : "Otvori izbornik"}
              aria-expanded={open}
              className={`press relative -mr-2 flex h-10 w-10 items-center justify-center lg:hidden ${
                // Open, the button sits over the panel, which is always light.
                open || solid ? "text-ink-900" : "text-stone-50"
              }`}
            >
              {BAR_POSITIONS.map((bar, index) => (
                <span
                  key={index}
                  aria-hidden="true"
                  className={`indicator absolute h-px w-[22px] origin-center bg-current ${
                    open ? bar.open : bar.closed
                  }`}
                />
              ))}
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        open={open}
        onClose={() => setOpen(false)}
        items={navItems}
        cta={settings.headerCta}
      />
    </>
  );
}
