import type { Metadata } from "next";

import { Hero } from "@/components/home/Hero";
import { LinksSection } from "@/components/home/LinksSection";
import { NewsSection } from "@/components/home/NewsSection";
import { OfficeSection } from "@/components/home/OfficeSection";
import { QuoteBand } from "@/components/home/QuoteBand";
import {
  getHomePage,
  getNews,
  getSchedule,
  getUsefulLinks,
} from "@/lib/api";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { hasLocale } from "@/lib/i18n/config";
import { buildSeoMetadata } from "@/lib/seo";
import { ROUTES } from "@/lib/routes";
import { imageUrl } from "@/lib/media";
import { notFound } from "next/navigation";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const home = await getHomePage(lang).catch(() => null);

  return buildSeoMetadata({
    title: home?.metaTitle || "Župa sv. Marka Evanđelista — Neslanovac, Split",
    absoluteTitle: true,
    description: home?.metaDescription || home?.hero?.subtitle,
    path: ROUTES.home,
    locale: lang,
    imageUrl: imageUrl(home?.hero?.image),
  });
}

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);

  // The parish's own structured data is emitted once by the layout, so this
  // page only fetches what it renders.
  const [home, schedule, news, links] = await Promise.all([
    getHomePage(lang),
    getSchedule(lang).catch(() => null),
    getNews(lang, { limit: 12, featuredFirst: true }).catch(() => []),
    getUsefulLinks(lang).catch(() => []),
  ]);

  const newsCount = home.newsSection?.count ?? 3;

  return (
    <>
      <Hero home={home} schedule={schedule} dict={dict} />
      <OfficeSection section={home.officeSection} schedule={schedule} dict={dict} />
      <NewsSection
        section={home.newsSection}
        news={news.slice(0, newsCount)}
        dict={dict}
      />
      <QuoteBand quote={home.quote} />
      <LinksSection section={home.linksSection} links={links} dict={dict} />
    </>
  );
}
