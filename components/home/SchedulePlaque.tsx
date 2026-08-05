import { bindTimeRanges } from "@/lib/format";
import type { DevotionRow, ScheduleRow } from "@/lib/types";

/**
 * The signature element of the site: a plaque of times, set like the carved
 * stone tablet by a church door. It answers "when is mass" before anything
 * else on the screen.
 *
 * Three tones, because it is used three ways:
 *   band  — under the hero, where the surrounding section supplies the dark
 *           ground, so the plaque draws no box of its own and only sets its
 *           columns against the page gutter
 *   dark  — a self-contained slab over a photograph
 *   light — a card in a light section, as on the contact page
 *
 * The shape follows the content rather than a fixed grid. Masses take the top
 * row to themselves and lay their two entries side by side; confessions and
 * devotions share the row below, three entries each in a column. Splitting it
 * by count rather than by kind is what keeps the block from having one long
 * column beside a short one with dead space under it.
 */
export function SchedulePlaque({
  massesTitle,
  masses,
  confessionsTitle,
  confessions,
  devotions = [],
  tone = "dark",
  className = "",
}: {
  massesTitle?: string | null;
  masses: ScheduleRow[];
  confessionsTitle?: string | null;
  confessions: ScheduleRow[];
  devotions?: DevotionRow[];
  tone?: "band" | "dark" | "light";
  /** For a caller that needs the card to fill a column, e.g. `lg:flex-1`. */
  className?: string;
}) {
  if (!masses.length && !confessions.length) return null;

  const onDark = tone !== "light";
  const isBand = tone === "band";

  const shell = {
    band: "text-stone-50",
    dark: "bg-ink-900/85 text-stone-50 backdrop-blur-md ring-1 ring-stone-50/10",
    light: "bg-stone-100 text-ink-900 ring-1 ring-stone-200",
  }[tone];

  const label = onDark ? "text-brass-300" : "text-brass-600";
  const muted = onDark ? "text-stone-200/55" : "text-ink-400";
  const rule = onDark ? "border-stone-50/12" : "border-stone-200";

  /*
   * In `band` the plaque already sits inside the page gutter, so it drops its
   * own horizontal padding; the side insets only exist to hold the two lower
   * sections off the divider between them.
   */
  const padY = isBand ? "py-8 @3xl/plaque:py-11" : "px-6 py-9 @3xl/plaque:px-8";
  const insetStart = isBand ? "@3xl/plaque:pr-10" : "";
  const insetEnd = isBand ? "@3xl/plaque:pl-10" : "";

  /*
   * Devotions carry a title and a separate day, where a mass row carries a day
   * and a note. Folding them into the same shape lets one row component render
   * both, so the two halves of the lower row are typeset identically.
   */
  const devotionRows: ScheduleRow[] = devotions.map((item) => ({
    id: item.id,
    day: item.title,
    times: item.times ?? "",
    note: [item.day, item.note].filter(Boolean).join(" · ") || null,
  }));

  const lower = [
    confessions.length
      ? {
          key: "confessions",
          title: confessionsTitle || "Ispovijed",
          rows: confessions,
        }
      : null,
    devotionRows.length
      ? { key: "devotions", title: "Pobožnosti", rows: devotionRows }
      : null,
  ].filter((section) => section !== null);

  /*
   * Container queries rather than viewport ones, because this component is
   * rendered at very different widths: about 1180px in the band under the hero,
   * about 640px in a column on the contact page. A `sm:` breakpoint cannot tell
   * those apart, so the narrow instance used to get the wide layout and squeeze.
   */
  return (
    <div
      className={`@container/plaque flex w-full flex-col ${shell} ${className}`}
    >
      {masses.length ? (
        <div className={padY}>
          <SectionLabel className={label}>
            {massesTitle || "Svete mise"}
          </SectionLabel>

          {/*
            Side by side, not stacked. Run full width as a single list and each
            time would sit a thousand pixels from the day it belongs to.
          */}
          <dl className="mt-5 grid gap-x-10 gap-y-5 @3xl/plaque:grid-cols-2">
            {masses.map((row, index) => (
              <Entry
                key={row.id ?? `${row.day}-${index}`}
                row={row}
                mutedClass={muted}
              />
            ))}
          </dl>
        </div>
      ) : null}

      {lower.length ? (
        <div
          className={`grid flex-1 border-t border-current/10 divide-y divide-current/10 ${
            lower.length > 1
              ? "@3xl/plaque:grid-cols-2 @3xl/plaque:divide-x @3xl/plaque:divide-y-0"
              : ""
          }`}
        >
          {lower.map((section, index) => (
            <div
              key={section.key}
              className={`${padY} ${index === 0 ? insetStart : insetEnd}`}
            >
              <SectionLabel className={label}>{section.title}</SectionLabel>

              <dl className="mt-5 space-y-3.5">
                {section.rows.map((row, rowIndex) => (
                  <Entry
                    key={row.id ?? `${row.day}-${rowIndex}`}
                    row={row}
                    mutedClass={muted}
                    className={
                      rowIndex > 0 ? `border-t pt-3.5 ${rule}` : undefined
                    }
                  />
                ))}
              </dl>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <p
      className={`text-[0.68rem] font-semibold tracking-[0.22em] uppercase ${className}`}
    >
      {children}
    </p>
  );
}

/**
 * One term and its time.
 *
 * Wide enough, it reads as a ledger: the term takes the free space and the time
 * sits in a fixed column beside it. Fixed is the point — right-aligning each
 * value instead left `19:00` and `9:00, 11:00 i 20:00` starting nowhere near
 * each other, so the times never formed a column at all.
 *
 * Narrow, it stacks. Letting rows wrap individually was worse than either:
 * only the long ones broke, so a column mixed side-by-side rows with orphaned
 * values and the eye lost the run of times entirely.
 *
 * The cell is its own container, so each one decides for itself — which is what
 * lets the same component sit in a half-width column and in a two-up grid.
 */
function Entry({
  row,
  mutedClass,
  className = "",
}: {
  row: ScheduleRow;
  mutedClass: string;
  className?: string;
}) {
  return (
    <div
      className={`@container flex flex-col gap-1.5 @sm:flex-row @sm:items-baseline @sm:gap-6 ${className}`}
    >
      <dt className="text-[0.95rem] leading-snug @sm:flex-1">
        {row.day}
        {row.note ? (
          <span className={`mt-0.5 block text-[0.78rem] ${mutedClass}`}>
            {row.note}
          </span>
        ) : null}
      </dt>
      {/* The time column is 13rem because `9:00, 11:00 i 20:00` is the longest
          value the parish sets, and it needs all of that to stay on one line. */}
      {row.times ? (
        <dd className="font-display text-[1.35rem] leading-tight tracking-tight @sm:w-52 @sm:shrink-0">
          {bindTimeRanges(row.times)}
        </dd>
      ) : null}
    </div>
  );
}
