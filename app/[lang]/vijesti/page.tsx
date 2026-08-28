import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NewsArchive } from "@/components/news/NewsArchive";
import { PageHeader } from "@/components/ui/PageHeader";
import { getNewsPage, getNewsPaginated } from "@/lib/api";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
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
  const dict = getDictionary(lang);
  const page = await getNewsPage(lang).catch(() => null);

  return buildSeoMetadata({
    title: page?.metaTitle || page?.title || dict.news.archiveTitle,
    // See the note in `kontakt/page.tsx` — a CMS SEO title is already complete.
    absoluteTitle: Boolean(page?.metaTitle),
    description: page?.metaDescription || page?.intro || dict.news.archiveIntro,
    path: ROUTES.news,
    locale: lang,
  });
}

export default async function NewsIndexPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);

  const page = await getNewsPage(lang).catch(() => null);

  // `perPage` is the office's own setting; nine fills the three-up grid evenly.
  const perPage = page?.perPage || 9;
  const firstPage = await getNewsPaginated(lang, { page: 1, limit: perPage }).catch(
    () => null,
  );
  const news = firstPage?.docs ?? [];

  const jsonLd = buildBreadcrumbJsonLd(
    [
      { name: dict.breadcrumb.home, href: ROUTES.home },
      { name: page?.title || dict.news.archiveTitle, href: ROUTES.news },
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
        eyebrow={page?.eyebrow || dict.news.archiveEyebrow}
        title={page?.title || dict.news.archiveTitle}
        intro={page?.intro || dict.news.archiveIntro}
        image={page?.heroImage}
        breadcrumb={[{ label: dict.news.archiveTitle, href: ROUTES.news }]}
        dict={dict}
      />

      <section className="shell py-16 lg:py-24">
        {news.length ? (
          <NewsArchive
            initial={news}
            perPage={perPage}
            hasMore={Boolean(firstPage?.hasNextPage)}
            dict={dict}
          />
        ) : (
          <p className="max-w-xl text-[1.05rem] text-ink-500">
            {page?.emptyMessage || dict.news.archiveEmpty}
          </p>
        )}
      </section>
    </>
  );
}
