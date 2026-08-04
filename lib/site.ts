import { getContactPage, getSchedule, getSettings } from "./api";
import { ROUTES } from "./routes";
import type { ContactPageType, ScheduleType, SettingsType } from "./types";

/**
 * Chrome (header + footer) data.
 *
 * The layout renders on every route, so a CMS hiccup must not take the whole
 * site down — each global falls back to a static default and the page still
 * renders with working navigation.
 */

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

export async function getSiteChrome(): Promise<{
  settings: SettingsType;
  contact: ContactPageType | null;
  schedule: ScheduleType | null;
}> {
  const [settings, contact, schedule] = await Promise.all([
    getSettings().catch(() => FALLBACK_SETTINGS),
    getContactPage().catch(() => null),
    getSchedule().catch(() => null),
  ]);

  return {
    settings: settings?.siteName ? settings : FALLBACK_SETTINGS,
    contact,
    schedule,
  };
}
