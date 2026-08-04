import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { Gallery } from "@/components/news/Gallery";
import { NewsCard } from "@/components/news/NewsCard";
import { ArrowLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";
import { getNews, getNewsBySlug } from "@/lib/api";
import { formatDateLong, isoDate } from "@/lib/format";
import { imageUrl } from "@/lib/media";
import { RichTextRenderer } from "@/lib/richtext";
import { absoluteUrl, ROUTES } from "@/lib/routes";
import { buildSeoMetadata, serializeJsonLd } from "@/lib/seo";
import type { NewsType } from "@/lib/types";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const news = await getNews({ limit: 200 }).catch(() => []);
  return news
    .filter((item) => Boolean(item.slug))
    .map((item) => ({ slug: item.slug as string }));
}

function categoryTitle(news: NewsType): string | null {
  const category = news.category;
  if (!category || typeof category === "number") return null;
  return category.title ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const news = await getNewsBySlug(slug).catch(() => null);

  if (!news) {
    return buildSeoMetadata({
      title: "Vijest nije pronađena",
      path: ROUTES.newsDetail(slug),
    });
  }

  return buildSeoMetadata({
    title: news.title,
    description: news.excerpt,
    path: ROUTES.newsDetail(slug),
    imageUrl: imageUrl(news.coverImage),
    imageAlt: news.coverImage?.alt,
    type: "article",
  });
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const news = await getNewsBySlug(slug).catch(() => null);

  if (!news) notFound();

  const all = await getNews({ limit: 12 }).catch(() => []);
  const related = all.filter((item) => item.id !== news.id).slice(0, 3);

  const cover = imageUrl(news.coverImage);
  const category = categoryTitle(news);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: news.title,
    description: news.excerpt,
    datePublished: news.publishedAt,
    dateModified: news.updatedAt,
    mainEntityOfPage: absoluteUrl(ROUTES.newsDetail(slug)),
    ...(news.author ? { author: { "@type": "Organization", name: news.author } } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <article>
        <header className="bg-ink-900 pt-14 pb-16 lg:pt-20 lg:pb-20">
          <div className="shell">
            <nav aria-label="Staza" className="mb-8">
              <ol className="flex flex-wrap items-center gap-2 text-[0.72rem] uppercase tracking-[0.14em] text-stone-200/55">
                <li>
                  <SmartLink
                    href={ROUTES.home}
                    className="transition-colors hover:text-brass-300"
                  >
                    Naslovnica
                  </SmartLink>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-brass-500/60">
                    /
                  </span>
                  <SmartLink
                    href={ROUTES.news}
                    className="transition-colors hover:text-brass-300"
                  >
                    Vijesti
                  </SmartLink>
                </li>
              </ol>
            </nav>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-brass-300">
              <time dateTime={isoDate(news.publishedAt)}>
                {formatDateLong(news.publishedAt)}
              </time>
              {category ? (
                <>
                  <span aria-hidden="true" className="text-brass-500/50">
                    ·
                  </span>
                  <span>{category}</span>
                </>
              ) : null}
            </div>

            <h1 className="mt-6 max-w-4xl text-[2.1rem] leading-[1.14] text-stone-50 sm:text-[2.9rem]">
              {news.title}
            </h1>

            <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-stone-200/80">
              {news.excerpt}
            </p>
          </div>
        </header>

        <div className="shell">
          {cover ? (
            <Reveal className="relative -mt-10 aspect-[16/9] w-full overflow-hidden bg-stone-100 lg:-mt-14">
              <Image
                src={cover}
                alt={news.coverImage?.alt || news.title}
                fill
                priority
                sizes="(min-width: 1280px) 78rem, 100vw"
                className="object-cover"
              />
            </Reveal>
          ) : null}

          <div className="mx-auto max-w-3xl py-14 lg:py-20">
            <RichTextRenderer content={news.content} />

            {news.gallery?.length ? <Gallery items={news.gallery} /> : null}

            {news.author ? (
              <p className="mt-12 border-t border-stone-200 pt-6 text-[0.85rem] text-ink-400">
                {news.author}
              </p>
            ) : null}

            <div className="mt-10">
              <ArrowLink href={ROUTES.news}>Sve vijesti</ArrowLink>
            </div>
          </div>
        </div>
      </article>

      {related.length ? (
        <section className="bg-stone-100 py-16 lg:py-24">
          <div className="shell">
            <p className="eyebrow">Još iz župe</p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item, index) => (
                <Reveal key={item.id} delay={index * 0.08} className="h-full">
                  <NewsCard news={item} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
