/** Render the cover once per title font to prove each embeds in the PDF.
 *   pnpm tsx scripts/proof-cover-fonts.ts */

import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { putOriginal } from "@/lib/book-pdf/photo-store";
import { generateCoverPdf } from "@/lib/book-pdf/generate-cover";
import { COVER_FONTS, DEFAULT_COVER_TEMPLATE } from "@/lib/book-pdf/cover-templates";
import type { CoverConfig } from "@/types/book";

async function photo(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="2700">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2c7a7b"/><stop offset="1" stop-color="#c0392b"/></linearGradient></defs>
    <rect width="2400" height="2700" fill="url(#g)"/>
    <circle cx="850" cy="1000" r="520" fill="#f2ece0" opacity="0.9"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();
}

async function main() {
  const photoRef = await putOriginal(await photo(), "jpg");
  for (const key of Object.keys(COVER_FONTS)) {
    const cover: CoverConfig = { coverTemplate: DEFAULT_COVER_TEMPLATE, coverColor: "bleu", titleFont: key, design: { photoRef } };
    const pdf = await generateCoverPdf({ title: "Souvenirs de Maman", cover });
    await writeFile(`.context/font-${key}.pdf`, Buffer.from(pdf));
    console.log(`✓ ${key} (${COVER_FONTS[key].file}) → .context/font-${key}.pdf`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
