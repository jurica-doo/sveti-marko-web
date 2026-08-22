import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Gallery } from "@/components/news/Gallery";
import { NewsCard } from "@/components/news/NewsCard";
import { ArrowLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";
import { getNews, getNewsBySlug } from "@/lib/api";
import { formatDateLong, isoDate } from "@/lib/format";
import { hasLocale, LOCALE_META, LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { imageUrl } from "@/lib/media";
import { RichTextRenderer } from "@/lib/richtext";
import { absoluteUrl, ROUTES } from "@/lib/routes";
import {
  buildSeoMetadata,
  ENTITY_ID,
  resolveCmsImageUrl,
  serializeJsonLd,
} from "@/lib/seo";
import type { NewsType } from "@/lib/types";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  // News slugs are canonical across locales (see the CMS localization plan),
  // so each slug is combined with every language rather than fetched per-locale.
  const news = await getNews("hr", { limit: 200 }).catch(() => []);
  const slugs = news.filter((item) => Boolean(item.slug)).map((item) => item.slug as string);

  return LOCALES.flatMap((lang) => slugs.map((slug) => ({ lang, slug })));
}

function categoryTitle(news: NewsType): string | null {
  const category = news.category;
  if (!category || typeof category === "number") return null;
  return category.title ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  const news = await getNewsBySlug(slug, lang).catch(() => null);

  if (!news) {
    return buildSeoMetadata({
      title: dict.news.notFoundTitle,
      path: ROUTES.newsDetail(slug),
      locale: lang,
    });
  }

  return buildSeoMetadata({
    title: news.title,
    description: news.excerpt,
    path: ROUTES.newsDetail(slug),
    locale: lang,
    imageUrl: imageUrl(news.coverImage),
    imageAlt: news.coverImage?.alt,
    type: "article",
  });
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);

  const news = await getNewsBySlug(slug, lang).catch(() => null);

  if (!news) notFound();

  const all = await getNews(lang, { limit: 12 }).catch(() => []);
  const related = all.filter((item) => item.id !== news.id).slice(0, 3);

  const category = categoryTitle(news);

  const coverUrl = resolveCmsImageUrl(news.coverImage);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: news.title,
    description: news.excerpt,
    datePublished: news.publishedAt,
    dateModified: news.updatedAt,
    mainEntityOfPage: absoluteUrl(ROUTES.newsDetail(slug), lang),
    // Which language this particular article is written in — the same slug
    // exists in four, so without this they read as duplicates rather than
    // as translations of one another.
    inLanguage: LOCALE_META[lang].tag,
    ...(coverUrl ? { image: [coverUrl] } : {}),
    ...(category ? { articleSection: category } : {}),
    // `publisher` ranges over Organization/Person, so it points at the parish
    // as an institution — not at `#church`, which is the building (a Place).
    publisher: { "@id": ENTITY_ID.organization },
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
            <nav aria-label={dict.breadcrumb.trailAriaLabel} className="mb-8">
              <ol className="flex flex-wrap items-center gap-2 text-[0.72rem] uppercase tracking-[0.14em] text-stone-200/55">
                <li>
                  <SmartLink
                    href={ROUTES.home}
                    className="transition-colors hover:text-brass-300"
                  >
                    {dict.breadcrumb.home}
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
                    {dict.news.archiveTitle}
                  </SmartLink>
                </li>
              </ol>
            </nav>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-brass-300">
              <time dateTime={isoDate(news.publishedAt)}>
                {formatDateLong(news.publishedAt, lang)}
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
          <div className="mx-auto max-w-3xl py-14 lg:py-20">
            <RichTextRenderer content={news.content} />

            {news.gallery?.length ? <Gallery items={news.gallery} dict={dict} /> : null}

            {news.author ? (
              <p className="mt-12 border-t border-stone-200 pt-6 text-[0.85rem] text-ink-400">
                {news.author}
              </p>
            ) : null}

            <div className="mt-10">
              <ArrowLink href={ROUTES.news}>{dict.news.allNews}</ArrowLink>
            </div>
          </div>
        </div>
      </article>

      {related.length ? (
        <section className="bg-stone-100 py-16 lg:py-24">
          <div className="shell">
            <p className="eyebrow">{dict.news.moreFromParish}</p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item, index) => (
                <Reveal key={item.id} delay={index * 0.08} className="h-full">
                  <NewsCard news={item} dict={dict} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
