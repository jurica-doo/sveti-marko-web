import Image from "next/image";

import { SchedulePlaque } from "@/components/home/SchedulePlaque";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { imageUrl } from "@/lib/media";
import { SmartLink } from "@/components/ui/SmartLink";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ROUTES, SCHEDULE_ANCHOR } from "@/lib/routes";
import type { HomePageType, ScheduleType } from "@/lib/types";

export function Hero({
  home,
  schedule,
  dict,
}: {
  home: HomePageType;
  schedule: ScheduleType | null;
  dict: Dictionary;
}) {
  const hero = home.hero;
  const background = imageUrl(hero.image);

  const masses = (schedule?.masses ?? []).filter(
    (row) => row.highlight !== false,
  );
  const confessions = (schedule?.confessions ?? []).filter(
    (row) => row.highlight !== false,
  );
  const hasSpecialSchedule = (schedule?.specialSchedule ?? []).some(
    (block) => block.active !== false && block.entries?.length,
  );
  const showPlaque = hero.showSchedule !== false;
  const hasSchedule =
    masses.length > 0 || confessions.length > 0 || hasSpecialSchedule;

  return (
    // Pulled up by exactly the header height (`h-18 lg:h-20` in Navbar) so the
    // hero runs behind the transparent bar. Keep the two in step.
    <section className="relative -mt-18 lg:-mt-20">
      {/*
        Exactly one screen. The section is pulled up under the transparent
        header, so it starts at the very top of the viewport and `100dvh` lands
        its bottom edge on the fold — no sliver of the schedule band showing
        underneath to say "there is more, but not yet".

        `dvh` rather than `vh` because mobile browsers shrink the viewport as
        their toolbars retract; `vh` is fixed to the largest size and would run
        the hero off the bottom of the screen on first paint.
      */}
      <div className="relative h-dvh min-h-144 overflow-hidden bg-ink-900">
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

        {/* `h-full` so the copy tracks the screen the photograph now fills;
            the bottom padding clears the scroll cue below it. */}
        <div className="shell relative flex h-full flex-col justify-end pt-32 pb-24 lg:pt-40 lg:pb-28">
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

        {/*
          The only sign that a full-screen hero has anything under it. It scrolls
          to the schedule band rather than by a fixed distance, so it always
          lands on the next thing rather than somewhere between two.
        */}
        {showPlaque && hasSchedule ? (
          <SmartLink
            href={ROUTES.schedule}
            aria-label={dict.hero.scrollToSchedule}
            className="absolute inset-x-0 bottom-7 z-10 mx-auto flex h-11 w-11 items-center justify-center text-stone-50 transition-colors hover:text-brass-300"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="scroll-cue"
            >
              <path d="M12 4v14M6 13l6 6 6-6" />
            </svg>
          </SmartLink>
        ) : null}
      </div>

      {/*
        The times sit in their own band butted straight against the photograph
        rather than straddling its bottom edge. The hero's lower scrim already
        fades to ink-900, so the seam reads as the photograph settling onto the
        plaque, and a brass hairline — the same rule that heads the footer —
        makes that seam deliberate.
      */}
      {showPlaque && (masses.length > 0 || confessions.length > 0) ? (
        <div
          id={SCHEDULE_ANCHOR}
          className="scroll-mt-18 bg-ink-900 lg:scroll-mt-20"
        >
          <div className="h-px w-full bg-linear-to-r from-transparent via-brass-500/60 to-transparent" />
          <Reveal y={12} delay={0.2}>
            <div className="shell">
              <SchedulePlaque
                massesTitle={hero.massesTitle}
                masses={masses}
                confessionsTitle={hero.confessionsTitle}
                confessions={confessions}
                devotions={schedule?.devotions ?? []}
                special={schedule?.specialSchedule ?? []}
                tone="band"
                dict={dict}
              />
            </div>
          </Reveal>
        </div>
      ) : null}
    </section>
  );
}
