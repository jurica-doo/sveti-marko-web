"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The useful-links cards: a grid from `sm` up, a swipeable row below it.
 *
 * Six cards stacked on a phone were six screens of scrolling for what is a
 * secondary section. As a row each card keeps its full size, the next one
 * peeks in from the edge to say "there is more", and snapping lands every
 * swipe on a card boundary.
 *
 * Below the row: a hairline that fills as the row is scrolled (sprung, so it
 * glides rather than ticks), a `02 / 06` counter in the display face, and
 * arrow buttons for anyone not swiping — all of it hidden from `sm` up, where
 * the grid needs none of it.
 */
export function LinksCarousel({
  count,
  labels,
  children,
}: {
  count: number;
  labels: { prev: string; next: string };
  children: ReactNode;
}) {
  const rowRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  const { scrollXProgress } = useScroll({ container: rowRef });
  const progress = useSpring(scrollXProgress, { stiffness: 260, damping: 32, mass: 0.4 });

  // Which card is at the leading edge, for the counter and the arrows.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const onScroll = () => {
      const first = row.firstElementChild as HTMLElement | null;
      const step = first ? first.offsetWidth + parseFloat(getComputedStyle(row).columnGap || "0") : 1;
      const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 2;
      setIndex(atEnd ? count - 1 : Math.round(row.scrollLeft / step));
    };
    onScroll();
    row.addEventListener("scroll", onScroll, { passive: true });
    return () => row.removeEventListener("scroll", onScroll);
  }, [count]);

  function go(direction: 1 | -1) {
    const row = rowRef.current;
    const card = row?.children[Math.max(0, Math.min(count - 1, index + direction))] as
      | HTMLElement
      | undefined;
    if (!row || !card) return;
    const padding = parseFloat(getComputedStyle(row).scrollPaddingLeft || "0");
    row.scrollTo({ left: card.offsetLeft - row.offsetLeft - padding, behavior: "smooth" });
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="mt-12">
      <ul
        ref={rowRef}
        className="no-scrollbar mx-[calc(var(--shell-pad)*-1)] flex snap-x snap-mandatory scroll-px-[var(--shell-pad)] gap-3 overflow-x-auto px-[var(--shell-pad)] pb-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-px sm:overflow-visible sm:bg-stone-200 sm:px-0 sm:pb-0 lg:grid-cols-3"
      >
        {children}
      </ul>

      {count > 1 ? (
        <div className="mt-6 flex items-center gap-5 sm:hidden">
          <span className="font-display text-[1.05rem] text-ink-900 tabular-nums">
            {pad(index + 1)}
            <span className="text-ink-400"> / {pad(count)}</span>
          </span>

          <div className="relative h-px flex-1 bg-stone-200">
            <motion.div
              style={{ scaleX: progress }}
              className="absolute inset-0 origin-left bg-brass-500"
            />
          </div>

          <div className="flex gap-2">
            <ArrowButton label={labels.prev} disabled={index === 0} onClick={() => go(-1)}>
              ←
            </ArrowButton>
            <ArrowButton label={labels.next} disabled={index >= count - 1} onClick={() => go(1)}>
              →
            </ArrowButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="press flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink-700 ring-1 ring-stone-200 transition-colors hover:text-brass-600 hover:ring-brass-500 disabled:cursor-default disabled:opacity-35"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
