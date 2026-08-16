import Image from "next/image";

import { Reveal } from "@/components/ui/Reveal";
import { imageUrl } from "@/lib/media";
import { RichTextRenderer } from "@/lib/richtext";
import type { MediaImageType, RichText } from "@/lib/types";

/**
 * Text-and-image block used twice on the About page (parish, church). `flip`
 * alternates the image side so the page reads as a rhythm.
 *
 * `image` also takes a bare string — a path straight into `/public` — so a
 * section can ship with a real photograph before the CMS field behind it has
 * one uploaded. Once an editor sets the field, the CMS image wins.
 */
export function StorySection({
  eyebrow,
  title,
  meta,
  body,
  image,
  imageOrientation = "landscape",
  flip = false,
  tone = "light",
}: {
  eyebrow?: string | null;
  title?: string | null;
  meta?: string | null;
  body?: RichText;
  image?: MediaImageType | string | null;
  /**
   * "portrait" is for a photo that is genuinely taller than wide — the
   * statue in the parish section — rather than the usual wide shot. It gets
   * a matching 3:4 frame instead of the standard 4:3 one, and is capped
   * narrower so it doesn't tower over the text beside it.
   */
  imageOrientation?: "landscape" | "portrait";
  flip?: boolean;
  tone?: "light" | "muted";
}) {
  if (!title && !body) return null;

  const source = typeof image === "string" ? image : imageUrl(image);
  const alt = typeof image === "string" ? title || "" : image?.alt || title || "";
  const isPortrait = imageOrientation === "portrait";

  return (
    <section
      className={`py-16 lg:py-24 ${tone === "muted" ? "bg-stone-100" : ""}`}
    >
      <div className="shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {source ? (
          <Reveal
            className={`relative w-full overflow-hidden bg-stone-200 ${
              isPortrait ? "aspect-3/4 max-w-sm mx-auto lg:mx-0" : "aspect-4/3"
            } ${flip ? "lg:order-2" : ""}`}
          >
            <Image
              src={source}
              alt={alt}
              fill
              sizes={
                isPortrait ? "(min-width: 1024px) 24rem, 60vw" : "(min-width: 1024px) 50vw, 100vw"
              }
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
