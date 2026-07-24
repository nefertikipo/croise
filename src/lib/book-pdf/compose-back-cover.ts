/**
 * Back cover: a solid page in the same brand colour the customer chose for the
 * front, with the wordmark, a short tagline, the book title and its share code.
 * Self-contained (its own pdf-lib doc), mirroring generateCoverPdf — printed as
 * a separate file from the interior, as POD expects.
 */

import { PDFDocument } from "pdf-lib";
import { embedBookFonts } from "@/lib/book-pdf/fonts";
import { resolveCoverColor } from "@/lib/book-pdf/cover-templates";
import { pageGeometry, PAGE_SPECS, hex2rgb, mixHex, drawCropMarks } from "@/lib/book-pdf/geometry";
import type { CoverConfig } from "@/types/book";

export interface BackCoverInput {
  title: string;
  code: string;
  cover: CoverConfig | null;
}

export async function generateBackCoverPdf({ title, code, cover }: BackCoverInput): Promise<Uint8Array> {
  const g = pageGeometry(PAGE_SPECS.a5);
  const { bg, border } = resolveCoverColor(cover?.coverColor);
  const doc = await PDFDocument.create();
  const fonts = await embedBookFonts(doc);
  const page = doc.addPage([g.pageW, g.pageH]);

  page.drawRectangle({ x: 0, y: 0, width: g.pageW, height: g.pageH, color: hex2rgb(bg) });

  const titleRgb = hex2rgb(border);
  const faint = mixHex(border, bg, 0.35);
  const cx = g.pageW / 2;
  const centered = (text: string, yTop: number, size: number, font: typeof fonts.heading, color = titleRgb) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: cx - w / 2, y: g.pageH - (yTop + size), size, font, color });
  };

  // Thin keyline frame inside the trim, echoing the front cover accent.
  const inset = g.bleedPt + 10;
  page.drawRectangle({
    x: inset,
    y: inset,
    width: g.pageW - 2 * inset,
    height: g.pageH - 2 * inset,
    borderColor: faint,
    borderWidth: 1,
    opacity: 0,
  });

  // Wordmark + tagline, optically centred on the page.
  const midTop = g.trimHpt * 0.42;
  centered("LES FLÉCHÉS", midTop, 22, fonts.heading);
  const rW = g.trimWpt * 0.18;
  page.drawLine({ start: { x: cx - rW, y: g.pageH - (midTop + 34) }, end: { x: cx + rW, y: g.pageH - (midTop + 34) }, thickness: 1, color: faint });
  centered("MOTS FLÉCHÉS PERSONNALISÉS", midTop + 46, 8.5, fonts.letter);
  centered("À FABRIQUER, À OFFRIR", midTop + 60, 8.5, fonts.letter);

  // Book title (the customer's) below.
  centered(title.toUpperCase(), midTop + 96, 11, fonts.bold);

  // Footer: share code + site.
  const footTop = g.bleedPt + g.trimHpt - 34;
  centered(`CODE ${code}`, footTop, 8, fonts.letter, faint);
  centered("LESFLECHES.COM", footTop + 12, 8, fonts.letter, faint);

  drawCropMarks(page, g);
  return doc.save();
}
