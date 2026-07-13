/** Render a few photo-page layouts filled with sample photos.
 *   pnpm tsx scripts/proof-photo-pages.ts  → .context/photopage-*.pdf */

import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { getPhotoLayout } from "@/lib/book-pdf/photo-layouts";
import { composePhotoPage, type PhotoFill } from "@/lib/book-pdf/compose-photo-page";

const PALETTE = ["#2c7a7b", "#cc3a2f", "#bb9a62", "#0f4c81", "#108474"];

async function samplePhoto(i: number): Promise<Buffer> {
  const a = PALETTE[i % PALETTE.length];
  const b = PALETTE[(i + 2) % PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1800">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="1800" height="1800" fill="url(#g)"/>
    <circle cx="900" cy="900" r="420" fill="#fff6ec" opacity="0.85"/>
    <text x="900" y="960" text-anchor="middle" font-family="sans-serif" font-size="360" fill="#1a1a1a">${i + 1}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

async function render(id: string) {
  const layout = getPhotoLayout(id);
  const photoSlots = layout.slots.filter((s) => s.kind !== "graphic");
  const photos: PhotoFill[] = [];
  for (let i = 0; i < photoSlots.length; i++) photos.push({ photo: await samplePhoto(i) });
  const pdf = await composePhotoPage(layout, { photos });
  await writeFile(`.context/photopage-${id}.pdf`, Buffer.from(pdf));
  console.log(`✓ ${id} (${photoSlots.length} photos + ${layout.slots.length - photoSlots.length} graphics)`);
}

async function main() {
  for (const id of ["sunleak", "hero", "field"]) await render(id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
