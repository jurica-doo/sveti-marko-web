/**
 * Builds every icon and social image the site needs from one source file,
 * `public/sveti-marko-logo.png`.
 *
 *   npm run generate:icons
 *
 * The source is dark line art (rgb(21,21,21)) on transparency, and 98% of the
 * canvas is empty. Two things follow from that, and they are why this script
 * exists rather than a hand-exported set:
 *
 *   1. It has to be trimmed. The mark occupies a 454x381 box inside a 1536x1024
 *      canvas, so dropping the raw file into a 512px square would render the
 *      church at about a third of the space with the rest padding.
 *   2. It has to be recoloured and given a ground. Near-black on transparency
 *      disappears against the dark browser chrome, dark tab bars and the dark
 *      Slack/Discord embed backgrounds these images are most often seen on.
 *      Since the art is monochrome, its alpha channel can be lifted off and
 *      re-filled with the site's stone, then set on the site's ink.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE = path.join(root, "public", "sveti-marko-logo.png");

/** Straight from `globals.css` — these must stay in step with the palette. */
const INK = { r: 0x10, g: 0x1d, b: 0x26 };
const STONE = { r: 0xfa, g: 0xf9, b: 0xf6 };
const BRASS = { r: 0xa8, g: 0x81, b: 0x3c };

/**
 * Lifts the mark off the source: trims to the drawn pixels, scales it to fit
 * `size`, and refills it with `colour` while keeping its own edges.
 */
async function renderMark(size, colour) {
  const trimmed = await sharp(SOURCE)
    .trim({ threshold: 10 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  const { data: alpha, info } = await sharp(trimmed)
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });

  return sharp({
    create: {
      width: info.width,
      height: info.height,
      channels: 3,
      background: colour,
    },
  })
    .joinChannel(alpha, {
      raw: { width: info.width, height: info.height, channels: 1 },
    })
    .png()
    .toBuffer();
}

/**
 * A square tile: the mark on the ink ground, inset by `coverage` of the edge.
 * Icons are cropped by the platform far more often than they are shown whole,
 * so none of them run the art to the edge.
 */
async function squareIcon(size, coverage) {
  const mark = await renderMark(Math.round(size * coverage), STONE);
  const inset = Math.round((size - Math.round(size * coverage)) / 2);

  return sharp({
    create: { width: size, height: size, channels: 4, background: INK },
  })
    .composite([{ input: mark, top: inset, left: inset }])
    .png()
    .toBuffer();
}

/**
 * Open Graph / Twitter card at the 1.91:1 both platforms crop to. No text: the
 * display face is loaded from Google Fonts at runtime and is not on disk, so
 * anything set here would render in whatever serif the machine running this
 * script happens to have — which is not necessarily the machine that ships it.
 * The brass rule is the same device that heads the footer and the schedule band.
 */
async function socialCard(width, height) {
  const mark = await renderMark(Math.round(height * 0.52), STONE);
  const markSize = Math.round(height * 0.52);

  const rule = await sharp({
    create: {
      width: Math.round(width * 0.22),
      height: 2,
      channels: 4,
      background: { ...BRASS, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return sharp({
    create: { width, height, channels: 4, background: INK },
  })
    .composite([
      {
        input: mark,
        top: Math.round(height / 2 - markSize / 2 - height * 0.05),
        left: Math.round(width / 2 - markSize / 2),
      },
      {
        input: rule,
        top: Math.round(height * 0.78),
        left: Math.round(width / 2 - (width * 0.22) / 2),
      },
    ])
    .png()
    .toBuffer();
}

/**
 * Packs PNGs into an .ico. The format is a small header plus one directory
 * entry per image; PNG payloads (rather than BMP) are understood by every
 * browser in use and by Windows since Vista.
 */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach(({ size, data }, index) => {
    const entry = index * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, entry + 0);
    directory.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    directory.writeUInt8(0, entry + 2); // palette size
    directory.writeUInt8(0, entry + 3); // reserved
    directory.writeUInt16LE(1, entry + 4); // colour planes
    directory.writeUInt16LE(32, entry + 6); // bits per pixel
    directory.writeUInt32LE(data.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });

  return Buffer.concat([header, directory, ...images.map((i) => i.data)]);
}

async function write(target, data) {
  const file = path.join(root, target);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
  console.log(`${target.padEnd(34)} ${(data.length / 1024).toFixed(1)} kB`);
}

async function main() {
  await fs.access(SOURCE);

  // Browser tab and search results. Coverage is highest here because these are
  // rendered at 16-32px, where any padding is most of the icon.
  const ico = buildIco(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({
        size,
        data: await squareIcon(size, 0.82),
      })),
    ),
  );
  await write("app/favicon.ico", ico);

  await write("app/icon.png", await squareIcon(512, 0.72));
  await write("app/apple-icon.png", await squareIcon(180, 0.66));

  // Installed-app icons. `maskable` is inset further: Android crops it to a
  // circle or squircle and only the central 80% is guaranteed to survive.
  await write("public/icons/icon-192.png", await squareIcon(192, 0.72));
  await write("public/icons/icon-512.png", await squareIcon(512, 0.72));
  await write("public/icons/icon-maskable-512.png", await squareIcon(512, 0.52));

  // `lib/seo.ts` already points every page at /og.png as its fallback.
  await write("public/og.png", await socialCard(1200, 630));

  /*
   * The mark for the navbar, trimmed and kept as bare alpha — no colour at all.
   * `.brand-mark` in globals.css uses it as a CSS mask and fills it with
   * `currentColor`, so it takes the header's own text colour: stone over the
   * hero photograph, ink once the bar turns solid. A coloured file would need
   * two variants and a swap, and would still be wrong during the cross-fade
   * between the two states.
   */
  await write(
    "public/icons/logo-mark.png",
    await sharp(SOURCE)
      .trim({ threshold: 10 })
      .resize(256, 256, {
        fit: "inside",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer(),
  );
}

await main();
