import Image from "next/image";

import { SchedulePlaque } from "@/components/home/SchedulePlaque";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { imageUrl } from "@/lib/media";
import { SCHEDULE_ANCHOR } from "@/lib/routes";
import type { HomePageType, ScheduleType } from "@/lib/types";

export function Hero({
  home,
  schedule,
}: {
  home: HomePageType;
  schedule: ScheduleType | null;
}) {
  const hero = home.hero;
  const background = imageUrl(hero.image);

  const masses = (schedule?.masses ?? []).filter((row) => row.highlight !== false);
  const confessions = (schedule?.confessions ?? []).filter(
    (row) => row.highlight !== false,
  );
  const showPlaque = hero.showSchedule !== false;

  return (
    // Pulled up by exactly the header height (`h-18 lg:h-20` in Navbar) so the
    // hero runs behind the transparent bar. Keep the two in step.
    <section className="relative -mt-18 lg:-mt-20">
      {/*
        Trimmed from 38/46rem: the plaque used to be pulled up into this box,
        so the photograph had to carry the height the overlap ate. Now that the
        band stands on its own, the same trim keeps the times sitting where
        they did relative to the fold.
      */}
      <div className="relative min-h-144 overflow-hidden bg-ink-900 lg:min-h-168">
        {background ? (
          <Image
            src={background}
            alt={hero.image?.alt || ""}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          // Until a photo of the church is uploaded, the hero falls back to a
          // deep sea wash rather than a flat block of colour.
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_0%,var(--color-sea-700)_0%,var(--color-ink-800)_45%,var(--color-ink-900)_100%)]"
          />
        )}

        {/* Two stacked scrims: vertical for legibility, left-side for the copy. */}
        <div className="absolute inset-0 bg-linear-to-b from-ink-900/75 via-ink-900/45 to-ink-900/85" />
        <div className="absolute inset-0 bg-linear-to-r from-ink-900/70 via-ink-900/10 to-transparent" />

        <div className="shell relative flex min-h-144 flex-col justify-end pt-32 pb-16 lg:min-h-168 lg:pt-40 lg:pb-24">
          <div className="max-w-2xl">
            {hero.eyebrow ? (
              <Reveal y={12}>
                <p className="eyebrow eyebrow-light">{hero.eyebrow}</p>
              </Reveal>
            ) : null}

            <Reveal y={20} delay={0.08}>
              <h1 className="mt-6 text-[2.5rem] leading-[1.08] text-stone-50 sm:text-[3.4rem] lg:text-[4.1rem]">
                {hero.title}
              </h1>
            </Reveal>

            {hero.subtitle ? (
              <Reveal y={20} delay={0.16}>
                <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-stone-200/85">
                  {hero.subtitle}
                </p>
              </Reveal>
            ) : null}

            {hero.primaryCta?.label || hero.secondaryCta?.label ? (
              <Reveal y={20} delay={0.24}>
                <div className="mt-9 flex flex-wrap gap-3">
                  {hero.primaryCta?.label && hero.primaryCta.href ? (
                    <ButtonLink href={hero.primaryCta.href}>
                      {hero.primaryCta.label}
                    </ButtonLink>
                  ) : null}
                  {hero.secondaryCta?.label && hero.secondaryCta.href ? (
                    <ButtonLink href={hero.secondaryCta.href} variant="light">
                      {hero.secondaryCta.label}
                    </ButtonLink>
                  ) : null}
                </div>
              </Reveal>
            ) : null}
          </div>
        </div>
      </div>

      {/*
        The times sit in their own band butted straight against the photograph
        rather than straddling its bottom edge. The hero's lower scrim already
        fades to ink-900, so the seam reads as the photograph settling onto the
        plaque, and a brass hairline — the same rule that heads the footer —
        makes that seam deliberate.
      */}
      {showPlaque && (masses.length > 0 || confessions.length > 0) ? (
        <div id={SCHEDULE_ANCHOR} className="scroll-mt-18 bg-ink-900 lg:scroll-mt-20">
          <div className="h-px w-full bg-linear-to-r from-transparent via-brass-500/60 to-transparent" />
          <Reveal y={12} delay={0.2}>
            <div className="shell">
              <SchedulePlaque
                massesTitle={hero.massesTitle}
                masses={masses}
                confessionsTitle={hero.confessionsTitle}
                confessions={confessions}
                devotions={schedule?.devotions ?? []}
                tone="band"
              />
            </div>
          </Reveal>
        </div>
      ) : null}
    </section>
  );
}
