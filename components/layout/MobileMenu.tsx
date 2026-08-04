"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { useIsMounted } from "@/hooks/useIsMounted";
import { SmartLink } from "@/components/ui/SmartLink";
import { transition } from "@/lib/motion";
import type { LinkItem } from "@/lib/types";

type NavItem = { label: string; href: string };

/**
 * Mobile navigation panel.
 *
 * Rendered through a portal on <body> so it escapes the header's stacking
 * context — the header stays `sticky` without the panel inheriting its
 * backdrop filter, transform or z-index. The header is raised above this while
 * it is open, and carries the wordmark and the toggle for both states.
 */
export function MobileMenu({
  open,
  onClose,
  items,
  cta,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  cta?: LinkItem | null;
}) {
  const mounted = useIsMounted();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="mobile-menu"
          className="fixed inset-0 z-100 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          /*
           * Same clock as the panel below, deliberately. This used to fade over
           * `hover` while the panel it contains slid over `move`, so the panel
           * was fully transparent 180ms before it finished travelling — it
           * appeared to vanish mid-slide rather than leave.
           */
          transition={transition("move")}
          role="dialog"
          aria-modal="true"
          aria-label="Izbornik"
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-ink-900/60 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Zatvori izbornik"
          />

          {/*
            No header row of its own: the site header sits above this panel
            while it is open, carrying the wordmark and the one toggle. A second
            wordmark and a second close button directly beneath them was the
            duplication that made opening the menu feel like a different screen
            rather than the same one. `pt-18` clears the header instead.
          */}
          <motion.nav
            className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col bg-stone-50 pt-18 shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={transition("move")}
          >
            <ul className="flex-1 overflow-y-auto border-t border-stone-200 px-6 py-6">
              {items.map((item, index) => (
                <motion.li
                  key={`${item.href}-${index}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={transition("move", 0.12 + index * 0.06)}
                  className="border-b border-stone-200/70 last:border-none"
                >
                  <SmartLink
                    href={item.href}
                    onClick={onClose}
                    className="hover-nudge block py-4 font-display text-xl text-ink-900 hover:text-brass-600"
                  >
                    {item.label}
                  </SmartLink>
                </motion.li>
              ))}
            </ul>

            {cta?.label && cta.href ? (
              <div className="border-t border-stone-200 p-6">
                <SmartLink
                  href={cta.href}
                  onClick={onClose}
                  className="press flex items-center justify-center bg-sea-800 px-6 py-3.5 text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-stone-50 hover:bg-sea-700"
                >
                  {cta.label}
                </SmartLink>
              </div>
            ) : null}
          </motion.nav>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
