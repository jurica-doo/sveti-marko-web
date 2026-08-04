import type { Metadata } from "next";

import { Hero } from "@/components/home/Hero";
import { LinksSection } from "@/components/home/LinksSection";
import { NewsSection } from "@/components/home/NewsSection";
import { OfficeSection } from "@/components/home/OfficeSection";
import { QuoteBand } from "@/components/home/QuoteBand";
import {
  getContactPage,
  getHomePage,
  getNews,
  getSchedule,
  getUsefulLinks,
} from "@/lib/api";
import { buildBusinessJsonLd, buildSeoMetadata, serializeJsonLd } from "@/lib/seo";
import { ROUTES } from "@/lib/routes";
import { imageUrl } from "@/lib/media";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const home = await getHomePage().catch(() => null);

  return buildSeoMetadata({
    title: home?.metaTitle || "Župa sv. Marka Evanđelista — Neslanovac, Split",
    absoluteTitle: true,
    description: home?.metaDescription || home?.hero?.subtitle,
    path: ROUTES.home,
    imageUrl: imageUrl(home?.hero?.image),
  });
}

export default async function Home() {
  const [home, schedule, news, links, contact] = await Promise.all([
    getHomePage(),
    getSchedule().catch(() => null),
    getNews({ limit: 12, featuredFirst: true }).catch(() => []),
    getUsefulLinks().catch(() => []),
    getContactPage().catch(() => null),
  ]);

  const newsCount = home.newsSection?.count ?? 3;

  const jsonLd = buildBusinessJsonLd({
    phone: contact?.contact?.phone ?? undefined,
    email: contact?.contact?.email ?? undefined,
    address: contact?.contact
      ? `${contact.contact.street}, ${contact.contact.postalCode} ${contact.contact.city}`
      : undefined,
    workingHours: (schedule?.officeHours ?? []).map((row) => ({
      day: row.day,
      hours: row.hours,
    })),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <Hero home={home} schedule={schedule} />
      <OfficeSection section={home.officeSection} schedule={schedule} />
      <NewsSection
        section={home.newsSection}
        news={news.slice(0, newsCount)}
      />
      <QuoteBand quote={home.quote} />
      <LinksSection section={home.linksSection} links={links} />
    </>
  );
}
