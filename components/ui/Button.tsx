import type { ReactNode } from "react";

import { SmartLink } from "./SmartLink";

type Variant = "solid" | "outline" | "ghost" | "light";

const BASE =
  "hover-lift inline-flex items-center justify-center gap-2 px-6 py-3 text-[0.78rem] font-semibold uppercase tracking-[0.16em]";

const VARIANTS: Record<Variant, string> = {
  solid: "bg-sea-800 text-stone-50 hover:bg-sea-700",
  outline:
    "border border-ink-900/25 text-ink-900 hover:border-brass-500 hover:text-brass-600",
  ghost: "text-sea-800 hover:text-brass-600 px-0 py-0",
  light:
    "border border-stone-50/40 text-stone-50 hover:border-brass-300 hover:text-brass-300 backdrop-blur-sm",
};

export function ButtonLink({
  href,
  children,
  variant = "solid",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <SmartLink href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </SmartLink>
  );
}

/** Text link with the brass arrow used to close every section. */
export function ArrowLink({
  href,
  children,
  tone = "dark",
}: {
  href: string;
  children: ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <SmartLink
      href={href}
      className={`group inline-flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.16em] transition-colors ${
        tone === "light"
          ? "text-brass-300 hover:text-stone-50"
          : "text-sea-800 hover:text-brass-600"
      }`}
    >
      {children}
      <span
        aria-hidden="true"
        className="indicator group-hover:translate-x-1.5"
      >
        →
      </span>
    </SmartLink>
  );
}
