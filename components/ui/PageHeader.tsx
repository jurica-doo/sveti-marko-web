import Image from "next/image";

import { SmartLink } from "@/components/ui/SmartLink";
import { imageUrl } from "@/lib/media";
import { ROUTES } from "@/lib/routes";
import type { MediaImageType } from "@/lib/types";

/**
 * Shared header for the inner pages. Keeps the dark band under the navbar so
 * the transparent-to-solid header transition only ever happens on the home page.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  image,
  breadcrumb,
}: {
  eyebrow?: string | null;
  title: string;
  intro?: string | null;
  image?: MediaImageType | null;
  breadcrumb?: { label: string; href: string }[];
}) {
  const background = imageUrl(image);

  return (
    <section className="relative overflow-hidden bg-ink-900">
      {background ? (
        <>
          <Image
            src={background}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-linear-to-b from-ink-900/70 to-ink-900/90" />
        </>
      ) : null}

      <div className="shell relative py-16 lg:py-24">
        {breadcrumb?.length ? (
          <nav aria-label="Staza" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[0.72rem] uppercase tracking-[0.14em] text-stone-200/55">
              <li>
                <SmartLink
                  href={ROUTES.home}
                  className="transition-colors hover:text-brass-300"
                >
                  Naslovnica
                </SmartLink>
              </li>
              {breadcrumb.map((crumb) => (
                <li key={crumb.href} className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-brass-500/60">
                    /
                  </span>
                  <SmartLink
                    href={crumb.href}
                    className="transition-colors hover:text-brass-300"
                  >
                    {crumb.label}
                  </SmartLink>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        {eyebrow ? <p className="eyebrow eyebrow-light">{eyebrow}</p> : null}

        <h1 className="mt-5 max-w-3xl text-[2.25rem] leading-[1.12] text-stone-50 sm:text-[3rem]">
          {title}
        </h1>

        {intro ? (
          <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-stone-200/80">
            {intro}
          </p>
        ) : null}
      </div>
    </section>
  );
}
