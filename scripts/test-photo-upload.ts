/**
 * Verify the photo ingest pipeline without an HTTP server:
 *   pnpm tsx scripts/test-photo-upload.ts
 */

import assert from "node:assert/strict";
import sharp from "sharp";
import { ingestPhoto, PhotoTooSmallError, MIN_PHOTO_SHORT_SIDE } from "@/lib/book-pdf/photo-ingest";
import { getOriginal } from "@/lib/book-pdf/photo-store";

const jpeg = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 44, g: 122, b: 123 } } })
    .jpeg()
    .toBuffer();

async function main() {
  // 1. Too-small photo is rejected.
  let rejected = false;
  try {
    await ingestPhoto(await jpeg(800, 1000));
  } catch (err) {
    rejected = err instanceof PhotoTooSmallError;
  }
  assert.ok(rejected, "should reject a photo below the min short side");
  console.log(`✓ rejects photos under ${MIN_PHOTO_SHORT_SIDE}px short side`);

  // 2. Big-enough photo ingests, stores full-res, returns a preview.
  const res = await ingestPhoto(await jpeg(2400, 3000));
  assert.ok(res.photoRef, "photoRef present");
  assert.ok(res.preview.startsWith("data:image/jpeg;base64,"), "preview is a data URL");
  assert.equal(res.width, 2400);
  assert.equal(res.height, 3000);
  console.log(`✓ ingests 2400x3000 → ${res.photoRef}`);

  // 3. The stored original is still full resolution.
  const orig = await getOriginal(res.photoRef);
  const meta = await sharp(orig).metadata();
  assert.equal(meta.width, 2400);
  assert.equal(meta.height, 3000);
  console.log(`✓ getOriginal returns full-res ${meta.width}x${meta.height} (${(orig.length / 1024).toFixed(0)} KB)`);
  console.log(`  preview data URL: ${(res.preview.length / 1024).toFixed(0)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
