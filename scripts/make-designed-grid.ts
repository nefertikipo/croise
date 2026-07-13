/** Demo: a SUNLEAK-style grid — photos mixed with graphic motif tiles (flat
 * brand colours + lens shapes). Shows the "more interesting" direction.
 *   pnpm tsx scripts/make-designed-grid.ts  → .context/designed-grid.png */

import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { getPhotoLayout } from "@/lib/book-pdf/photo-layouts";

const TW = 520;
const TH = Math.round((TW * 210) / 148);
const COLORS = ["#108474", "#0c7fb5", "#cc3a2f", "#bb9a62", "#f1d879", "#f07898"];
// Which cells are graphic motif tiles (0-indexed) — the rest are photos.
const GRAPHIC = new Set([1, 4, 6, 11, 13]);

/** A horizontal pointed-oval (lens / vesica). */
function lens(cx: number, cy: number, lw: number, lh: number): string {
  return `M ${cx - lw / 2} ${cy} Q ${cx} ${cy - lh / 2} ${cx + lw / 2} ${cy} Q ${cx} ${cy + lh / 2} ${cx - lw / 2} ${cy} Z`;
}

function tile(x: number, y: number, w: number, h: number, i: number): string {
  if (!GRAPHIC.has(i)) {
    // Photo cell (muted placeholder).
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#b9b19d"/>
      <circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(w, h) * 0.16}" fill="#a49c86"/>`;
  }
  const color = COLORS[i % COLORS.length];
  const cx = x + w / 2;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>
    <path d="${lens(cx, y + h * 0.29, w * 0.82, h * 0.34)}" fill="#fff6ec"/>
    <path d="${lens(cx, y + h * 0.71, w * 0.82, h * 0.34)}" fill="#fff6ec"/>`;
}

async function main() {
  const layout = getPhotoLayout("grille-16");
  const cells = layout.slots.map((s, i) => tile(s.rect.x * TW, s.rect.y * TH, s.rect.w * TW, s.rect.h * TH, i));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">
    <rect width="${TW}" height="${TH}" fill="#fff6ec"/>
    ${cells.join("\n")}
  </svg>`;
  await mkdir(".context", { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(".context/designed-grid.png");
  console.log(`Wrote .context/designed-grid.png (${16 - GRAPHIC.size} photos + ${GRAPHIC.size} graphic tiles)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
