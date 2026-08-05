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
 */
export function SchedulePlaque({
  massesTitle,
  masses,
  confessionsTitle,
  confessions,
  devotions = [],
  tone = "dark",
}: {
  massesTitle?: string | null;
  masses: ScheduleRow[];
  confessionsTitle?: string | null;
  confessions: ScheduleRow[];
  devotions?: DevotionRow[];
  tone?: "band" | "dark" | "light";
}) {
  if (!masses.length && !confessions.length) return null;

  const onDark = tone !== "light";

  const shell = {
    band: "text-stone-50",
    dark: "bg-ink-900/85 text-stone-50 backdrop-blur-md ring-1 ring-stone-50/10",
    light: "bg-stone-100 text-ink-900 ring-1 ring-stone-200",
  }[tone];

  /*
   * In `band` the plaque sits inside the page gutter already, so it drops its
   * own horizontal padding and spaces the two columns off the divider instead.
   * The side gutter only exists once there are two columns to separate.
   */
  const pad =
    tone === "band"
      ? [
          "py-8 @3xl/plaque:py-11 @3xl/plaque:pr-10",
          "py-8 @3xl/plaque:py-11 @3xl/plaque:pl-10",
        ]
      : ["px-6 py-7 @3xl/plaque:px-8", "px-6 py-7 @3xl/plaque:px-8"];

  const label = onDark ? "text-brass-300" : "text-brass-600";
  const muted = onDark ? "text-stone-200/55" : "text-ink-400";
  const rule = onDark ? "border-stone-50/12" : "border-stone-200";

  /*
   * Container queries rather than viewport ones, because this component is
   * rendered at very different widths: about 1180px in the band under the hero,
   * about 640px in a column on the contact page. A `sm:` breakpoint cannot tell
   * those apart, so the narrow instance used to get the wide layout and squeeze.
   * Each half is its own container too, since what a row can do depends on the
   * width of the half it sits in, not of the plaque.
   */
  return (
    <div className={`@container/plaque w-full ${shell}`}>
      <div className="grid divide-y divide-current/10 @3xl/plaque:grid-cols-2 @3xl/plaque:divide-x @3xl/plaque:divide-y-0">
        <Column
          title={massesTitle || "Svete mise"}
          rows={masses}
          padClass={pad[0]}
          labelClass={label}
          mutedClass={muted}
          ruleClass={rule}
        />
        <Column
          title={confessionsTitle || "Ispovijed"}
          rows={confessions}
          padClass={pad[1]}
          labelClass={label}
          mutedClass={muted}
          ruleClass={rule}
        />
      </div>

      {/*
        Devotions run the full width beneath the two columns rather than
        becoming a third one. There are only ever a handful, and a third narrow
        column would leave the masses and confessions cramped for the sake of
        entries nobody is scanning as urgently.
      */}
      {devotions.length ? (
        <div
          className={`border-t border-current/10 ${
            tone === "band"
              ? "py-8 @3xl/plaque:py-9"
              : "px-6 py-7 @3xl/plaque:px-8"
          }`}
        >
          <p
            className={`text-[0.68rem] font-semibold tracking-[0.22em] uppercase ${label}`}
          >
            Pobožnosti
          </p>

          {/*
            Three across where there is room. Each cell is its own container, so
            a cell too narrow for a ledger row stacks its time under the title
            on its own — the same rule the columns above follow.
          */}
          <dl className="mt-5 grid gap-x-10 gap-y-5 @3xl/plaque:grid-cols-3">
            {devotions.map((item, index) => (
              <div
                key={item.id ?? `${item.title}-${index}`}
                className="@container/devotion flex flex-col gap-1.5 @sm/devotion:flex-row @sm/devotion:items-baseline @sm/devotion:gap-6"
              >
                <dt className="text-[0.95rem] leading-snug @sm/devotion:flex-1">
                  {item.title}
                  {item.day ? (
                    <span className={`mt-0.5 block text-[0.78rem] ${muted}`}>
                      {item.day}
                      {item.note ? ` · ${item.note}` : ""}
                    </span>
                  ) : null}
                </dt>
                {item.times ? (
                  <dd className="font-display text-[1.35rem] leading-tight tracking-tight @sm/devotion:w-40 @sm/devotion:shrink-0">
                    {bindTimeRanges(item.times)}
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function Column({
  title,
  rows,
  padClass,
  labelClass,
  mutedClass,
  ruleClass,
}: {
  title: string;
  rows: ScheduleRow[];
  padClass: string;
  labelClass: string;
  mutedClass: string;
  ruleClass: string;
}) {
  if (!rows.length) return null;

  return (
    <div className={`@container/col ${padClass}`}>
      <p
        className={`text-[0.68rem] font-semibold uppercase tracking-[0.22em] ${labelClass}`}
      >
        {title}
      </p>

      <dl className="mt-5 space-y-3.5">
        {rows.map((row, index) => (
          /*
           * Two layouts, because these values are long enough that one cannot
           * serve both widths.
           *
           * Wide enough, and it reads as a ledger: the term takes the free
           * space and the value sits in a fixed column beside it. Fixed is the
           * point — with `justify-between` each value hugged the right edge
           * instead, so `19:00` and `9:00, 11:00 i 20:00` began nowhere near
           * each other and the times never formed a column at all.
           *
           * Narrow, every row stacks. Letting rows wrap individually was worse
           * than either: only the long ones broke, so a column mixed
           * side-by-side rows with orphaned values and the eye lost the run of
           * times entirely.
           */
          <div
            key={row.id ?? `${row.day}-${index}`}
            className={`flex flex-col gap-1.5 @sm/col:flex-row @sm/col:items-baseline @sm/col:gap-6 ${
              index > 0 ? `border-t pt-3.5 ${ruleClass}` : ""
            }`}
          >
            <dt className="text-[0.95rem] leading-snug @sm/col:flex-1">
              {row.day}
              {row.note ? (
                <span className={`mt-0.5 block text-[0.78rem] ${mutedClass}`}>
                  {row.note}
                </span>
              ) : null}
            </dt>
            <dd className="font-display text-[1.35rem] leading-tight tracking-tight @sm/col:w-52 @sm/col:shrink-0">
              {bindTimeRanges(row.times)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
