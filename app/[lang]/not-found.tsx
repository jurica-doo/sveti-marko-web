import { lang } from "next/root-params";
import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/Button";
import { StatusPage } from "@/components/ui/StatusPage";
import { DEFAULT_LOCALE, hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ROUTES } from "@/lib/routes";

/**
 * `not-found.js` takes no props at all (see Next's file-conventions docs), so
 * unlike every other page here the locale can't come from `params` — it's
 * read via `next/root-params` instead, the mechanism Next 16.3 added
 * specifically for a root dynamic segment like `app/[lang]` to be reachable
 * from files that have no `params` of their own.
 */
async function currentDictionary() {
  const value = await lang();
  return getDictionary(hasLocale(value) ? value : DEFAULT_LOCALE);
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await currentDictionary();
  return {
    title: dict.status.notFound.metaTitle,
    // A missing page should not be indexed, but the links on it are worth following.
    robots: { index: false, follow: true },
  };
}

export default async function NotFound() {
  const dict = await currentDictionary();
  const s = dict.status.notFound;

  return (
    <StatusPage
      eyebrow={s.eyebrow}
      title={s.title}
      actions={
        <>
          <ButtonLink href={ROUTES.home}>{s.home}</ButtonLink>
          <ButtonLink href={ROUTES.news} variant="outline">
            {s.news}
          </ButtonLink>
        </>
      }
    >
      <p>{s.body1}</p>
      <p className="mt-4">{s.body2}</p>
    </StatusPage>
  );
}
