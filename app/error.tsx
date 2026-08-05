"use client";

import { useEffect } from "react";

import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { StatusPage } from "@/components/ui/StatusPage";
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
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only handle on the server-side stack, which Next
    // deliberately withholds from the browser.
    console.error("Page failed to render:", error);
  }, [error]);

  return (
    <StatusPage
      eyebrow="Greška"
      title="Nešto nam je zapelo"
      actions={
        <>
          <button
            type="button"
            onClick={reset}
            className={`${buttonClasses("solid")} cursor-pointer`}
          >
            Pokušaj ponovo
          </button>
          <ButtonLink href={ROUTES.home} variant="outline">
            Naslovnica
          </ButtonLink>
        </>
      }
    >
      <p>
        Greška je na našoj strani, ne na vašoj — svijeća je na trenutak
        zatreperila. Pokušajte ponovo, obično je to dovoljno.
      </p>
      <p className="mt-4">
        Ako se ponovi, javite se župnom uredu i reći ćemo onima koji ovo
        održavaju.
      </p>
      {error.digest ? (
        <p className="mt-6 text-[0.8rem] text-ink-400">
          Oznaka greške: {error.digest}
        </p>
      ) : null}
    </StatusPage>
  );
}
