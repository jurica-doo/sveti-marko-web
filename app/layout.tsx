import type { Metadata, Viewport } from "next";
import { Marcellus, Source_Sans_3 } from "next/font/google";
import "./globals.css";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { MotionProvider } from "@/components/ui/MotionProvider";
import { seoRootDefaults } from "@/lib/seo";
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

export const metadata: Metadata = {
  ...seoRootDefaults,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101d26",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { settings, contact, schedule } = await getSiteChrome();

  return (
    <html
      lang="hr"
      suppressHydrationWarning
      className={`${marcellus.variable} ${sourceSans.variable} h-full`}
    >
      <head>
        {/* Reveal blocks start at opacity 0 and are animated in by Framer.
            Without JS nothing would ever animate, so force them visible. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="flex min-h-full flex-col antialiased">
        <MotionProvider>
          <AnnouncementBar settings={settings} />
          <Navbar settings={settings} schedule={schedule} />
          <main className="flex-1">{children}</main>
          <Footer settings={settings} contact={contact} schedule={schedule} />
        </MotionProvider>
      </body>
    </html>
  );
}
