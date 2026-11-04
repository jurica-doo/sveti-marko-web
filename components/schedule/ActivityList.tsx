import { bindTimeRanges } from "@/lib/format";
import type { ActivityRow } from "@/lib/types";

/**
 * One group's activities — catechesis, choirs, parish groups — as a light
 * card in the same material as the schedule plaque on this page: stone ground,
 * one hairline ring, rules between rows.
 *
 * The ledger works like the plaque's `Entry`, with the time in a fixed column
 * so a run of `17:00 – 18:00` rows lines up. An activity has a day as well as
 * a time, though, and the day is what people scan for ("what's on Friday?"),
 * so it sits right above the time as a small label instead of being folded
 * into the note on the left.
 */
export function ActivityList({ rows }: { rows: ActivityRow[] }) {
  if (!rows.length) return null;

  return (
    <dl className="bg-stone-100 px-6 ring-1 ring-stone-200 @container/list lg:px-8">
      {rows.map((row, index) => (
        <ActivityEntry
          key={row.id ?? `${row.title}-${index}`}
          row={row}
          className={index > 0 ? "border-t border-stone-200" : ""}
        />
      ))}
    </dl>
  );
}

function ActivityEntry({ row, className }: { row: ActivityRow; className: string }) {
  const details = [row.place, row.note].filter(Boolean).join(" · ");

  return (
    <div
      className={`flex flex-col gap-3 py-6 @lg/list:flex-row @lg/list:items-baseline @lg/list:gap-8 ${className}`}
    >
      <dt className="@lg/list:flex-1">
        <span className="block text-[1.05rem] leading-snug text-ink-900">{row.title}</span>
        {details ? (
          <span className="mt-1 block text-[0.82rem] leading-relaxed text-ink-400">
            {details}
          </span>
        ) : null}
      </dt>

      {row.day || row.times ? (
        <dd className="@lg/list:w-56 @lg/list:shrink-0">
          {row.day ? (
            <span className="block text-[0.68rem] font-semibold tracking-[0.18em] text-brass-600 uppercase">
              {row.day}
            </span>
          ) : null}
          {row.times ? (
            <span className="mt-1 block font-display text-[1.35rem] leading-tight tracking-tight text-ink-900">
              {bindTimeRanges(row.times)}
            </span>
          ) : null}
        </dd>
      ) : null}
    </div>
  );
}
