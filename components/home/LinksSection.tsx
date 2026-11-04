import { LinksCarousel } from "@/components/home/LinksCarousel";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SmartLink } from "@/components/ui/SmartLink";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { HomePageType, UsefulLinkType } from "@/lib/types";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinksSection({
  section,
  links,
  dict,
}: {
  section: HomePageType["linksSection"];
  links: UsefulLinkType[];
  dict: Dictionary;
}) {
  const visible = links.filter((link) => link.featuredOnHome !== false);
  if (!visible.length) return null;

  const groupLabels = dict.home.linkGroups;

  return (
    <section className="shell py-20 lg:py-28">
      <SectionHeading
        eyebrow={section?.eyebrow || dict.home.linksEyebrow}
        title={section?.title || dict.home.linksTitle}
        intro={section?.intro}
      />

      <LinksCarousel
        count={visible.length}
        labels={{ prev: dict.home.linksPrev, next: dict.home.linksNext }}
      >
        {visible.map((link, index) => (
          <Reveal
            key={link.id}
            as="li"
            delay={index * 0.05}
            className="w-[82%] shrink-0 snap-start sm:w-auto"
          >
            <SmartLink
              href={link.url}
              // A real border in the phone row, not a ring: a ring is a box-shadow,
              // and the card's hover shadow would replace it. See `.card-in-row`.
              className="card-hover card-in-row group flex h-full flex-col border border-stone-200 bg-stone-50 p-7 hover:border-brass-500/60 hover:bg-stone-100 sm:border-0"
            >
              <span className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-brass-600">
                {groupLabels[link.group ?? "crkva"] ?? dict.home.linkFallbackLabel}
              </span>

              <span className="mt-4 flex items-start justify-between gap-4">
                <span className="font-display text-[1.25rem] leading-snug text-ink-900 transition-colors group-hover:text-sea-800">
                  {link.title}
                </span>
                <span
                  aria-hidden="true"
                  className="indicator mt-1 text-ink-400 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-brass-600"
                >
                  ↗
                </span>
              </span>

              {link.description ? (
                <span className="mt-3 flex-1 text-[0.92rem] leading-relaxed text-ink-500">
                  {link.description}
                </span>
              ) : null}

              <span className="mt-5 text-[0.78rem] text-ink-400">
                {hostname(link.url)}
              </span>
            </SmartLink>
          </Reveal>
        ))}
      </LinksCarousel>
    </section>
  );
}
