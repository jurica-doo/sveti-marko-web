import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StorySection } from "@/components/about/StorySection";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAboutPage } from "@/lib/api";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { imageUrl } from "@/lib/media";
import { richTextToPlain } from "@/lib/richtext";
import { ROUTES } from "@/lib/routes";
import { buildBreadcrumbJsonLd, buildSeoMetadata, serializeJsonLd } from "@/lib/seo";

export const revalidate = 60;

/**
 * Fallback photographs, used until the matching CMS field on the
 * `about-page` global has an upload of its own — at which point that wins,
 * see `StorySection`.
 *
 * There is no "Crkva" section on the page any more, so its interior photo
 * moved to the parish section instead of sitting unused. Its CMS `church`
 * group is untouched, so bringing the section back is just re-adding the
 * `StorySection` call.
 */
const PARISH_IMAGE = "/sveti-marko-unutrasnjost-sa-strane.jpg";
const PATRON_IMAGE = "/sveti-marko-kip.jpg";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const page = await getAboutPage(lang).catch(() => null);

  return buildSeoMetadata({
    title: page?.metaTitle || page?.title || "O nama",
    // See the note in `kontakt/page.tsx` — a CMS SEO title is already complete.
    absoluteTitle: Boolean(page?.metaTitle),
    description:
      page?.metaDescription || page?.intro || richTextToPlain(page?.parish?.body),
    path: ROUTES.about,
    locale: lang,
    imageUrl: imageUrl(page?.heroImage),
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);

  const page = await getAboutPage(lang);

  const jsonLd = buildBreadcrumbJsonLd(
    [
      { name: dict.breadcrumb.home, href: ROUTES.home },
      { name: page.title, href: ROUTES.about },
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
        breadcrumb={[{ label: dict.about.breadcrumbTitle, href: ROUTES.about }]}
        dict={dict}
      />

      <StorySection
        eyebrow={dict.about.parishEyebrow}
        title={page.parish?.title}
        body={page.parish?.body}
        image={page.parish?.image || PARISH_IMAGE}
      />

      <StorySection
        eyebrow={dict.about.patronEyebrow}
        title={page.patron?.title}
        meta={
          page.patron?.feastDay
            ? `${dict.about.feastLabel} · ${page.patron.feastDay}`
            : null
        }
        body={page.patron?.body}
        image={page.patron?.image || PATRON_IMAGE}
        imageOrientation="portrait"
        flip
        tone="muted"
      />
    </>
  );
}
