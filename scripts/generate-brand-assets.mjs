/**
 * Builds every icon and social image the site and the CMS need, from the two
 * source drawings in `brand/`.
 *
 *   npm run generate:icons
 *
 * The sources are the same church rendered twice — `mark-light.png` in white
 * for dark grounds, `mark-dark.png` in near-black for light ones. Both are
 * pencil drawings with real tonal range, not flat line art, and that is the
 * fact the whole of this script is arranged around:
 *
 *   - `mark-light.png` is used as a *picture*. Its shading is the mark, so it
 *     is composited onto the ink ground with its own tones intact. Reducing it
 *     to a silhouette would throw away everything that makes it the drawing it
 *     is.
 *
 *   - `mark-dark.png` is used as a *stencil*. Its transparency follows the
 *     pencil strokes, so its alpha channel is, on its own, clean line art —
 *     which is exactly what a CSS mask needs. That is what `.brand-mark` on the
 *     site and `.parish-icon` in the admin panel fill with `currentColor`, and
 *     it is why one file covers both light and dark chrome.
 *
 * The light drawing's alpha is *not* line art — the walls are solid, so it
 * masks down to a featureless blob. The two files are therefore not
 * interchangeable, and neither can be dropped.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** White on transparency — for the ink ground. */
const LIGHT_SOURCE = path.join(root, "brand", "mark-light.png");
/** Near-black on transparency — the stencil the masks are cut from. */
const DARK_SOURCE = path.join(root, "brand", "mark-dark.png");

/**
 * The admin panel is a separate app with its own `public/`, and its mark has to
 * be the same file as the site's or the two drift apart the first time this is
 * re-run. Skipped without complaint when the directory is not there — a CI or
 * Vercel build of the site alone has no sibling checkout.
 */
const CMS_ROOT = path.resolve(root, "..", "sveti-marko-cms");

/** Straight from `globals.css` — these must stay in step with the palette. */
const INK = { r: 0x10, g: 0x1d, b: 0x26 };
const BRASS = { r: 0xa8, g: 0x81, b: 0x3c };

/**
 * Alpha below this counts as empty when finding the drawing's edges.
 *
 * Both sources carry a haze of near-zero alpha out to the full canvas — some
 * 70-90k pixels of it — left over from how they were exported. Sharp's own
 * `.trim()` sees that haze as content and trims nothing at all, which is why
 * the bounds are measured here instead: without it the mark lands in an icon at
 * roughly two thirds of its proper size, ringed by transparent padding.
 */
const ALPHA_FLOOR = 25;

/** The box the actually-drawn pixels occupy, for `extract`. */
async function drawnBounds(source) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });

  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * channels + 3] < ALPHA_FLOOR) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) throw new Error(`${source} is empty`);

  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** The drawing, cropped to itself and scaled to fit a `size` square. */
async function renderMark(source, size) {
  return sharp(source)
    .extract(await drawnBounds(source))
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

/**
 * A square tile: the light drawing on the ink ground, inset by `coverage` of
 * the edge. Icons are cropped by the platform far more often than they are
 * shown whole, so none of them run the art to the edge.
 */
async function squareIcon(size, coverage) {
  const markSize = Math.round(size * coverage);
  const mark = await renderMark(LIGHT_SOURCE, markSize);
  const inset = Math.round((size - markSize) / 2);

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
 *
 * Only a fallback these days: `getShareImage()` in `lib/seo.ts` serves the CMS
 * hero, and this stands in when the CMS cannot be reached.
 */
async function socialCard(width, height) {
  const markSize = Math.round(height * 0.52);
  const mark = await renderMark(LIGHT_SOURCE, markSize);

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

async function write(base, target, data) {
  const file = path.join(base, target);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
  console.log(`${path.relative(path.dirname(root), file).padEnd(46)} ${(data.length / 1024).toFixed(1)} kB`);
}

async function main() {
  await fs.access(LIGHT_SOURCE);
  await fs.access(DARK_SOURCE);

  /*
   * Browser tab and search results. Coverage is highest here because these are
   * rendered at 16-32px, where any padding is most of the icon — and a drawing
   * with this much detail needs every pixel it can get. At 16px it resolves to
   * a pale shape on ink rather than a readable church; that is the size, not
   * the file, and the 32px entry is what most chrome actually picks.
   */
  const ico = buildIco(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({ size, data: await squareIcon(size, 0.84) })),
    ),
  );
  await write(root, "app/favicon.ico", ico);

  await write(root, "app/icon.png", await squareIcon(512, 0.74));
  await write(root, "app/apple-icon.png", await squareIcon(180, 0.68));

  /*
   * Installed-app icons. The maskable one is inset much further: Android crops
   * it to a circle or squircle whose safe zone is the middle 80% of the tile,
   * and the largest square that fits inside that circle is 0.8 / √2 ≈ 0.566 of
   * the edge. 0.54 sits just inside it.
   */
  await write(root, "public/icons/icon-192.png", await squareIcon(192, 0.74));
  await write(root, "public/icons/icon-512.png", await squareIcon(512, 0.74));
  await write(root, "public/icons/icon-maskable-512.png", await squareIcon(512, 0.54));

  await write(root, "public/og.png", await socialCard(1200, 630));

  /*
   * The stencil, kept as the dark drawing with its own alpha. `.brand-mark` in
   * `globals.css` and `.parish-icon` / `.parish-brand__mark` in the panel's
   * `custom.scss` use it as a CSS mask and fill it with `currentColor`, so it
   * takes whatever colour the text beside it has: stone over the hero
   * photograph, ink once the header turns solid, either theme in the admin. A
   * coloured file would need two variants and a swap, and would still be wrong
   * during the cross-fade between the two states.
   */
  const stencil = await renderMark(DARK_SOURCE, 256);
  await write(root, "public/icons/logo-mark.png", stencil);

  const hasCms = await fs
    .access(path.join(CMS_ROOT, "package.json"))
    .then(() => true)
    .catch(() => false);

  if (!hasCms) {
    console.log("\nsveti-marko-cms not found alongside — skipped its icons.");
    return;
  }

  await write(CMS_ROOT, "public/icons/logo-mark.png", stencil);
  await write(CMS_ROOT, "public/icons/favicon-32.png", await squareIcon(32, 0.84));
  await write(CMS_ROOT, "public/icons/icon-192.png", await squareIcon(192, 0.74));
  await write(CMS_ROOT, "public/icons/apple-icon.png", await squareIcon(180, 0.68));
}

await main();
