import { Reveal } from "@/components/ui/Reveal";
import { bindTimeRanges } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { HomePageType, ScheduleType } from "@/lib/types";

/**
 * When the office is open, and the notes that go with it.
 */
export function OfficeSection({
  section,
  schedule,
  dict,
}: {
  section: HomePageType["officeSection"];
  schedule: ScheduleType | null;
  dict: Dictionary;
}) {
  const hours = schedule?.officeHours ?? [];
  const notes = schedule?.officeNotes ?? [];

  if (!hours.length && !section?.title) return null;

  return (
    <section className="bg-stone-100 py-20 lg:py-28">
      <div className="shell">
        <SectionHeading
          eyebrow={section?.eyebrow || dict.home.officeEyebrow}
          title={section?.title || dict.home.officeTitle}
          intro={section?.intro}
        />

        {/*
          Two cards side by side on desktop rather than one narrow column with
          the rest of the row empty. The hours and the notes were always two
          separate things stacked inside one box — the row divider between them
          said as much — so giving each its own card fills the width without
          inventing content to fill it. Below `lg` they stack, unchanged.
        */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {hours.length ? (
            <Reveal>
              <div className="h-full bg-stone-50 p-7 ring-1 ring-stone-200 sm:p-8">
                <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-brass-600 uppercase">
                  {dict.home.officeHoursLabel}
                </p>

                <dl className="mt-6 divide-y divide-stone-200">
                  {hours.map((row, index) => (
                    <div
                      key={row.id ?? `${row.day}-${index}`}
                      className="flex items-baseline justify-between gap-5 py-3.5 first:pt-0 last:pb-0"
                    >
                      <dt className="text-[0.95rem] text-ink-700">
                        {row.day}
                        {row.note ? (
                          <span className="mt-0.5 block text-[0.78rem] text-ink-400">
                            {row.note}
                          </span>
                        ) : null}
                      </dt>
                      <dd className="text-right font-display text-[1.15rem] leading-tight text-ink-900">
                        {bindTimeRanges(row.hours)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          ) : null}

          {notes.length ? (
            <Reveal delay={0.08}>
              <div className="h-full bg-stone-50 p-7 ring-1 ring-stone-200 sm:p-8">
                <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-brass-600 uppercase">
                  {dict.home.officeNotesLabel}
                </p>

                <div className="mt-6 space-y-5 divide-y divide-stone-200">
                  {notes.map((note, index) => (
                    <div
                      key={note.id ?? index}
                      className={index > 0 ? "pt-5" : ""}
                    >
                      <p className="font-display text-[1.05rem] text-ink-900">
                        {note.title}
                      </p>
                      <p className="mt-1 text-[0.9rem] leading-relaxed text-ink-500">
                        {note.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
