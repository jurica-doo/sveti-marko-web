import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SmartLink } from "@/components/ui/SmartLink";
import type { HomePageType, UsefulLinkType } from "@/lib/types";

const GROUP_LABELS: Record<string, string> = {
  crkva: "Crkva u Hrvatskoj",
  duhovnost: "Duhovnost i mediji",
  zajednica: "Zajednica i mjesto",
};

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
}: {
  section: HomePageType["linksSection"];
  links: UsefulLinkType[];
}) {
  const visible = links.filter((link) => link.featuredOnHome !== false);
  if (!visible.length) return null;

  return (
    <section className="shell py-20 lg:py-28">
      <SectionHeading
        eyebrow={section?.eyebrow || "Poveznice"}
        title={section?.title || "Gdje dalje"}
        intro={section?.intro}
      />

      <ul className="mt-12 grid gap-px bg-stone-200 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((link, index) => (
          <Reveal key={link.id} as="li" delay={index * 0.05}>
            <SmartLink
              href={link.url}
              className="card-hover group flex h-full flex-col bg-stone-50 p-7 hover:bg-stone-100"
            >
              <span className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-brass-600">
                {GROUP_LABELS[link.group ?? "crkva"] ?? "Poveznica"}
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
      </ul>
    </section>
  );
}
