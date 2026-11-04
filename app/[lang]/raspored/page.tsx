import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SchedulePlaque } from "@/components/home/SchedulePlaque";
import { ActivityList } from "@/components/schedule/ActivityList";
import { ScheduleAccordion } from "@/components/schedule/ScheduleAccordion";
import { ScheduleBoard, type BoardSection } from "@/components/schedule/ScheduleBoard";
import { ScheduleSection } from "@/components/schedule/ScheduleSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSchedule, getSchedulePage } from "@/lib/api";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ROUTES } from "@/lib/routes";
import {
  buildBreadcrumbJsonLd,
  buildSeoMetadata,
  serializeJsonLd,
} from "@/lib/seo";
import { ACTIVITY_GROUPS } from "@/lib/types";

export const revalidate = 60;

/** Anchor for the masses/confessions block — the footer links straight to it. */
const LITURGY_ANCHOR = "liturgija";

/*
 * Anchored sections sit under the sticky header (`h-18 lg:h-20` in Navbar), so
 * each one is offset by exactly that much — otherwise a jump from the footer
 * would land with its heading hidden behind the bar.
 */
const ANCHOR_OFFSET = "scroll-mt-18 lg:scroll-mt-20";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const page = await getSchedulePage(lang).catch(() => null);

  return buildSeoMetadata({
    title: page?.metaTitle || page?.title || "Raspored",
    // See the note in `kontakt/page.tsx` — a CMS SEO title is already complete.
    absoluteTitle: Boolean(page?.metaTitle),
    description: page?.metaDescription || page?.intro,
    path: ROUTES.schedulePage,
    locale: lang,
  });
}

/**
 * Every regular time the parish keeps, on one page: the liturgy first (the
 * same plaque the home page and the old contact page showed), then each group
 * of term-time activities in a section of its own.
 *
 * All the times come from the one `schedule` global; this page's own global
 * only carries the words around them. Groups with no visible activity are left
 * out entirely — heading, intro and jump link — rather than shown empty.
 */
export default async function SchedulePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);

  const [page, schedule] = await Promise.all([
    getSchedulePage(lang),
    getSchedule(lang).catch(() => null),
  ]);

  const visible = (schedule?.activities ?? []).filter(
    (row) => row.active !== false,
  );
  const groups = ACTIVITY_GROUPS.map((key) => ({
    key,
    title: page.groups?.[key]?.title || dict.schedulePage.groups[key],
    intro: page.groups?.[key]?.intro,
    rows: visible.filter((row) => row.group === key),
  })).filter((group) => group.rows.length);

  const liturgyLabel =
    page.liturgy?.eyebrow || dict.schedulePage.liturgyFallback;

  const foldLabels = {
    show: dict.schedulePage.showTimes,
    hide: dict.schedulePage.hideTimes,
  };

  const notes = [schedule?.massesNote, schedule?.confessionsNote].filter(
    Boolean,
  );

  const sections: BoardSection[] = [
    {
      id: LITURGY_ANCHOR,
      eyebrow: liturgyLabel,
      title: page.liturgy?.title || liturgyLabel,
      intro: page.liturgy?.intro,
      content: (
        <>
          <SchedulePlaque
            massesTitle={dict.footer.masses}
            masses={schedule?.masses ?? []}
            confessionsTitle={dict.schedulePlaque.confessionsFallback}
            confessions={schedule?.confessions ?? []}
            devotions={schedule?.devotions ?? []}
            special={schedule?.specialSchedule ?? []}
            tone="light"
            dict={dict}
          />

          {notes.length ? (
            <div className="mt-5 max-w-3xl space-y-1.5 text-[0.88rem] leading-relaxed text-ink-400">
              {notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          ) : null}
        </>
      ),
    },
    ...groups.map((group) => ({
      id: group.key,
      title: group.title,
      intro: group.intro,
      content: <ActivityList rows={group.rows} />,
    })),
  ];

  // Only the trail — the parish entity itself is emitted once, by the layout.
  const jsonLd = buildBreadcrumbJsonLd(
    [
      { name: dict.breadcrumb.home, href: ROUTES.home },
      { name: page.title, href: ROUTES.schedulePage },
    ],
    lang,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <PageHeader
        eyebrow={page.eyebrow}
        title={page.title}
        intro={page.intro}
        image={page.heroImage}
        breadcrumb={[
          {
            label: dict.schedulePage.breadcrumbTitle,
            href: ROUTES.schedulePage,
          },
        ]}
        dict={dict}
      />

      {/*
        Two layouts over one shared "which section is open":
          - desktop: a board of tiles over a single panel (`ScheduleBoard`)
          - phones:  one folding section per tile (`ScheduleSection`)
        Each section's content is built once here and handed to both; only one
        of the two is ever displayed.
      */}
      <ScheduleAccordion>
        <ScheduleBoard sections={sections} />

        {sections.map((section, index) => (
          <ScheduleSection
            key={section.id}
            id={section.id}
            eyebrow={section.eyebrow}
            title={section.title}
            intro={section.intro}
            bordered={index > 0}
            labels={foldLabels}
            className={ANCHOR_OFFSET}
          >
            {section.content}
          </ScheduleSection>
        ))}
      </ScheduleAccordion>
    </>
  );
}
