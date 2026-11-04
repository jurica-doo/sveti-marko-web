"use client";

import { useId, type ReactNode } from "react";

import { useScheduleAccordion } from "@/components/schedule/ScheduleAccordion";
import { Reveal } from "@/components/ui/Reveal";

/**
 * One section of the Raspored page on a phone — the liturgy block or a group
 * of activities — whose times fold away. Desktop shows the same content through
 * `ScheduleBoard` instead, so this whole component is hidden from `lg` up.
 *
 * The heading itself is the toggle. The whole eyebrow-title-intro block is one
 * tap target (the button's hit area is stretched over it), a small round
 * chevron at the end of the title says it opens, and the content drops out from
 * underneath the intro — sliding down as it fades in. Folded, the page reads as
 * a short list of headings, so it needs no table of contents of its own. Only
 * one section is open at a time; `ScheduleAccordion` owns that, and keeps the
 * page from jumping when a section above the tapped one folds away.
 *
 * The fold is the `grid-template-rows: 0fr → 1fr` technique, so the height
 * animates to its natural size with no measuring.
 */
export function ScheduleSection({
  id,
  eyebrow,
  title,
  intro,
  bordered = true,
  labels,
  className = "",
  children,
}: {
  id: string;
  eyebrow?: string | null;
  title: string;
  intro?: string | null;
  /** A hairline above the section — off for the first one on the page. */
  bordered?: boolean;
  labels: { show: string; hide: string };
  className?: string;
  children: ReactNode;
}) {
  const { openId, toggle } = useScheduleAccordion();
  const open = openId === id;
  const panelId = useId();

  return (
    <section
      id={id}
      className={`lg:hidden ${bordered ? "border-t border-stone-200" : ""} ${className}`}
    >
      <div className="shell grid py-10">
        <Reveal className="relative">
          {eyebrow ? <p className="eyebrow mb-5">{eyebrow}</p> : null}

          {/*
            The accordion pattern: a real `<button>` inside the heading, so the
            heading keeps its level and the button's name is the title. Its
            `::after` covers the whole block, eyebrow and intro included, which
            makes the entire heading tappable without putting a paragraph
            inside a button.
          */}
          <h2>
            <button
              type="button"
              onClick={(event) => toggle(id, event.currentTarget)}
              aria-expanded={open}
              aria-controls={panelId}
              className="flex w-full cursor-pointer items-center justify-between gap-5 text-left text-[1.9rem] leading-[1.15] text-ink-900 after:absolute after:inset-0 sm:text-[2.2rem]"
            >
              <span>{title}</span>
              <span className="sr-only">
                {" "}
                {open ? labels.hide : labels.show}
              </span>
              <Chevron open={open} />
            </button>
          </h2>

          {intro ? (
            <p className="mt-4 text-[1rem] leading-relaxed text-ink-500">{intro}</p>
          ) : null}
        </Reveal>

        <div
          id={panelId}
          inert={!open}
          className={`grid transition-[grid-template-rows] duration-move ease-parish-in-out ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            {/* The padding lives inside the fold, so a closed section keeps no gap. */}
            <div
              className={`pt-7 transition-[opacity,translate] duration-move ease-parish-in-out ${
                open ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
              }`}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/*
 * The same round outline as the carousel arrows on the home page, so the two
 * "there is more here" controls on the site look like one family.
 */
function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 transition-colors duration-move ${
        open ? "bg-sea-800 text-stone-50 ring-sea-800" : "text-brass-600 ring-stone-200"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className={`h-4.5 w-4.5 transition-transform duration-move ease-parish-in-out ${
          open ? "rotate-180" : ""
        }`}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}
