import type { Metadata } from "next";

import { NewsArchive } from "@/components/news/NewsArchive";
import { PageHeader } from "@/components/ui/PageHeader";
import { getNewsPage, getNewsPaginated } from "@/lib/api";
import { imageUrl } from "@/lib/media";
import { ROUTES } from "@/lib/routes";
import { buildBreadcrumbJsonLd, buildSeoMetadata, serializeJsonLd } from "@/lib/seo";

export const revalidate = 60;

const FALLBACK = {
  title: "Župne vijesti",
  eyebrow: "Iz župe",
  intro:
    "Obavijesti, najave i izvještaji iz života župe sv. Marka na Neslanovcu.",
  emptyMessage: "Trenutno nema objavljenih vijesti.",
};

export async function generateMetadata(): Promise<Metadata> {
  const page = await getNewsPage().catch(() => null);

  return buildSeoMetadata({
    title: page?.metaTitle || page?.title || FALLBACK.title,
    description: page?.metaDescription || page?.intro || FALLBACK.intro,
    path: ROUTES.news,
    imageUrl: imageUrl(page?.heroImage),
  });
}

export default async function NewsIndexPage() {
  const page = await getNewsPage().catch(() => null);

  // `perPage` is the office's own setting; nine fills the three-up grid evenly.
  const perPage = page?.perPage || 9;
  const firstPage = await getNewsPaginated({ page: 1, limit: perPage }).catch(
    () => null,
  );
  const news = firstPage?.docs ?? [];

  const jsonLd = buildBreadcrumbJsonLd([
    { name: "Naslovnica", href: ROUTES.home },
    { name: page?.title || FALLBACK.title, href: ROUTES.news },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <PageHeader
        eyebrow={page?.eyebrow || FALLBACK.eyebrow}
        title={page?.title || FALLBACK.title}
        intro={page?.intro || FALLBACK.intro}
        image={page?.heroImage}
        breadcrumb={[{ label: "Vijesti", href: ROUTES.news }]}
      />

      <section className="shell py-16 lg:py-24">
        {news.length ? (
          <NewsArchive
            initial={news}
            perPage={perPage}
            hasMore={Boolean(firstPage?.hasNextPage)}
          />
        ) : (
          <p className="max-w-xl text-[1.05rem] text-ink-500">
            {page?.emptyMessage || FALLBACK.emptyMessage}
          </p>
        )}
      </section>
    </>
  );
}
