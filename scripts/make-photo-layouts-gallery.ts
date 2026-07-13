/**
 * Render all photo-page layouts as A5 thumbnails in one gallery image.
 *   pnpm tsx scripts/make-photo-layouts-gallery.ts  → .context/photo-layouts.png
 */

import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { PHOTO_LAYOUTS } from "@/lib/book-pdf/photo-layouts";

const TW = 200; // thumbnail width
const TH = Math.round((TW * 210) / 148); // A5 height
const COLS = 3;
const GAPX = 44;
const LABEL = 26;
const GAPY = 30;

function thumb(layout: (typeof PHOTO_LAYOUTS)[number], ox: number, oy: number): string {
  const parts: string[] = [];
  parts.push(`<rect x="${ox}" y="${oy}" width="${TW}" height="${TH}" fill="#fff6ec" stroke="#c9bfa8" stroke-width="1"/>`);
  layout.slots.forEach((s, i) => {
    const x = ox + s.rect.x * TW;
    const y = oy + s.rect.y * TH;
    const w = s.rect.w * TW;
    const h = s.rect.h * TH;
    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#c9c1af"/>`);
    const fs = w < 24 ? 9 : 13;
    parts.push(`<text x="${(x + w / 2).toFixed(1)}" y="${(y + h / 2 + fs / 3).toFixed(1)}" text-anchor="middle" font-family="sans-serif" font-size="${fs}" fill="#6f6857">${i + 1}</text>`);
  });
  parts.push(`<text x="${ox + TW / 2}" y="${oy + TH + 18}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#111">${layout.label}</text>`);
  return parts.join("\n");
}

async function main() {
  const rows = Math.ceil(PHOTO_LAYOUTS.length / COLS);
  const width = COLS * TW + (COLS + 1) * GAPX;
  const height = rows * (TH + LABEL) + (rows + 1) * GAPY;

  const cells = PHOTO_LAYOUTS.map((l, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const ox = GAPX + col * (TW + GAPX);
    const oy = GAPY + row * (TH + LABEL + GAPY);
    return thumb(l, ox, oy);
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#e7e0d1"/>
    ${cells.join("\n")}
  </svg>`;

  await mkdir(".context", { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(".context/photo-layouts.png");
  console.log(`Wrote .context/photo-layouts.png (${PHOTO_LAYOUTS.length} layouts)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
