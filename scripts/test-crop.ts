/**
 * Verify the crop path: store a photo, generate a cover with a crop rect, and
 * confirm it produces a valid PDF.
 *   pnpm tsx scripts/test-crop.ts  → .context/cover-cropped.pdf
 */

import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { putOriginal } from "@/lib/book-pdf/photo-store";
import { generateCoverPdf } from "@/lib/book-pdf/generate-cover";
import { DEFAULT_COVER_TEMPLATE, coverPhotoAspect } from "@/lib/book-pdf/cover-templates";
import type { CoverConfig } from "@/types/book";

async function photo(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="3000">
    <rect width="2400" height="3000" fill="#2c7a7b"/>
    <rect x="600" y="900" width="1200" height="1200" fill="#c0392b"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();
}

async function main() {
  const photoRef = await putOriginal(await photo(), "jpg");
  console.log(`slot aspect = ${coverPhotoAspect().toFixed(3)}`);

  // Crop the centre-ish region (fractions of the original).
  const cover: CoverConfig = {
    coverTemplate: DEFAULT_COVER_TEMPLATE,
    coverColor: "bleu",
    design: { photoRef, crop: { x: 0.2, y: 0.25, w: 0.6, h: 0.5 } },
  };
  const pdf = await generateCoverPdf({ title: "Photo recadrée", cover });
  assert.ok(pdf.length > 1000, "pdf should be non-trivial");
  await writeFile(".context/cover-cropped.pdf", Buffer.from(pdf));
  console.log(`✓ generated cropped cover → .context/cover-cropped.pdf (${(pdf.length / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
