import { NewsCard } from "@/components/news/NewsCard";
import { ArrowLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ROUTES } from "@/lib/routes";
import type { HomePageType, NewsType } from "@/lib/types";

export function NewsSection({
  section,
  news,
}: {
  section: HomePageType["newsSection"];
  news: NewsType[];
}) {
  if (!news.length) return null;

  return (
    <section className="shell py-20 lg:py-28">
      <SectionHeading
        eyebrow={section?.eyebrow || "Iz župe"}
        title={section?.title || "Vijesti i obavijesti"}
        intro={section?.intro}
        action={
          <ArrowLink href={ROUTES.news}>
            {section?.ctaLabel || "Sve vijesti"}
          </ArrowLink>
        }
      />

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {news.map((item, index) => (
          <Reveal key={item.id} delay={index * 0.08} as="div" className="h-full">
            <NewsCard news={item} priority={index === 0} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
