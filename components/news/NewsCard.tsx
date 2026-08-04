import Image from "next/image";

import { SmartLink } from "@/components/ui/SmartLink";
import { dateParts, isoDate } from "@/lib/format";
import { imageUrl } from "@/lib/media";
import { ROUTES } from "@/lib/routes";
import type { NewsType } from "@/lib/types";

function categoryTitle(news: NewsType): string | null {
  const category = news.category;
  if (!category || typeof category === "number") return null;
  return category.title ?? null;
}

export function NewsCard({
  news,
  priority = false,
}: {
  news: NewsType;
  priority?: boolean;
}) {
  const cover = imageUrl(news.coverImage);
  const parts = dateParts(news.publishedAt);
  const category = categoryTitle(news);
  const href = ROUTES.newsDetail(news.slug || String(news.id));

  return (
    <article className="card-hover group flex h-full flex-col bg-stone-50 ring-1 ring-stone-200 hover:ring-brass-500/60">
      <SmartLink href={href} className="flex h-full flex-col">
        <div className="relative aspect-16/10 overflow-hidden bg-stone-100">
          {cover ? (
            <Image
              src={cover}
              alt={news.coverImage?.alt || news.title}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-zoom group-hover:scale-[1.06]"
            />
          ) : null}

          {/* Date block, set like a cornerstone inscription. */}
          {parts ? (
            <time
              dateTime={isoDate(news.publishedAt)}
              className="absolute bottom-0 left-0 flex flex-col items-center bg-ink-900/90 px-4 py-3 text-stone-50 backdrop-blur-sm transition-colors group-hover:bg-sea-800/95"
            >
              <span className="font-display text-[1.6rem] leading-none">
                {parts.day}
              </span>
              <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-brass-300">
                {parts.month} {parts.year}
              </span>
            </time>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-6">
          {category ? (
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-brass-600">
              {category}
            </p>
          ) : null}

          <h3 className="mt-3 text-[1.35rem] leading-snug text-ink-900 transition-colors group-hover:text-sea-800">
            {news.title}
          </h3>

          <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-ink-500">
            {news.excerpt}
          </p>

          <span className="mt-6 inline-flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-sea-800 transition-colors group-hover:text-brass-600">
            Pročitaj više
            <span
              aria-hidden="true"
              className="indicator group-hover:translate-x-1.5"
            >
              →
            </span>
          </span>
        </div>
      </SmartLink>
    </article>
  );
}
