import { getContactPage, getSchedule, getSettings } from "./api";
import type { Locale } from "./i18n/config";
import type { Dictionary } from "./i18n/dictionaries";
import { ROUTES } from "./routes";
import type { ContactPageType, ScheduleType, SettingsType } from "./types";

/**
 * Chrome (header + footer) data.
 *
 * The layout renders on every route, so a CMS hiccup must not take the whole
 * site down — each global falls back to a static default and the page still
 * renders with working navigation.
 */

/** hr copy — a CMS outage always falls back to Croatian, same as the CMS's own defaultLocale. */
export const FALLBACK_SETTINGS: SettingsType = {
  siteName: "Župa sv. Marka Evanđelista",
  shortName: "Sv. Marko",
  tagline: "Neslanovac, Split",
  diocese: "Splitsko-makarska nadbiskupija",
  navigation: [
    { label: "Naslovnica", href: ROUTES.home },
    { label: "Vijesti", href: ROUTES.news },
    { label: "O nama", href: ROUTES.about },
    { label: "Kontakt", href: ROUTES.contact },
  ],
};

/** Same fallback nav, in the visitor's own language, keyed off the dictionary. */
export function fallbackSettings(dict: Dictionary): SettingsType {
  return {
    ...FALLBACK_SETTINGS,
    navigation: [
      { label: dict.nav.fallback.home, href: ROUTES.home },
      { label: dict.nav.fallback.schedule, href: ROUTES.schedulePage },
      { label: dict.nav.fallback.news, href: ROUTES.news },
      { label: dict.nav.fallback.about, href: ROUTES.about },
      { label: dict.nav.fallback.contact, href: ROUTES.contact },
    ],
  };
}

export async function getSiteChrome(
  locale: Locale,
  dict: Dictionary,
): Promise<{
  settings: SettingsType;
  contact: ContactPageType | null;
  schedule: ScheduleType | null;
}> {
  const fallback = fallbackSettings(dict);

  const [settings, contact, schedule] = await Promise.all([
    getSettings(locale).catch(() => fallback),
    getContactPage(locale).catch(() => null),
    getSchedule(locale).catch(() => null),
  ]);

  return {
    settings: settings?.siteName ? settings : fallback,
    contact,
    schedule,
  };
}
