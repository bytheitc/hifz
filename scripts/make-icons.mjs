/**
 * Draws the app icons from the Islamic Tech Collective's mark, public/itc-mark.svg
 * (copied unchanged from brand/itc-mark.svg in the ITC repository). The PNGs it
 * writes are committed, so this only runs when the mark changes. It borrows
 * sharp rather than adding a dependency for something that runs once a year;
 * point NODE_PATH at any node_modules that has it:
 *
 *   NODE_PATH=/path/to/node_modules node scripts/make-icons.mjs
 *
 * As supplied the mark is a black nūn on a white disc. On a home screen the
 * platform supplies the shape, so every icon is the nūn on a white square: a
 * transparent corner would be painted black by iOS, and a maskable icon must
 * keep the nūn inside the central safe zone (scale 0.8 here).
 */
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const sharp = require("sharp");

const source = await readFile(join(root, "public", "itc-mark.svg"), "utf8");
const nun = source.match(/<g fill="var\(--itc-mark-ink, #000000\)">([\s\S]*?)<\/g>/)[1];

/** The nūn on a white square, scaled about the centre. */
const square = (size, scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">` +
  `<rect width="100" height="100" fill="#FFFFFF"/>` +
  `<g fill="#000000" transform="translate(50 50) scale(${scale}) translate(-50 -50)">${nun}</g></svg>`;

const TARGETS = [
  { file: "icon-192.png", size: 192, scale: 1 },
  { file: "icon-512.png", size: 512, scale: 1 },
  // Maskable: the platform may crop to a circle of 80% of the width.
  { file: "icon-maskable-512.png", size: 512, scale: 0.8 },
  { file: "apple-touch-icon.png", size: 180, scale: 1 },
];

for (const t of TARGETS) {
  const png = await sharp(Buffer.from(square(t.size, t.scale))).png().toBuffer();
  await writeFile(join(root, "public", t.file), png);
  console.log(`public/${t.file}`);
}
// The favicon is the mark exactly as supplied: black nūn, white disc.
await writeFile(join(root, "public", "icon.svg"), source);
console.log("public/icon.svg");
