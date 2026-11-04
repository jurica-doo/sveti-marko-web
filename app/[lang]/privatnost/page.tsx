import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getPrivacyPage } from "@/lib/api";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { RichTextRenderer } from "@/lib/richtext";
import { ROUTES } from "@/lib/routes";
import { buildBreadcrumbJsonLd, buildSeoMetadata, serializeJsonLd } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const page = await getPrivacyPage(lang).catch(() => null);

  return buildSeoMetadata({
    title: page?.metaTitle || page?.title || "Privatnost",
    // See the note in `kontakt/page.tsx` — a CMS SEO title is already complete.
    absoluteTitle: Boolean(page?.metaTitle),
    description: page?.metaDescription || page?.intro,
    path: ROUTES.privacy,
    locale: lang,
  });
}

/**
 * The privacy notice — what the website does with a visitor's data.
 *
 * Plain reading page: the shared page header, then the CMS text in the same
 * prose styles as a news article, held to a comfortable reading width. The
 * wording lives in the CMS (`privacy-page`) so the parish can keep it current
 * without a code change.
 */
export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);

  const page = await getPrivacyPage(lang);

  // Only the trail — the parish entity itself is emitted once, by the layout.
  const jsonLd = buildBreadcrumbJsonLd(
    [
      { name: dict.breadcrumb.home, href: ROUTES.home },
      { name: page.title, href: ROUTES.privacy },
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
        breadcrumb={[{ label: dict.privacy.breadcrumbTitle, href: ROUTES.privacy }]}
        dict={dict}
      />

      <section className="shell py-16 lg:py-24">
        <Reveal className="max-w-3xl">
          <RichTextRenderer content={page.body ?? undefined} />

          {page.updatedAtLabel ? (
            <p className="mt-12 border-t border-stone-200 pt-6 text-[0.85rem] text-ink-400">
              {dict.privacy.updatedLabel} {page.updatedAtLabel}
            </p>
          ) : null}
        </Reveal>
      </section>
    </>
  );
}
