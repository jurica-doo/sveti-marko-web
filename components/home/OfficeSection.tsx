import { Reveal } from "@/components/ui/Reveal";
import { bindTimeRanges } from "@/lib/format";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { HomePageType, ScheduleType } from "@/lib/types";

/**
 * When the office is open, and the notes that go with it.
 */
export function OfficeSection({
  section,
  schedule,
}: {
  section: HomePageType["officeSection"];
  schedule: ScheduleType | null;
}) {
  const hours = schedule?.officeHours ?? [];
  const notes = schedule?.officeNotes ?? [];

  if (!hours.length && !section?.title) return null;

  return (
    <section className="bg-stone-100 py-20 lg:py-28">
      <div className="shell">
        <SectionHeading
          eyebrow={section?.eyebrow || "Župni ured"}
          title={section?.title || "Radno vrijeme i sakramenti"}
          intro={section?.intro}
        />

        <div className="mt-12">
          {hours.length ? (
            <Reveal className="lg:max-w-2xl">
              <div className="bg-stone-50 p-7 ring-1 ring-stone-200 sm:p-8">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-brass-600">
                  Radno vrijeme
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

                {notes.length ? (
                  <div className="mt-7 space-y-4 border-t border-stone-200 pt-6">
                    {notes.map((note, index) => (
                      <div key={note.id ?? index}>
                        <p className="font-display text-[1.05rem] text-ink-900">
                          {note.title}
                        </p>
                        <p className="mt-1 text-[0.9rem] leading-relaxed text-ink-500">
                          {note.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
