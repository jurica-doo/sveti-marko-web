import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContactForm } from "@/components/contact/ContactForm";
import { MapEmbed } from "@/components/contact/MapEmbed";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";
import { getContactPage, getSchedule } from "@/lib/api";
import { bindTimeRanges, telHref } from "@/lib/format";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ROUTES, safeHttpUrl } from "@/lib/routes";
import { buildBreadcrumbJsonLd, buildSeoMetadata, serializeJsonLd } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const page = await getContactPage(lang).catch(() => null);

  return buildSeoMetadata({
    title: page?.metaTitle || page?.title || "Kontakt",
    // A CMS "SEO naslov" is the editor's complete search-result title and
    // already names the parish, so it skips the layout's `%s — parish`
    // template. Falling back to the page's own heading does not.
    absoluteTitle: Boolean(page?.metaTitle),
    description: page?.metaDescription || page?.intro,
    path: ROUTES.contact,
    locale: lang,
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);

  const [page, schedule] = await Promise.all([
    getContactPage(lang),
    getSchedule(lang).catch(() => null),
  ]);

  const contact = page.contact;
  // Both go straight into the page — an iframe and a raw link — so only
  // http(s) URLs are rendered; anything else from the CMS is dropped.
  const mapEmbedUrl = safeHttpUrl(page.map?.embedUrl);
  const mapDirectionsUrl = safeHttpUrl(page.map?.directionsUrl);

  // Only the trail — the parish entity itself is emitted once, by the layout.
  const jsonLd = buildBreadcrumbJsonLd(
    [
      { name: dict.breadcrumb.home, href: ROUTES.home },
      { name: page.title, href: ROUTES.contact },
    ],
    lang,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <PageHeader
        eyebrow={page.eyebrow}
        title={page.title}
        intro={page.intro}
        image={page.heroImage}
        breadcrumb={[{ label: dict.contactPage.breadcrumbTitle, href: ROUTES.contact }]}
        dict={dict}
      />

      <section className="shell py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <Reveal className="flex flex-col lg:col-span-5">
            <p className="eyebrow">
              {contact.parishOfficeName || dict.footer.office}
            </p>

            <address className="mt-7 not-italic">
              <p className="font-display text-[1.7rem] leading-snug text-ink-900">
                {contact.street}
              </p>
              <p className="mt-1 text-[1.05rem] text-ink-500">
                {contact.postalCode} {contact.city}
                {contact.country ? `, ${contact.country}` : ""}
              </p>

              <dl className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
                {contact.phone ? (
                  <Row label={dict.contactPage.phoneLabel}>
                    <a
                      href={telHref(contact.phone)}
                      className="text-sea-800 transition-colors hover:text-brass-600"
                    >
                      {contact.phone}
                    </a>
                  </Row>
                ) : null}
                {contact.mobile ? (
                  <Row label={dict.contactPage.mobileLabel}>
                    <a
                      href={telHref(contact.mobile)}
                      className="text-sea-800 transition-colors hover:text-brass-600"
                    >
                      {contact.mobile}
                    </a>
                  </Row>
                ) : null}
                {contact.email ? (
                  <Row label={dict.contactPage.emailLabel}>
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-sea-800 transition-colors hover:text-brass-600"
                    >
                      {contact.email}
                    </a>
                  </Row>
                ) : null}
                {contact.iban ? (
                  <Row label={dict.contactPage.ibanLabel}>{contact.iban}</Row>
                ) : null}
                {contact.oib ? (
                  <Row label={dict.contactPage.oibLabel}>{contact.oib}</Row>
                ) : null}
              </dl>
            </address>

            {schedule?.officeHours?.length ? (
              <div className="mt-10">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-brass-600">
                  {dict.contactPage.officeHoursLabel}
                </p>
                <dl className="mt-5 divide-y divide-stone-200">
                  {schedule.officeHours.map((row, index) => (
                    <div
                      key={row.id ?? `${row.day}-${index}`}
                      className="flex items-baseline justify-between gap-5 py-3"
                    >
                      <dt className="text-[0.95rem] text-ink-700">{row.day}</dt>
                      <dd className="text-right font-display text-[1.1rem] leading-tight text-ink-900">
                        {bindTimeRanges(row.hours)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {/*
              The map sits here rather than in a band of its own further down: a
              full-width section below only repeated the address directly above
              it.

              From `lg` up it can also absorb slack: the column is a flex stack
              and the map is the one element allowed to grow, so when the form
              opposite is the taller of the two the map stretches to meet it and
              both bottom edges land on the same line.

              Below `lg` they stack with nothing to line up against, so the
              fixed ratio stays and neither grows.
            */}
            {mapEmbedUrl ? (
              <div className="mt-10 flex flex-col lg:flex-1">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-brass-600">
                  {dict.contactPage.directionsLabel}
                </p>

                <MapEmbed
                  src={mapEmbedUrl}
                  title={dict.contactPage.mapTitle}
                  labels={{
                    notice: dict.contactPage.mapNotice,
                    show: dict.contactPage.mapShow,
                    privacy: dict.privacy.linkLabel,
                  }}
                />

                {mapDirectionsUrl ? (
                  <a
                    href={mapDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mt-4 inline-flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-sea-800 transition-colors hover:text-brass-600"
                  >
                    {dict.contactPage.openInMaps}
                    <span
                      aria-hidden="true"
                      className="indicator group-hover:translate-x-1 group-hover:-translate-y-1"
                    >
                      ↗
                    </span>
                  </a>
                ) : null}
              </div>
            ) : null}
          </Reveal>

          {/*
            The full schedule lives on its own page now, so this column carries
            the form instead — beside the address it belongs with — and a short
            pointer to Raspored for anyone who came here looking for times.
          */}
          <div className="flex flex-col gap-8 lg:col-span-7">
            <Reveal delay={0.1}>
              <SmartLink
                href={ROUTES.schedulePage}
                className="group block border border-brass-500/35 bg-brass-100/50 px-6 py-7 transition-colors hover:border-brass-500/70 lg:px-8"
              >
                <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-brass-600 uppercase">
                  {dict.schedulePage.breadcrumbTitle}
                </p>
                <p className="mt-3 font-display text-[1.45rem] leading-tight text-ink-900">
                  {dict.contactPage.scheduleCardTitle}
                </p>
                <p className="mt-2 max-w-lg text-[0.95rem] leading-relaxed text-ink-500">
                  {dict.contactPage.scheduleCardText}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-[0.78rem] font-semibold tracking-[0.16em] text-sea-800 uppercase transition-colors group-hover:text-brass-600">
                  {dict.contactPage.scheduleCardLink}
                  <span aria-hidden="true" className="indicator group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </SmartLink>
            </Reveal>

            <ContactForm whatsappNumber={contact.mobile || contact.phone} dict={dict} />
          </div>
        </div>
      </section>
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 py-3.5">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </dt>
      <dd className="text-[1rem] text-ink-900">{children}</dd>
    </div>
  );
}
