/**
 * Proof: generate a print-ready cover PDF end-to-end from one photo.
 *
 *   pnpm tsx scripts/proof-cover-pdf.ts
 *
 * Writes .context/cover-proof.pdf — open it and zoom in: the photo is 300 DPI,
 * the gridify overlay + frame + title + crop marks are all sharp vector.
 * Uses a synthesised high-res sample image so it needs no external file.
 */

import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
import { composeCoverPdf } from "@/lib/book-pdf/compose-cover";
import type { CoverTemplate } from "@/lib/book-pdf/template-spec";

// A5 hero cover: full-bleed gridified photo on top, cream title band below.
const TEMPLATE: CoverTemplate = {
  id: "hero-gridify-a5",
  name: "Hero — photo gridifiee",
  trimWidthMm: 148,
  trimHeightMm: 210,
  bleedMm: 3,
  background: "#f5efe0",
  photo: {
    rect: { x: 0, y: 0, w: 1, h: 0.68 },
    bleed: { top: true, left: true, right: true },
    shuffle: { cols: 9, rows: 12, intensity: 0.35, seed: 7, gapMm: 1.0 },
  },
  title: {
    rect: { x: 0.08, y: 0.72, w: 0.84, h: 0.16 },
    align: "center",
    color: "#1a1a1a",
    sizeFrac: 0.08,
    uppercase: true,
  },
  frame: { insetMm: 6, color: "#c0392b", widthPt: 1.4 },
};

/** Make a recognisable high-res sample photo (so the gridify is visible). */
async function samplePhoto(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="3000">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2c7a7b"/><stop offset="1" stop-color="#c0392b"/></linearGradient></defs>
    <rect width="2400" height="3000" fill="url(#g)"/>
    <circle cx="800" cy="1000" r="520" fill="#f5efe0" opacity="0.85"/>
    <circle cx="1650" cy="1900" r="360" fill="#1a1a1a" opacity="0.55"/>
    <rect x="200" y="2200" width="2000" height="220" fill="#f5efe0" opacity="0.7"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  const photo = await samplePhoto();
  const meta = await sharp(photo).metadata();
  const pdf = await composeCoverPdf(TEMPLATE, { title: "Pour Maman", photo });

  await mkdir(".context", { recursive: true });
  const out = ".context/cover-proof.pdf";
  await writeFile(out, pdf);

  const pageWmm = TEMPLATE.trimWidthMm + 2 * TEMPLATE.bleedMm;
  const pageHmm = TEMPLATE.trimHeightMm + 2 * TEMPLATE.bleedMm;
  console.log(`Wrote ${out}`);
  console.log(`  source photo: ${meta.width}x${meta.height}px`);
  console.log(`  page (with bleed): ${pageWmm}x${pageHmm}mm  (trim ${TEMPLATE.trimWidthMm}x${TEMPLATE.trimHeightMm} + ${TEMPLATE.bleedMm}mm)`);
  console.log(`  pdf size: ${(pdf.length / 1024).toFixed(0)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
