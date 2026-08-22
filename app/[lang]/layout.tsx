import type { Metadata, Viewport } from "next";
import { Marcellus, Source_Sans_3 } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { MotionProvider } from "@/components/ui/MotionProvider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LocaleProvider } from "@/lib/i18n/context";
import { DEFAULT_LOCALE, hasLocale, LOCALES } from "@/lib/i18n/config";
import { buildSiteJsonLd, seoRootDefaults, serializeJsonLd } from "@/lib/seo";
import { imageUrl } from "@/lib/media";
import { toAbsoluteUrl } from "@/lib/site-url";
import { getSiteChrome } from "@/lib/site";

// Marcellus is cut from Roman inscriptional capitals — the same lettering that
// runs across church façades — and carries the display voice of the site.
const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-marcellus",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--font-source-sans",
  display: "swap",
});

/** Title template, description and brand names, in the language being served. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return seoRootDefaults(hasLocale(lang) ? lang : DEFAULT_LOCALE);
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101d26",
};

/** hr + en + it + pl, statically. `proxy.ts` rewrites bare paths to `/hr`. */
export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const { settings, contact, schedule } = await getSiteChrome(lang, dict);

  /*
   * The parish, its church building and this website — described once for
   * the whole site.
   *
   * It lives in the layout rather than on the home page so every URL a
   * searcher can land on carries the entity that identifies whose page it
   * is. The stable `@id`s mean all those copies are understood as one graph,
   * not a new set of entities per page.
   */
  const logo = imageUrl(settings.logo);
  const siteJsonLd = buildSiteJsonLd({
    locale: lang,
    contact: contact?.contact,
    diocese: settings.diocese,
    social: settings.social,
    directionsUrl: contact?.map?.directionsUrl,
    logoUrl: logo ? toAbsoluteUrl(logo) : null,
    officeHours: (schedule?.officeHours ?? []).map((row) => ({
      day: row.day,
      hours: row.hours,
    })),
  });

  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${marcellus.variable} ${sourceSans.variable} h-full`}
    >
      <head>
        {/* Reveal blocks start at opacity 0 and are animated in by Framer.
            Without JS nothing would ever animate, so force them visible. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(siteJsonLd) }}
        />
      </head>
      <body className="flex min-h-full flex-col antialiased">
        <LocaleProvider locale={lang}>
          <MotionProvider>
            <AnnouncementBar settings={settings} />
            <Navbar settings={settings} schedule={schedule} dict={dict} />
            <main className="flex-1">{children}</main>
            <Footer settings={settings} contact={contact} schedule={schedule} dict={dict} />
          </MotionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
