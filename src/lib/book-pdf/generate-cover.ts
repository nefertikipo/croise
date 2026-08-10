import { BOOK_BINDING } from "@/lib/books/constants";
/**
 * Generate the print-ready WRAPAROUND COVER SPREAD for a real book: one PDF
 * page holding back cover + spine + front cover (POD perfect-bound softcover
 * expects a single spread file). Width = 2×trim + spine + 2×bleed; spine width
 * derives from the interior page count (see PAPER_THICKNESS_MM_PER_PAGE —
 * calibrate to the chosen Gelato paper before ordering). TrimBox/BleedBox are
 * set; no crop marks.
 */

import { PDFDocument, degrees } from "pdf-lib";
import sharp from "sharp";
import { composeCoverPanel, embedCoverTitleFont } from "@/lib/book-pdf/compose-cover";
import { composeBackCoverPanel } from "@/lib/book-pdf/compose-back-cover";
import { getCoverTemplate, resolveCoverColor, resolveCoverFont } from "@/lib/book-pdf/cover-templates";
import {
  hex2rgb,
  mm2pt,
  spineWidthMm,
  SPINE_TEXT_MIN_MM,
  type PanelRect,
} from "@/lib/book-pdf/geometry";
import { getOriginal } from "@/lib/book-pdf/photo-store";
import { nfc } from "@/lib/book-pdf/text";
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

export interface CoverSpreadInput {
  title: string;
  cover: CoverConfig | null;
  /** Final interior page count (see countInteriorPages) — drives spine width. */
  interiorPageCount: number;
  /** Contributors credited on the notepad, for the back-cover maker credit. */
  authors?: string[];
}

export async function generateCoverSpreadPdf(input: CoverSpreadInput): Promise<Uint8Array> {
  const base = getCoverTemplate(input.cover?.coverTemplate);
  const photoRef = input.cover?.design?.photoRef;
  if (!photoRef) throw new MissingCoverPhotoError();

  // The whole spread is the chosen colour (blue/red/gold) with a thin keyline
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

  // --- Spread geometry: back | spine | front, plus bleed all around. --------
  const bleedPt = mm2pt(template.bleedMm);
  const trimWpt = mm2pt(template.trimWidthMm);
  const trimHpt = mm2pt(template.trimHeightMm);
  // Saddle-stitch covers have no spine panel (staples, not a flat spine);
  // spineWidthMm only applies to perfect binding.
  const spineMm =
    BOOK_BINDING === "saddle-stitch" ? 0 : spineWidthMm(input.interiorPageCount);
  const spinePt = mm2pt(spineMm);
  const pageW = 2 * trimWpt + spinePt + 2 * bleedPt;
  const pageH = trimHpt + 2 * bleedPt;

  const doc = await PDFDocument.create();
  const page = doc.addPage([pageW, pageH]);
  // The cover title font (customer's choice) is the single face used across the
  // spread's typography — front title, back cover and spine — so the whole
  // object reads as one design.
  const coverTitleFont = await embedCoverTitleFont(doc, titleFontFile);

  // Shared background across the full spread (back, spine, front + bleed).
  page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: hex2rgb(bg) });

  // Back cover — left panel.
  const backPanel: PanelRect = { x: bleedPt, y: bleedPt, w: trimWpt, h: trimHpt };
  composeBackCoverPanel({ page, font: coverTitleFont, panel: backPanel, title: input.title, cover: input.cover, authors: input.authors });

  // Spine — solid background (already painted); title vertically only when the
  // spine is wide enough to carry text.
  if (spineMm >= SPINE_TEXT_MIN_MM) {
    const spineFont = coverTitleFont;
    const text = nfc(input.title).toUpperCase();
    const maxLen = trimHpt - 40;
    let size = Math.min(spinePt * 0.55, 14);
    while (size > 5 && spineFont.widthOfTextAtSize(text, size) > maxLen) size -= 0.5;
    if (spineFont.widthOfTextAtSize(text, size) <= maxLen) {
      const spineCx = bleedPt + trimWpt + spinePt / 2;
      const textW = spineFont.widthOfTextAtSize(text, size);
      // Rotated -90°: text reads top-to-bottom when the book stands upright.
      page.drawText(text, {
        x: spineCx - size * 0.35,
        y: pageH / 2 + textW / 2,
        size,
        font: spineFont,
        color: hex2rgb(border),
        rotate: degrees(-90),
      });
    }
  }

  // Front cover — right panel.
  const frontPanel: PanelRect = { x: bleedPt + trimWpt + spinePt, y: bleedPt, w: trimWpt, h: trimHpt };
  await composeCoverPanel({
    doc,
    page,
    panel: frontPanel,
    outer: { x: 0, y: 0, w: pageW, h: pageH },
    template,
    content: { title: input.title, photo, titleFontFile, titleBold: input.cover?.titleBold },
  });

  // POD print boxes: MediaBox = trim + bleed, BleedBox = MediaBox, TrimBox =
  // the trim rect of the whole spread. No crop marks.
  page.setBleedBox(0, 0, pageW, pageH);
  page.setTrimBox(bleedPt, bleedPt, pageW - 2 * bleedPt, pageH - 2 * bleedPt);

  return doc.save();
}
