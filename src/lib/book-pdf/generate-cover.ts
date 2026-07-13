/**
 * Generate a print-ready cover PDF for a real book: resolve its chosen template,
 * fetch the full-resolution photo, and compose. Shared by the cover.pdf route
 * and any preview/preflight path.
 */

import sharp from "sharp";
import { composeCoverPdf } from "@/lib/book-pdf/compose-cover";
import { getCoverTemplate, resolveCoverColor, resolveCoverFont } from "@/lib/book-pdf/cover-templates";
import { getOriginal } from "@/lib/book-pdf/photo-store";
import type { CoverConfig, PageDesign } from "@/types/book";

/** Apply the user's fractional crop to the full-res original, if any. */
async function applyCrop(photo: Buffer, crop: PageDesign["crop"]): Promise<Buffer> {
  if (!crop) return photo;
  const meta = await sharp(photo).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  const left = Math.min(W - 1, Math.max(0, Math.round(crop.x * W)));
  const top = Math.min(H - 1, Math.max(0, Math.round(crop.y * H)));
  const width = Math.max(1, Math.min(W - left, Math.round(crop.w * W)));
  const height = Math.max(1, Math.min(H - top, Math.round(crop.h * H)));
  return sharp(photo).extract({ left, top, width, height }).toBuffer();
}

/** Thrown when the book has no cover photo yet (a user-fixable state). */
export class MissingCoverPhotoError extends Error {
  constructor() {
    super("No cover photo uploaded.");
    this.name = "MissingCoverPhotoError";
  }
}

export async function generateCoverPdf(input: {
  title: string;
  cover: CoverConfig | null;
}): Promise<Uint8Array> {
  const base = getCoverTemplate(input.cover?.coverTemplate);
  const photoRef = input.cover?.design?.photoRef;
  if (!photoRef) throw new MissingCoverPhotoError();

  // The whole page is the chosen colour (blue/red/gold) with a thin keyline
  // border; only the photo differs. No mutation of the shared template.
  const { bg, border } = resolveCoverColor(input.cover?.coverColor);
  const template = {
    ...base,
    background: bg,
    // The accent colour ("the border") outlines the photo and colours the title.
    photo: {
      ...base.photo,
      border: base.photo.border ? { ...base.photo.border, color: border } : base.photo.border,
    },
    title: { ...base.title, color: border },
  };

  const photo = await applyCrop(await getOriginal(photoRef), input.cover?.design?.crop);
  const titleFontFile = resolveCoverFont(input.cover?.titleFont).file;
  return composeCoverPdf(template, { title: input.title, photo, titleFontFile, titleBold: input.cover?.titleBold });
}
