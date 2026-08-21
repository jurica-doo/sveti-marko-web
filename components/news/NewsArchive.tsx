"use client";

import { useState } from "react";

import { NewsCard } from "@/components/news/NewsCard";
import { Reveal } from "@/components/ui/Reveal";
import { newsPagePath } from "@/lib/api";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { NewsType, PaginatedDocs } from "@/lib/types";

/**
 * The news archive, a page at a time.
 *
 * The first page is rendered on the server so the archive is complete for a
 * crawler and needs no JavaScript to be read. Later pages are fetched straight
 * from the CMS on click — the parish will keep adding news indefinitely, and
 * shipping every article on first paint would make the page slower every year.
 */
export function NewsArchive({
  initial,
  perPage,
  hasMore: initialHasMore,
  dict,
}: {
  initial: NewsType[];
  perPage: number;
  hasMore: boolean;
  dict: Dictionary;
}) {
  const [items, setItems] = useState(initial);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function loadMore() {
    if (loading) return;

    setLoading(true);
    setFailed(false);

    try {
      const next = page + 1;
      const res = await fetch(newsPagePath(dict.locale, { page: next, limit: perPage }));
      if (!res.ok) throw new Error(String(res.status));

      const data = (await res.json()) as PaginatedDocs<NewsType>;

      /*
       * Merge on id. A story published between the first render and this click
       * shifts everything down a place, which would otherwise send a duplicate
       * of the last card on page one back as the first card of page two.
       */
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...(data.docs ?? []).filter((d) => !seen.has(d.id))];
      });
      setPage(next);
      setHasMore(Boolean(data.hasNextPage));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <Reveal key={item.id} delay={(index % 3) * 0.08} className="h-full">
            <NewsCard news={item} priority={index < 3} dict={dict} />
          </Reveal>
        ))}

        {/*
          Placeholders in the shape of the cards they will become, so the grid
          grows to its final height as the request goes out rather than jumping
          when it returns.
        */}
        {loading
          ? Array.from({ length: perPage }, (_, index) => (
              <NewsCardSkeleton key={`skeleton-${index}`} />
            ))
          : null}
      </div>

      {hasMore ? (
        <div className="mt-12 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="hover-lift inline-flex cursor-pointer items-center justify-center border border-ink-900/25 px-7 py-3.5 text-[0.78rem] font-semibold tracking-[0.16em] text-ink-900 uppercase hover:border-brass-500 hover:text-brass-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? dict.news.loading : dict.news.loadMore}
          </button>

          {failed ? (
            <p role="alert" className="text-[0.85rem] text-[#8f2d2d]">
              {dict.news.loadFailed}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** The card's own proportions, in stone, while its content is on the way. */
function NewsCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col bg-stone-50 ring-1 ring-stone-200"
    >
      <div className="aspect-16/10 w-full bg-stone-200" />
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="h-2.5 w-24 bg-stone-200" />
        <div className="h-5 w-4/5 bg-stone-200" />
        <div className="h-3 w-full bg-stone-100" />
        <div className="h-3 w-5/6 bg-stone-100" />
      </div>
    </div>
  );
}
