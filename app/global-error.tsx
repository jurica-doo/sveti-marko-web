"use client";

import { useEffect } from "react";

import "./globals.css";

/**
 * The last resort: an error thrown by the root layout itself.
 *
 * Because the layout is what failed, this replaces it — which is why it renders
 * its own `<html>` and `<body>`. Nothing above it is available.
 *
 * Deliberately standalone. It shares no components with the rest of the site
 * and only borrows the stylesheet: if a shared module is what broke, an error
 * page built out of shared modules breaks with it, and the visitor gets a blank
 * screen instead of an explanation. The fonts are loaded by the missing layout,
 * so the type falls back to the serif and sans already named in `--font-display`
 * and `--font-sans`.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout failed to render:", error);
  }, [error]);

  return (
    <html lang="hr">
      <body className="bg-stone-50 text-ink-800 antialiased">
        <main className="shell flex min-h-dvh flex-col items-center justify-center py-24 text-center">
          <p className="eyebrow">Greška</p>

          <h1 className="mt-6 max-w-xl font-display text-[2.2rem] leading-tight text-ink-900 sm:text-[2.8rem]">
            Stranica se nije uspjela otvoriti
          </h1>

          <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-ink-500">
            Ovo je rijetko i gotovo sigurno prolazno — pokušajte osvježiti
            stranicu. Ako i dalje ne radi, javite se župnom uredu.
          </p>

          <div className="mt-9">
            <button
              type="button"
              onClick={reset}
              className="hover-lift inline-flex cursor-pointer items-center justify-center bg-sea-800 px-6 py-3 text-[0.78rem] font-semibold tracking-[0.16em] text-stone-50 uppercase hover:bg-sea-700"
            >
              Osvježi stranicu
            </button>
          </div>

          {error.digest ? (
            <p className="mt-6 text-[0.8rem] text-ink-400">
              Oznaka greške: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
