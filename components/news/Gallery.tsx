"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useIsMounted } from "@/hooks/useIsMounted";
import { imageUrl } from "@/lib/media";
import { transition } from "@/lib/motion";
import type { MediaImageType } from "@/lib/types";

type GalleryItem = { image: MediaImageType; id?: string };

/** Shape for anything uploaded before Payload recorded dimensions. */
const FALLBACK_RATIO = { width: 4, height: 3 };

/** Photographs shown before the reader asks for the rest. */
const FIRST_BATCH = 10;

/**
 * Photo grid with a lightbox.
 *
 * Laid out as a mosaic — CSS columns with `break-inside-avoid` — rather than a
 * grid of identical crops. The parish photographs run from 116x208 to 584x342,
 * and a fixed 4:3 cell threw most of each one away. Columns let every picture
 * keep its own proportions, which is also what makes the wall knit together
 * instead of reading as a table.
 *
 * The lightbox is portalled to <body> so it is not clipped by the article's
 * `prose` container or its overflow rules.
 */
export function Gallery({ items }: { items: GalleryItem[] }) {
  /*
   * Memoised so `step` can depend on the count without the React Compiler
   * having to assume the array is rebuilt — and mutated — on every render.
   */
  const photos = useMemo(
    () => items.filter((item) => Boolean(imageUrl(item.image))),
    [items],
  );
  const [index, setIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [shown, setShown] = useState(FIRST_BATCH);
  const mounted = useIsMounted();

  /*
   * Only the visible photographs are mounted, so an article with fifty pictures
   * does not put fifty requests on the page before anyone has scrolled to them.
   * The lightbox still steps through the whole set: `photos` stays the source
   * of truth for navigation, `visible` only governs what the wall renders.
   */
  const visible = photos.slice(0, shown);
  const remaining = photos.length - visible.length;

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

  const lightboxRatio =
    (active?.image.width || FALLBACK_RATIO.width) /
    (active?.image.height || FALLBACK_RATIO.height);

  return (
    <>
      {/*
        `columns` rather than `grid`: a grid row is as tall as its tallest cell,
        so mixing portrait and landscape leaves holes under the short ones.
        Columns flow each picture directly under the last, which is the whole
        mosaic effect.
      */}
      <ul className="mt-12 columns-2 gap-3 sm:columns-3">
        {visible.map((item, i) => {
          const url = imageUrl(item.image);
          const key = item.id ?? String(item.image.id);

          return (
            <li key={key} className="mb-3 break-inside-avoid">
              <button
                type="button"
                onClick={() => setIndex(i)}
                className="press group relative block w-full cursor-pointer overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-200 hover:ring-brass-500/60"
                aria-label={`Otvori sliku ${i + 1}`}
              >
                {url ? (
                  <Image
                    src={url}
                    alt={item.image.alt || ""}
                    width={item.image.width || FALLBACK_RATIO.width}
                    height={item.image.height || FALLBACK_RATIO.height}
                    sizes="(min-width: 640px) 33vw, 50vw"
                    onLoad={() =>
                      setLoaded((current) => ({ ...current, [key]: true }))
                    }
                    /*
                     * The stone tile behind is the skeleton. Because the width
                     * and height are known, the tile is already the right shape
                     * before anything downloads — so the page does not reflow
                     * when the picture arrives, it just fades onto its own
                     * placeholder. Fading opacity rather than running a shimmer
                     * keeps it working under reduced motion, where keyframes
                     * are cut to nothing.
                     */
                    className={`zoom-media h-auto w-full ${
                      loaded[key] ? "opacity-100" : "opacity-0"
                    } group-hover:scale-105`}
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {remaining > 0 ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((current) => current + FIRST_BATCH)}
            className="hover-lift inline-flex cursor-pointer items-center justify-center border border-ink-900/25 px-7 py-3.5 text-[0.78rem] font-semibold tracking-[0.16em] text-ink-900 uppercase hover:border-brass-500 hover:text-brass-600"
          >
            Učitaj još ({remaining})
          </button>
        </div>
      ) : null}

      {mounted
        ? createPortal(
            <AnimatePresence>
              {active && activeUrl ? (
                <motion.div
                  className="fixed inset-0 z-110 flex items-center justify-center bg-ink-900/95 p-4 backdrop-blur-sm sm:p-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transition("hover")}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Galerija"
                >
                  {/*
                    Click anywhere to dismiss, but with the ordinary pointer.
                    `cursor-zoom-out` implied the click would zoom the picture
                    rather than close the whole thing, which is the opposite of
                    what it does.
                  */}
                  <button
                    type="button"
                    className="absolute inset-0 h-full w-full cursor-default"
                    onClick={close}
                    aria-label="Zatvori galeriju"
                  />

                  {/*
                    Sized to the picture rather than to a fixed frame, so it is
                    centred at its own proportions instead of being letterboxed
                    inside a 3:2 box it never fills.
                  */}
                  <motion.figure
                    /*
                      `w-full` matters: the frame inside sizes itself with
                      `w-full`, and a flex item with only a `max-w` is sized by
                      its content — so the width resolved against nothing and
                      the picture collapsed to zero.
                    */
                    className="pointer-events-none relative z-10 flex w-full max-h-full max-w-5xl flex-col items-center"
                    initial={{ scale: 0.94, opacity: 0, y: 12 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: 12 }}
                    transition={transition("move")}
                  >
                    {/*
                      The frame takes the picture's own aspect ratio and is
                      capped on both axes, so it scales to fit the viewport
                      without ever being letterboxed. That matters for the
                      rounding: the corners belong to the photograph, not to a
                      box it happens to sit inside. Sizing by intrinsic width
                      instead left small images at native size — a 156px
                      photograph stranded in the middle of a full-screen
                      overlay.
                    */}
                    <div
                      className="relative w-full overflow-hidden rounded-xl shadow-2xl"
                      style={{
                        aspectRatio: String(lightboxRatio),
                        maxHeight: "78vh",
                        maxWidth: `calc(78vh * ${lightboxRatio})`,
                      }}
                    >
                      <Image
                        src={activeUrl}
                        alt={active.image.alt || ""}
                        fill
                        sizes="90vw"
                        priority
                        className="object-cover"
                      />
                    </div>

                    {active.image.caption ? (
                      <figcaption className="mt-4 max-w-2xl text-center text-[0.85rem] text-stone-200/70">
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
                    className="hover-rotate absolute top-5 right-5 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-stone-50/10 text-stone-200 backdrop-blur-md hover:bg-stone-50/20 hover:text-brass-300"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
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
 * Deliberately not `.hover-nudge`: the `-translate-y-1/2` here is layout, not
 * motion, so these arrows slide their glyph inside a stationary hit target
 * rather than moving the button out from under the pointer.
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
      className={`group absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-stone-50/10 text-stone-200 backdrop-blur-md transition-colors hover:bg-stone-50/20 hover:text-brass-300 ${
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
