"use client";

import { createContext, useContext, type ReactNode } from "react";

import { DEFAULT_LOCALE, type Locale } from "./config";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/**
 * Makes the active locale available to client components without prop-
 * drilling it through every leaf. Set once, in `app/[lang]/layout.tsx`,
 * from the `lang` route param — the one source of truth for which language
 * is being rendered.
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
