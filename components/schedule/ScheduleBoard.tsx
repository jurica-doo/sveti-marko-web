"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useScheduleAccordion } from "@/components/schedule/ScheduleAccordion";
import { Reveal } from "@/components/ui/Reveal";
import { DURATION, EASE_PARISH_IN_OUT } from "@/lib/motion";

export type BoardSection = {
  id: string;
  eyebrow?: string | null;
  title: string;
  intro?: string | null;
  content: ReactNode;
};

const SWAP = { duration: DURATION.hover, ease: EASE_PARISH_IN_OUT };
const GLIDE = { duration: DURATION.move, ease: EASE_PARISH_IN_OUT };

/**
 * The Raspored page on desktop: a board of tiles, one per section, over a
 * single panel that shows whichever tile is chosen.
 *
 * The first section (the liturgy) gets a full-width tile of its own on top, the
 * rest share the row beneath — the same weighting the page gives them: masses
 * first, then everything else. Each tile carries its title and description, so
 * the board doubles as the page's overview.
 *
 * Three movements, all on the parish in-out curve:
 *   - the dark fill glides from the old tile to the new one (a shared
 *     `layoutId`), so the choice reads as one thing moving, not two repainting
 *   - the panel's content cross-fades, the outgoing one lifting away and the
 *     incoming one rising into place
 *   - the panel's height eases to the new content's height (measured with a
 *     ResizeObserver), so the page below slides rather than jumps
 *
 * Nothing is ever unselected: with no section chosen yet the first one shows,
 * so the panel is never empty. A `#vjeronauk` link selects that tile on arrival
 * (see `ScheduleAccordion`). Phones use `ScheduleSection` instead; this whole
 * board is hidden below `lg`.
 */
export function ScheduleBoard({ sections }: { sections: BoardSection[] }) {
  const { openId, select } = useScheduleAccordion();
  const panelId = useId();

  const active = sections.find((section) => section.id === openId) ?? sections[0];
  if (!active) return null;

  const [lead, ...rest] = sections;

  return (
    // `data-anchors`: on desktop this board is where `#liturgija`, `#vjeronauk`
    // … land — the phone sections that own those ids are hidden here.
    <div
      data-anchors={sections.map((section) => section.id).join(" ")}
      className="shell hidden scroll-mt-18 py-20 lg:block lg:scroll-mt-20"
    >
      <div className="grid grid-cols-3 gap-4" role="group">
        <Reveal className="col-span-3">
          <Tile
            section={lead}
            selected={active.id === lead.id}
            onSelect={() => select(lead.id)}
            panelId={panelId}
            wide
          />
        </Reveal>

        {rest.map((section, index) => (
          <Reveal key={section.id} delay={0.06 * (index + 1)}>
            <Tile
              section={section}
              selected={active.id === section.id}
              onSelect={() => select(section.id)}
              panelId={panelId}
            />
          </Reveal>
        ))}
      </div>

      <Panel id={panelId} activeKey={active.id}>
        {active.content}
      </Panel>
    </div>
  );
}

function Tile({
  section,
  selected,
  onSelect,
  panelId,
  wide = false,
}: {
  section: BoardSection;
  selected: boolean;
  onSelect: () => void;
  panelId: string;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-controls={panelId}
      /*
        Text colour is timed against the gliding fill: on the tile being chosen
        it waits (`delay-200`) until the fill has mostly arrived, so there is no
        moment of pale text on a pale tile; on the tile being left it darkens
        at once, as the fill starts moving off it. Every tile keeps its stone
        ground under the fill for the same reason.
      */
      className={`group relative flex h-full w-full cursor-pointer flex-col overflow-hidden bg-stone-100 px-8 text-left ring-1 transition-[box-shadow,color] duration-move ${
        wide ? "py-9" : "py-8"
      } ${
        selected
          ? "text-stone-50 ring-sea-800 delay-200"
          : "text-ink-900 ring-stone-200 hover:ring-brass-500"
      }`}
    >
      {selected ? (
        <motion.span
          layoutId="schedule-board-fill"
          transition={GLIDE}
          aria-hidden="true"
          className="absolute inset-0 bg-sea-800"
        />
      ) : null}

      <span className={`relative flex items-start justify-between gap-6 ${wide ? "items-center" : ""}`}>
        <span className="flex flex-col">
          {section.eyebrow ? (
            <span
              className={`mb-4 text-[0.68rem] font-semibold tracking-[0.22em] uppercase transition-colors duration-move ${
                selected ? "text-brass-300 delay-200" : "text-brass-600"
              }`}
            >
              {section.eyebrow}
            </span>
          ) : null}

          <span
            className={`font-display leading-[1.15] ${
              wide ? "text-[2.4rem]" : "text-[1.7rem]"
            }`}
          >
            {section.title}
          </span>

          {section.intro ? (
            <span
              className={`mt-3 text-[0.95rem] leading-relaxed transition-colors duration-move ${
                wide ? "max-w-2xl" : ""
              } ${selected ? "text-stone-200/80 delay-200" : "text-ink-500"}`}
            >
              {section.intro}
            </span>
          ) : null}
        </span>

        <Marker selected={selected} />
      </span>
    </button>
  );
}

/** Round marker in the tile's corner: an arrow at rest, a check when chosen. */
function Marker({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 transition-colors duration-move ${
        selected
          ? "bg-stone-50 text-sea-800 ring-stone-50"
          : "text-brass-600 ring-stone-200 group-hover:ring-brass-500"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className={`h-4.5 w-4.5 transition-transform duration-move ease-parish-in-out ${
          selected ? "rotate-0" : "-rotate-90 group-hover:-rotate-45"
        }`}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}

/**
 * The content area under the board. Its height follows the content inside it,
 * eased rather than snapped, while the content itself cross-fades.
 */
function Panel({
  id,
  activeKey,
  children,
}: {
  id: string;
  activeKey: string;
  children: ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height);
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      id={id}
      role="region"
      animate={{ height }}
      transition={GLIDE}
      className="mt-10 overflow-hidden"
    >
      <div ref={innerRef}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0, transition: { ...SWAP, delay: 0.05 } }}
            exit={{ opacity: 0, y: -10, transition: SWAP }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
