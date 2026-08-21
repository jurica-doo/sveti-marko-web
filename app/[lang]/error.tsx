"use client";

import { useEffect } from "react";

import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { StatusPage } from "@/components/ui/StatusPage";
import { useLocale } from "@/lib/i18n/context";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ROUTES } from "@/lib/routes";

/**
 * Anything that throws while rendering a page.
 *
 * This boundary sits inside the root layout, so the header and footer stay put
 * and only the page area is replaced — a visitor keeps the navigation and can
 * carry on rather than being dropped onto a bare screen.
 *
 * `reset()` re-renders the segment that failed. For a transient fault — the CMS
 * briefly unreachable, which is the likeliest cause here — that alone fixes it,
 * so it is the first thing offered.
 *
 * Reads the locale from context rather than `params` — an error boundary has
 * no route params of its own — which is exactly what `LocaleProvider` is for.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const s = getDictionary(locale).status.error;

  useEffect(() => {
    // The digest is the only handle on the server-side stack, which Next
    // deliberately withholds from the browser.
    console.error("Page failed to render:", error);
  }, [error]);

  return (
    <StatusPage
      eyebrow={s.eyebrow}
      title={s.title}
      actions={
        <>
          <button
            type="button"
            onClick={reset}
            className={`${buttonClasses("solid")} cursor-pointer`}
          >
            {s.retry}
          </button>
          <ButtonLink href={ROUTES.home} variant="outline">
            {s.home}
          </ButtonLink>
        </>
      }
    >
      <p>{s.body1}</p>
      <p className="mt-4">{s.body2}</p>
      {error.digest ? (
        <p className="mt-6 text-[0.8rem] text-ink-400">
          {s.errorCode} {error.digest}
        </p>
      ) : null}
    </StatusPage>
  );
}
