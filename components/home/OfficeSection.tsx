import { Reveal } from "@/components/ui/Reveal";
import { bindTimeRanges, telHref } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { HomePageType, ScheduleType } from "@/lib/types";

/**
 * When the office is open, and the notes that go with it.
 */
export function OfficeSection({
  section,
  schedule,
  phone,
  dict,
}: {
  section: HomePageType["officeSection"];
  schedule: ScheduleType | null;
  phone?: string | null;
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
          Two cards side by side on desktop, sized to what they hold: a short
          table of hours in a narrow card, prose notes in a wide one. As two
          equal halves the hours card ended half empty beside the taller notes.
          The leftover height in the hours card now carries the one thing
          someone reading office hours most likely wants next — the phone
          number — pinned to its foot. Below `lg` they stack, unchanged.
        */}
        <div className="mt-12 grid gap-6 lg:grid-cols-12 lg:gap-8">
          {hours.length ? (
            <Reveal className="lg:col-span-5">
              <div className="flex h-full flex-col bg-stone-50 p-7 ring-1 ring-stone-200 sm:p-8">
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

                {phone ? (
                  <a
                    href={telHref(phone)}
                    className="group mt-8 flex items-center justify-between gap-4 border-t border-stone-200 pt-6 lg:mt-auto"
                  >
                    <span>
                      <span className="block text-[0.68rem] font-semibold tracking-[0.18em] text-ink-400 uppercase">
                        {dict.home.officeCallLabel}
                      </span>
                      <span className="mt-1 block font-display text-[1.35rem] leading-tight text-sea-800 transition-colors group-hover:text-brass-600">
                        {phone}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="indicator flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sea-800 text-stone-50 transition-colors group-hover:bg-brass-600"
                    >
                      <PhoneIcon />
                    </span>
                  </a>
                ) : null}
              </div>
            </Reveal>
          ) : null}

          {notes.length ? (
            <Reveal delay={0.08} className={hours.length ? "lg:col-span-7" : "lg:col-span-12"}>
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

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      className="h-4.5 w-4.5"
    >
      <path d="M6.6 4h2.6l1.3 3.9-1.8 1.3a11 11 0 006.1 6.1l1.3-1.8 3.9 1.3v2.6A1.6 1.6 0 0118.4 19 14.4 14.4 0 015 5.6 1.6 1.6 0 016.6 4z" />
    </svg>
  );
}
