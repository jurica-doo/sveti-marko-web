import type { ReactNode } from "react";

/**
 * The shell both dead-end pages share — not found, and something broke.
 *
 * One component so the two cannot drift apart: a visitor who hits both in a
 * session should feel they are on the same site each time, not on two different
 * error screens someone wrote months apart.
 *
 * The church mark sits above the text in stone rather than an outsized "404".
 * A large error number is the loudest thing on a page whose whole job is to be
 * reassuring.
 */
export function StatusPage({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <section className="shell flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
      <span
        aria-hidden="true"
        className="brand-mark h-16 w-16 shrink-0 text-stone-300"
      />

      <p className="eyebrow mt-8">{eyebrow}</p>

      <h1 className="mt-6 max-w-xl text-[2.2rem] leading-tight text-ink-900 sm:text-[2.8rem]">
        {title}
      </h1>

      <div className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-ink-500">
        {children}
      </div>

      <div className="mt-9 flex flex-wrap justify-center gap-3">{actions}</div>
    </section>
  );
}
