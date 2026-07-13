/** High-fidelity render of the Sunleak template: filmic photo cells, crisp
 * vesica graphic tiles, and a grain/texture overlay — to judge the real look.
 *   pnpm tsx scripts/make-test-photo.ts  → .context/sunleak-hifi.png */

import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { getPhotoLayout } from "@/lib/book-pdf/photo-layouts";

const TW = 900;
const TH = Math.round((TW * 210) / 148);

// Flat, saturated tile colours (SUNLEAK-ish).
const TILE = ["#1f7a4d", "#2f6fd0", "#e0552f", "#e8c235", "#c0392b", "#108474"];
// Muted, vintage gradients for photo cells.
const PHOTO_GRADS = [
  ["#8a7f6a", "#4a4436"],
  ["#9a6a52", "#5a3a30"],
  ["#6f8a86", "#3a4a48"],
  ["#a88f5a", "#5a4a2a"],
  ["#7a8fa0", "#3a4a58"],
  ["#8f7a86", "#4a3a44"],
];

/** A crisp horizontal vesica (two circular arcs). */
function vesica(cx: number, cy: number, w: number, h: number): string {
  const r = (h * h + w * w) / (4 * h); // arc radius through the two tips + apex
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  return `M ${x0} ${cy} A ${r} ${r} 0 0 1 ${x1} ${cy} A ${r} ${r} 0 0 1 ${x0} ${cy} Z`;
}

function cell(x: number, y: number, w: number, h: number, i: number, graphic: boolean, defs: string[]): string {
  if (graphic) {
    const c = TILE[i % TILE.length];
    const cx = x + w / 2;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>
      <path d="${vesica(cx, y + h * 0.29, w * 0.86, h * 0.34)}" fill="#f4ede0"/>
      <path d="${vesica(cx, y + h * 0.71, w * 0.86, h * 0.34)}" fill="#f4ede0"/>`;
  }
  const [a, b] = PHOTO_GRADS[i % PHOTO_GRADS.length];
  const id = `pg${i}`;
  defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})"/>
    <circle cx="${x + w * 0.42}" cy="${y + h * 0.4}" r="${Math.min(w, h) * 0.22}" fill="#000" opacity="0.12"/>`;
}

async function grainOverlay(w: number, h: number): Promise<Buffer> {
  const px = w * h;
  const raw = Buffer.alloc(px * 4);
  for (let i = 0; i < px; i++) {
    const v = 128 + Math.round((Math.random() - 0.5) * 46);
    raw[i * 4] = v;
    raw[i * 4 + 1] = v;
    raw[i * 4 + 2] = v;
    raw[i * 4 + 3] = 255;
  }
  return sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function main() {
  const graphics = new Set([1, 4, 6, 11, 13]);
  const defs: string[] = [];
  const cells = getPhotoLayout("grille-16").slots.map((s, i) =>
    cell(s.rect.x * TW, s.rect.y * TH, s.rect.w * TW, s.rect.h * TH, i, graphics.has(i), defs),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">
    <defs>${defs.join("")}</defs>
    <rect width="${TW}" height="${TH}" fill="#f4ede0"/>
    ${cells.join("\n")}
  </svg>`;

  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  const grain = await grainOverlay(TW, TH);
  const out = await sharp(base).composite([{ input: grain, blend: "overlay" }]).png().toBuffer();

  await mkdir(".context", { recursive: true });
  await sharp(out).toFile(".context/sunleak-hifi.png");
  console.log("Wrote .context/sunleak-hifi.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
