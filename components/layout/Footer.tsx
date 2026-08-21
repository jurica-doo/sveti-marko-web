import { SmartLink } from "@/components/ui/SmartLink";
import { bindTimeRanges, telHref } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ContactPageType, ScheduleType, SettingsType } from "@/lib/types";

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
};

function SocialIcon({ platform }: { platform: string }) {
  const paths: Record<string, string> = {
    facebook:
      "M13.5 9H15V6.5h-1.7c-2 0-3.1 1.2-3.1 3.2V11H8.5v2.5H10V19h2.6v-5.5h1.8l.3-2.5h-2.1V9.8c0-.6.2-.8.8-.8z",
    instagram:
      "M12 8.4a3.6 3.6 0 100 7.2 3.6 3.6 0 000-7.2zm0 5.9a2.3 2.3 0 110-4.6 2.3 2.3 0 010 4.6zM16.4 8.2a.84.84 0 11-1.68 0 .84.84 0 011.68 0z",
    youtube:
      "M18.5 9.2a1.7 1.7 0 00-1.2-1.2C16.2 7.7 12 7.7 12 7.7s-4.2 0-5.3.3A1.7 1.7 0 005.5 9.2 17.6 17.6 0 005.2 12c0 .95.08 1.9.3 2.8a1.7 1.7 0 001.2 1.2c1.1.3 5.3.3 5.3.3s4.2 0 5.3-.3a1.7 1.7 0 001.2-1.2c.22-.9.3-1.85.3-2.8s-.08-1.9-.3-2.8zM10.7 14.1V9.9l3.5 2.1z",
    whatsapp:
      "M12 5.5a6.4 6.4 0 00-5.5 9.7L5.6 19l3.9-1a6.4 6.4 0 102.5-12.5zm0 11.7a5.3 5.3 0 01-2.7-.7l-.2-.1-2.3.6.6-2.2-.1-.2a5.3 5.3 0 114.7 2.6z",
  };

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      {platform === "instagram" ? (
        <>
          <path d="M16.5 4.5h-9A3 3 0 004.5 7.5v9a3 3 0 003 3h9a3 3 0 003-3v-9a3 3 0 00-3-3zm1.7 12a1.7 1.7 0 01-1.7 1.7h-9a1.7 1.7 0 01-1.7-1.7v-9A1.7 1.7 0 017.5 5.8h9a1.7 1.7 0 011.7 1.7z" />
          <path d={paths.instagram} />
        </>
      ) : (
        <path d={paths[platform] ?? ""} />
      )}
    </svg>
  );
}

export function Footer({
  settings,
  contact,
  schedule,
  dict,
}: {
  settings: SettingsType;
  contact?: ContactPageType | null;
  schedule?: ScheduleType | null;
  dict: Dictionary;
}) {
  const year = new Date().getFullYear();
  const address = contact?.contact;
  const masses = (schedule?.masses ?? []).slice(0, 3);

  // No top margin on the footer. A margin there paints a strip of `body`
  // background above it, which is invisible while the section above happens to
  // be the same stone-50 — and a white band the moment it is not, as under the
  // tinted last section on the About page. Every page's final section already
  // carries 64-112px of its own bottom padding, so that padding is the gap and
  // the section's own colour runs all the way down to the brass rule.
  return (
    <footer className="bg-ink-900 text-stone-200/85">
      {/* Brass hairline — the same rule that heads every section on the site. */}
      <div className="h-px w-full bg-linear-to-r from-transparent via-brass-500/60 to-transparent" />

      <div className="shell grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <p className="font-display text-[1.6rem] leading-tight text-stone-50">
            {settings.siteName}
          </p>
          {settings.diocese ? (
            <p className="mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-brass-300">
              {settings.diocese}
            </p>
          ) : null}
          {settings.social?.length ? (
            <ul className="mt-7 flex items-center gap-3">
              {settings.social.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={SOCIAL_LABELS[item.platform] ?? item.platform}
                    className="hover-lift flex h-10 w-10 items-center justify-center border border-stone-50/15 text-stone-200/80 hover:border-brass-500 hover:text-brass-300"
                  >
                    <SocialIcon platform={item.platform} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {settings.footerColumns?.length
          ? settings.footerColumns.map((column, columnIndex) => (
              <div
                key={column.id ?? `${column.title}-${columnIndex}`}
                className="lg:col-span-2"
              >
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brass-300">
                  {column.title}
                </p>
                <ul className="mt-5 space-y-3">
                  {/* Several links can point at the same page (all three
                      "Raspored" entries open /kontakt/), so the row id is the
                      only unique key here. */}
                  {(column.links ?? []).map((link, linkIndex) => (
                    <li key={link.id ?? `${link.href}-${linkIndex}`}>
                      <SmartLink
                        href={link.href}
                        className="hover-nudge inline-block text-[0.95rem] text-stone-200/75 hover:text-brass-300"
                      >
                        {link.label}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          : null}

        <div className="lg:col-span-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brass-300">
            {dict.footer.office}
          </p>

          {address ? (
            <address className="mt-5 space-y-1 text-[0.95rem] not-italic leading-relaxed text-stone-200/75">
              <p>{address.street}</p>
              <p>
                {address.postalCode} {address.city}
              </p>
              {address.phone ? (
                <p>
                  <a
                    href={telHref(address.phone)}
                    className="transition-colors hover:text-brass-300"
                  >
                    {address.phone}
                  </a>
                </p>
              ) : null}
              {address.email ? (
                <p>
                  <a
                    href={`mailto:${address.email}`}
                    className="transition-colors hover:text-brass-300"
                  >
                    {address.email}
                  </a>
                </p>
              ) : null}
            </address>
          ) : null}

          {/*
            Titled, because this block sits directly under the office address
            and its hours — without a label the two read as one list and the
            mass times look like opening times.
          */}
          {masses.length ? (
            <div className="mt-6 border-t border-stone-50/10 pt-5">
              <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-brass-300 uppercase">
                {dict.footer.masses}
              </p>

              <dl className="mt-3 space-y-1.5 text-[0.9rem]">
                {masses.map((row, index) => (
                  <div
                    key={row.id ?? `${row.day}-${index}`}
                    className="flex justify-between gap-4"
                  >
                    <dt className="text-stone-200/60">{row.day}</dt>
                    <dd className="text-right text-stone-50">
                      {bindTimeRanges(row.times)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-stone-50/10">
        <div className="shell flex flex-col gap-3 py-6 text-[0.8rem] text-stone-200/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.copyright || settings.siteName}
          </p>
          {/*
            Kontakt and O nama sat here as well as in the footer columns above
            and the main navigation — a third copy of the same two links. The
            studio credit is the only thing this row carries that appears
            nowhere else.
          */}
          <p>
            {dict.footer.creditPrefix}{" "}
            <SmartLink
              href="https://druid-forge.hr"
              className="hover-nudge inline-block text-stone-200/80 hover:text-brass-300"
            >
              Druid Forge
            </SmartLink>
          </p>
        </div>
      </div>
    </footer>
  );
}
