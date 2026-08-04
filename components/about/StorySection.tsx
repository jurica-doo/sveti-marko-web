import Image from "next/image";

import { Reveal } from "@/components/ui/Reveal";
import { imageUrl } from "@/lib/media";
import { RichTextRenderer } from "@/lib/richtext";
import type { MediaImageType, RichText } from "@/lib/types";

/**
 * Text-and-image block used three times on the About page (parish, church,
 * patron). `flip` alternates the image side so the page reads as a rhythm.
 */
export function StorySection({
  eyebrow,
  title,
  meta,
  body,
  image,
  flip = false,
  tone = "light",
}: {
  eyebrow?: string | null;
  title?: string | null;
  meta?: string | null;
  body?: RichText;
  image?: MediaImageType | null;
  flip?: boolean;
  tone?: "light" | "muted";
}) {
  if (!title && !body) return null;

  const source = imageUrl(image);

  return (
    <section
      className={`py-16 lg:py-24 ${tone === "muted" ? "bg-stone-100" : ""}`}
    >
      <div className="shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {source ? (
          <Reveal
            className={`relative aspect-[4/3] w-full overflow-hidden bg-stone-200 ${
              flip ? "lg:order-2" : ""
            }`}
          >
            <Image
              src={source}
              alt={image?.alt || title || ""}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </Reveal>
        ) : null}

        <Reveal delay={0.08} className={flip ? "lg:order-1" : ""}>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}

          {title ? (
            <h2 className="mt-5 text-[1.9rem] leading-[1.18] text-ink-900 sm:text-[2.35rem]">
              {title}
            </h2>
          ) : null}

          {meta ? (
            <p className="mt-4 inline-flex border border-brass-500/40 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brass-600">
              {meta}
            </p>
          ) : null}

          <div className="mt-6">
            <RichTextRenderer content={body} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
