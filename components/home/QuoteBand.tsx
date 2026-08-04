import Image from "next/image";

import { Reveal } from "@/components/ui/Reveal";
import { imageUrl } from "@/lib/media";
import type { HomePageType } from "@/lib/types";

export function QuoteBand({ quote }: { quote: HomePageType["quote"] }) {
  if (!quote?.enabled || !quote.text) return null;

  const background = imageUrl(quote.image);

  return (
    <section className="relative overflow-hidden bg-ink-900 py-24 lg:py-32">
      {background ? (
        <>
          <Image
            src={background}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-ink-900/60" />
        </>
      ) : null}

      <div className="shell relative text-center">
        <Reveal>
          <span
            aria-hidden="true"
            className="font-display text-[3.5rem] leading-none text-brass-500/60"
          >
            ”
          </span>
          <blockquote className="mx-auto mt-2 max-w-3xl font-display text-[1.75rem] leading-[1.35] text-stone-50 sm:text-[2.25rem]">
            {quote.text}
          </blockquote>
          {quote.source ? (
            <p className="mt-7 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-brass-300">
              {quote.source}
            </p>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
