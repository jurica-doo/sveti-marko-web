"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useIsMounted } from "@/hooks/useIsMounted";
import { imageUrl } from "@/lib/media";
import { transition } from "@/lib/motion";
import type { MediaImageType } from "@/lib/types";

type GalleryItem = { image: MediaImageType; id?: string };

/**
 * Photo grid with a lightbox. The lightbox is portalled to <body> so it is not
 * clipped by the article's `prose` container or its overflow rules.
 */
export function Gallery({ items }: { items: GalleryItem[] }) {
  const photos = items.filter((item) => Boolean(imageUrl(item.image)));
  const [index, setIndex] = useState<number | null>(null);
  const mounted = useIsMounted();

  const close = useCallback(() => setIndex(null), []);

  const step = useCallback(
    (delta: number) =>
      setIndex((current) =>
        current === null
          ? null
          : (current + delta + photos.length) % photos.length,
      ),
    [photos.length],
  );

  useEffect(() => {
    if (index === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [index, close, step]);

  if (!photos.length) return null;

  const active = index === null ? null : photos[index];
  const activeUrl = active ? imageUrl(active.image) : undefined;

  return (
    <>
      <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((item, i) => {
          const url = imageUrl(item.image);
          return (
            <li key={item.id ?? item.image.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                className="press group relative block aspect-4/3 w-full overflow-hidden bg-stone-100 ring-1 ring-stone-200 hover:ring-brass-500/60"
                aria-label={`Otvori sliku ${i + 1}`}
              >
                {url ? (
                  <Image
                    src={url}
                    alt={item.image.alt || ""}
                    fill
                    sizes="(min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-zoom group-hover:scale-105"
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {active && activeUrl ? (
                <motion.div
                  className="fixed inset-0 z-[110] flex items-center justify-center bg-ink-900/95 p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transition("hover")}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Galerija"
                >
                  <button
                    type="button"
                    className="absolute inset-0 h-full w-full cursor-zoom-out"
                    onClick={close}
                    aria-label="Zatvori galeriju"
                  />

                  <motion.figure
                    className="relative max-h-[85vh] w-full max-w-5xl"
                    initial={{ scale: 0.94, opacity: 0, y: 12 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: 12 }}
                    transition={transition("move")}
                  >
                    <div className="relative aspect-[3/2] w-full">
                      <Image
                        src={activeUrl}
                        alt={active.image.alt || ""}
                        fill
                        sizes="90vw"
                        className="object-contain"
                      />
                    </div>
                    {active.image.caption ? (
                      <figcaption className="mt-4 text-center text-[0.85rem] text-stone-200/70">
                        {active.image.caption}
                      </figcaption>
                    ) : null}
                  </motion.figure>

                  {photos.length > 1 ? (
                    <>
                      <LightboxButton
                        side="left"
                        onClick={() => step(-1)}
                        label="Prethodna slika"
                      />
                      <LightboxButton
                        side="right"
                        onClick={() => step(1)}
                        label="Sljedeća slika"
                      />
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={close}
                    aria-label="Zatvori galeriju"
                    className="hover-rotate absolute top-5 right-5 z-10 flex h-10 w-10 items-center justify-center text-stone-200 hover:text-brass-300"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                      <path
                        d="M5 5l10 10M15 5L5 15"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * The button itself does not move. It used to slide sideways on hover, which
 * meant that catching it near its trailing edge slid it out from under the
 * pointer, un-hovered it, and started the flicker loop — and being absolutely
 * positioned, it could not take a `.hover-nudge` shield the way the footer
 * links do. Sliding the glyph inside a stationary hit target gives the same
 * read with nothing to guard against.
 */
function LightboxButton({
  side,
  onClick,
  label,
}: {
  side: "left" | "right";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-stone-50/20 text-stone-200 transition-colors hover:border-brass-500 hover:text-brass-300 ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      <span
        aria-hidden="true"
        className={`indicator ${
          side === "left"
            ? "group-hover:-translate-x-1"
            : "group-hover:translate-x-1"
        }`}
      >
        {side === "left" ? "←" : "→"}
      </span>
    </button>
  );
}
