import type { ReactNode } from "react";

import { Reveal } from "./Reveal";

/**
 * Heading for the sections on light backgrounds — the only kind left. The
 * timeline on the About page was the one dark section, and it carried the
 * `tone="light"` variant with it when it went; the dark headings that remain
 * (hero, page headers) set their own type rather than coming through here.
 */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  action,
}: {
  eyebrow?: string | null;
  title?: string | null;
  intro?: string | null;
  action?: ReactNode;
}) {
  if (!eyebrow && !title && !intro) return null;

  return (
    <Reveal
      className={`flex flex-col gap-6 ${
        action ? "md:flex-row md:items-end md:justify-between" : ""
      }`}
    >
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        {title ? (
          <h2 className="mt-5 text-[2rem] leading-[1.15] text-ink-900 sm:text-[2.6rem]">
            {title}
          </h2>
        ) : null}
        {intro ? (
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-500">
            {intro}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </Reveal>
  );
}
