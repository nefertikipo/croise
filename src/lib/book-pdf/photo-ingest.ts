/**
 * Ingest one uploaded photo: validate it's big enough to print, store the
 * full-resolution original, and return a small preview for the editor.
 *
 * Splitting this from the API route keeps it directly testable (see
 * scripts/test-photo-upload.ts) without spinning up an HTTP server.
 */

import sharp from "sharp";
import { putOriginal } from "@/lib/book-pdf/photo-store";

/**
 * Shortest side (px) a photo must have to be usable on the cover. The photo
 * slot is ~130mm wide; 1200px across it is ~235 DPI — acceptable (best is
 * 1500+). Below this it prints visibly soft, so we reject. Note: cropping only
 * *removes* pixels, so a too-small photo can't be rescued by cropping.
 */
export const MIN_PHOTO_SHORT_SIDE = 1200;

/** Longest edge (px) of the editor preview — display only, never printed. */
const PREVIEW_MAX = 1000;

export interface IngestedPhoto {
  /** Storage ref for the full-res original (see photo-store.ts). */
  photoRef: string;
  /** Small JPEG data URL for the editor preview. NOT for print. */
  preview: string;
  width: number;
  height: number;
}

export class PhotoTooSmallError extends Error {
  constructor(public readonly shortSide: number) {
    super(
      `Photo trop petite (${shortSide}px de cote le plus court). Il faut au moins ${MIN_PHOTO_SHORT_SIDE}px pour une impression nette.`,
    );
    this.name = "PhotoTooSmallError";
  }
}

export async function ingestPhoto(bytes: Buffer): Promise<IngestedPhoto> {
  const meta = await sharp(bytes).rotate().metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const shortSide = Math.min(width, height);
  if (shortSide < MIN_PHOTO_SHORT_SIDE) throw new PhotoTooSmallError(shortSide);

  // Store the oriented full-resolution original as near-lossless JPEG.
  const original = await sharp(bytes).rotate().jpeg({ quality: 95 }).toBuffer();
  const photoRef = await putOriginal(original, "jpg");

  const previewBuf = await sharp(bytes)
    .rotate()
    .resize(PREVIEW_MAX, PREVIEW_MAX, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  const preview = `data:image/jpeg;base64,${previewBuf.toString("base64")}`;

  return { photoRef, preview, width, height };
}
