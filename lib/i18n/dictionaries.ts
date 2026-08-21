import hr from "./dictionaries/hr.json";
import en from "./dictionaries/en.json";
import it from "./dictionaries/it.json";
import pl from "./dictionaries/pl.json";

import type { Locale } from "./config";

/**
 * UI copy that is not CMS content — nav/breadcrumb chrome, form labels and
 * messages, error/empty states. CMS-authored text (page titles, body copy)
 * comes from Payload's own `localized` fields instead, see `lib/api.ts`.
 *
 * `hr` is the shape every other dictionary is asserted against, so a key
 * missing from `en`/`it`/`pl` is a type error here rather than a blank
 * string in production.
 *
 * Deliberately not `server-only`: `app/[lang]/error.tsx` is a Client
 * Component (Next requires error boundaries to be) with no route params of
 * its own, so it reads the locale from `LocaleProvider` and looks its
 * dictionary up itself. The JSON is a few KB of plain strings — fine to ship
 * to the client on the rare page that needs it that way.
 */
const dictionaries = { hr, en, it, pl } satisfies Record<Locale, typeof hr>;

/**
 * Carries `locale` alongside the copy itself, so a component that already
 * receives `dict` (nearly everything that needs strings also needs to know
 * which language it's rendering — date formatting, `hreflang`, …) doesn't
 * need a second prop threaded next to it just for the locale code.
 */
export type Dictionary = (typeof hr) & { locale: Locale };

export function getDictionary(locale: Locale): Dictionary {
  return { ...dictionaries[locale], locale };
}
