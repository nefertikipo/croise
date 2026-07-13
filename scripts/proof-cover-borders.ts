/**
 * Render the framed-title cover in each border colour (blue/red/gold) via the
 * real generate path.
 *   pnpm tsx scripts/proof-cover-borders.ts  → .context/cover-{bleu,rouge,or}.pdf
 */

import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { putOriginal } from "@/lib/book-pdf/photo-store";
import { generateCoverPdf } from "@/lib/book-pdf/generate-cover";
import { COVER_COLORS, DEFAULT_COVER_TEMPLATE } from "@/lib/book-pdf/cover-templates";
import type { CoverConfig } from "@/types/book";

async function samplePhoto(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="2700">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2c7a7b"/><stop offset="1" stop-color="#c0392b"/></linearGradient></defs>
    <rect width="2400" height="2700" fill="url(#g)"/>
    <circle cx="850" cy="1000" r="520" fill="#f2ece0" opacity="0.85"/>
    <circle cx="1650" cy="1800" r="360" fill="#1a1a1a" opacity="0.5"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();
}

async function main() {
  const photoRef = await putOriginal(await samplePhoto(), "jpg");
  for (const key of Object.keys(COVER_COLORS)) {
    const cover: CoverConfig = { coverTemplate: DEFAULT_COVER_TEMPLATE, coverColor: key, design: { photoRef } };
    const pdf = await generateCoverPdf({ title: "Souvenirs de Maman", cover });
    await writeFile(`.context/cover-${key}.pdf`, Buffer.from(pdf));
    console.log(`✓ ${key} (bg ${COVER_COLORS[key].bg}) → .context/cover-${key}.pdf`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
