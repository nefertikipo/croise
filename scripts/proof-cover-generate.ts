/**
 * Exercise the REAL cover-generation path (template registry + photo-store +
 * generate-cover) exactly as the /api/books/[code]/cover.pdf route does.
 *   pnpm tsx scripts/proof-cover-generate.ts  → .context/cover-generated.pdf
 */

import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { putOriginal } from "@/lib/book-pdf/photo-store";
import { generateCoverPdf, MissingCoverPhotoError } from "@/lib/book-pdf/generate-cover";
import { DEFAULT_COVER_TEMPLATE } from "@/lib/book-pdf/cover-templates";
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
  // 1. Missing photo → the user-fixable error the route maps to a 400.
  let flagged = false;
  try {
    await generateCoverPdf({ title: "Test", cover: { design: {} } });
  } catch (err) {
    flagged = err instanceof MissingCoverPhotoError;
  }
  if (!flagged) throw new Error("expected MissingCoverPhotoError when no photo");
  console.log("✓ no-photo case raises MissingCoverPhotoError");

  // 2. Store a photo like the upload route would, then generate.
  const photoRef = await putOriginal(await samplePhoto(), "jpg");
  const cover: CoverConfig = { coverTemplate: DEFAULT_COVER_TEMPLATE, design: { photoRef } };
  const pdf = await generateCoverPdf({ title: "Souvenirs de Maman", cover });

  await writeFile(".context/cover-generated.pdf", Buffer.from(pdf));
  console.log(`✓ generated cover from a stored photoRef → .context/cover-generated.pdf (${(pdf.length / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
