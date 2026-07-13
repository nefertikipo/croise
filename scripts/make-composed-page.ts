/** Demo: a hand-composed photo page — varied sizes, asymmetry, graphic tiles,
 * negative space. Shows that placement (not just a grid) is what's interesting.
 *   pnpm tsx scripts/make-composed-page.ts  → .context/composed-page.png */

import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const TW = 520;
const TH = Math.round((TW * 210) / 148);

type Cell = { x: number; y: number; w: number; h: number; kind: "photo" | "graphic"; color?: string };

// Hand-composed — deliberately uneven, with breathing room.
const CELLS: Cell[] = [
  { x: 0.06, y: 0.06, w: 0.58, h: 0.42, kind: "photo" },
  { x: 0.68, y: 0.06, w: 0.26, h: 0.26, kind: "graphic", color: "#cc3a2f" },
  { x: 0.68, y: 0.36, w: 0.26, h: 0.34, kind: "photo" },
  { x: 0.06, y: 0.54, w: 0.34, h: 0.4, kind: "photo" },
  { x: 0.44, y: 0.54, w: 0.2, h: 0.2, kind: "graphic", color: "#108474" },
  { x: 0.44, y: 0.78, w: 0.5, h: 0.16, kind: "photo" },
];

function lens(cx: number, cy: number, lw: number, lh: number): string {
  return `M ${cx - lw / 2} ${cy} Q ${cx} ${cy - lh / 2} ${cx + lw / 2} ${cy} Q ${cx} ${cy + lh / 2} ${cx - lw / 2} ${cy} Z`;
}

function draw(c: Cell): string {
  const x = c.x * TW;
  const y = c.y * TH;
  const w = c.w * TW;
  const h = c.h * TH;
  if (c.kind === "photo") {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#b9b19d"/>
      <circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(w, h) * 0.15}" fill="#a49c86"/>`;
  }
  const cx = x + w / 2;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c.color}"/>
    <path d="${lens(cx, y + h * 0.29, w * 0.82, h * 0.34)}" fill="#fff6ec"/>
    <path d="${lens(cx, y + h * 0.71, w * 0.82, h * 0.34)}" fill="#fff6ec"/>`;
}

async function main() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">
    <rect width="${TW}" height="${TH}" fill="#fff6ec"/>
    ${CELLS.map(draw).join("\n")}
  </svg>`;
  await mkdir(".context", { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(".context/composed-page.png");
  console.log(`Wrote .context/composed-page.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
