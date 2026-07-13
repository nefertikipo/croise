/**
 * Proof of the framed cover layout: border + gridified photo + title band.
 *   pnpm tsx scripts/proof-cover-framed.ts   → .context/cover-framed.pdf (+ .png)
 */

import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
import { composeCoverPdf } from "@/lib/book-pdf/compose-cover";
import type { CoverTemplate } from "@/lib/book-pdf/template-spec";

// Border 10mm inside the cut; photo 114x130mm; title band 114x38mm below it.
const TEMPLATE: CoverTemplate = {
  id: "framed-hero-a5",
  name: "Cadre + photo gridifiee + titre",
  trimWidthMm: 148,
  trimHeightMm: 210,
  bleedMm: 3,
  background: "#f2ece0",
  photo: {
    rect: { x: 0.115, y: 0.081, w: 0.77, h: 0.619 },
    shuffle: { cols: 10, rows: 12, intensity: 0.35, seed: 7, gapMm: 1.0 },
  },
  title: {
    rect: { x: 0.115, y: 0.74, w: 0.77, h: 0.17 },
    align: "center",
    color: "#1a1a1a",
    sizeFrac: 0.055,
    uppercase: true,
  },
  frame: { insetMm: 10, color: "#1a1a1a", widthPt: 2 },
};

async function samplePhoto(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="2700">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2c7a7b"/><stop offset="1" stop-color="#c0392b"/></linearGradient></defs>
    <rect width="2400" height="2700" fill="url(#g)"/>
    <circle cx="850" cy="1000" r="520" fill="#f2ece0" opacity="0.85"/>
    <circle cx="1650" cy="1800" r="360" fill="#1a1a1a" opacity="0.5"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  const photo = await samplePhoto();
  const pdf = await composeCoverPdf(TEMPLATE, { title: "Pour Maman", photo });
  await mkdir(".context", { recursive: true });
  await writeFile(".context/cover-framed.pdf", pdf);
  await sharp(Buffer.from(pdf)).png().toFile(".context/cover-framed.png").catch(() => {});
  console.log("Wrote .context/cover-framed.pdf");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
