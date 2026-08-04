import type { Metadata, Viewport } from "next";
import "./globals.css";

import { seoRootDefaults } from "@/lib/seo";

// Fonts go here (next/font/google), exposed as CSS variables on <body>.

export const metadata: Metadata = {
  ...seoRootDefaults,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Header / Footer / providers get mounted here once the components exist.
  return (
    <html lang="hr" suppressHydrationWarning className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
