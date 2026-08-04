import type { Metadata } from "next";

import { NewsCard } from "@/components/news/NewsCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getNews, getNewsPage } from "@/lib/api";
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
  const [page, news] = await Promise.all([
    getNewsPage().catch(() => null),
    getNews({ limit: 200 }).catch(() => []),
  ]);

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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((item, index) => (
              <Reveal
                key={item.id}
                delay={(index % 3) * 0.08}
                className="h-full"
              >
                <NewsCard news={item} priority={index < 3} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="max-w-xl text-[1.05rem] text-ink-500">
            {page?.emptyMessage || FALLBACK.emptyMessage}
          </p>
        )}
      </section>
    </>
  );
}
