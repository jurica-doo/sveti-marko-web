import type { MetadataRoute } from "next";

/**
 * Web app manifest, served at /manifest.webmanifest.
 *
 * Colours match `themeColor` in the root layout and `--color-ink-900` in
 * `globals.css`, so an installed shortcut opens on the same ground the site's
 * header and footer use rather than flashing white first.
 *
 * Icons come from `npm run generate:icons`. The maskable one is listed
 * separately because Android crops icons to its own shape: without an entry
 * declaring `purpose: "maskable"` it pads the standard icon into a smaller
 * badge instead of filling the tile.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Župa sv. Marka Evanđelista — Neslanovac, Split",
    short_name: "Sv. Marko",
    description:
      "Raspored svetih misa i ispovijedi, župne vijesti i kontakt župe sv. Marka Evanđelista na splitskom Neslanovcu.",
    lang: "hr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#101d26",
    theme_color: "#101d26",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
