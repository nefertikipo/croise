/**
 * Back cover panel of the wraparound cover spread: the wordmark, a short
 * tagline, the book title and its share code, drawn into the left-hand panel
 * in the same brand colours the customer chose for the front. The caller fills
 * the shared page background.
 */

import type { PDFPage } from "pdf-lib";
import type { BookFonts } from "@/lib/book-pdf/fonts";
import { resolveCoverColor } from "@/lib/book-pdf/cover-templates";
import { hex2rgb, mixHex, type PanelRect } from "@/lib/book-pdf/geometry";
import { ellipsize, nfc } from "@/lib/book-pdf/text";
import type { CoverConfig } from "@/types/book";

export interface BackCoverPanelOptions {
  page: PDFPage;
  fonts: BookFonts;
  /** Trim rect of the back-cover panel (bottom-left origin, pt). */
  panel: PanelRect;
  title: string;
  code: string;
  cover: CoverConfig | null;
}

export function composeBackCoverPanel({ page, fonts, panel, title, code, cover }: BackCoverPanelOptions): void {
  const { bg, border } = resolveCoverColor(cover?.coverColor);

  const titleRgb = hex2rgb(border);
  const faint = mixHex(border, bg, 0.35);
  const cx = panel.x + panel.w / 2;
  const panelTopY = panel.y + panel.h;
  const centered = (text: string, yTop: number, size: number, font: typeof fonts.heading, color = titleRgb) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: cx - w / 2, y: panelTopY - (yTop + size), size, font, color });
  };

  // Thin keyline frame inside the trim, echoing the front cover accent.
  const inset = 10;
  page.drawRectangle({
    x: panel.x + inset,
    y: panel.y + inset,
    width: panel.w - 2 * inset,
    height: panel.h - 2 * inset,
    borderColor: faint,
    borderWidth: 1,
    opacity: 0,
  });

  // Wordmark + tagline, optically centred on the panel.
  const midTop = panel.h * 0.42;
  centered("LES FLÉCHÉS", midTop, 22, fonts.heading);
  const rW = panel.w * 0.18;
  page.drawLine({ start: { x: cx - rW, y: panelTopY - (midTop + 34) }, end: { x: cx + rW, y: panelTopY - (midTop + 34) }, thickness: 1, color: faint });
  centered("MOTS FLÉCHÉS PERSONNALISÉS", midTop + 46, 8.5, fonts.letter);
  centered("À FABRIQUER, À OFFRIR", midTop + 60, 8.5, fonts.letter);

  // Book title (the customer's) below — shrink-to-fit inside the keyline,
  // floored at 7pt then ellipsized.
  const bookTitle = nfc(title).toUpperCase();
  const titleMaxW = panel.w - 2 * inset - 12;
  let titleSize = 11;
  while (titleSize > 7 && fonts.bold.widthOfTextAtSize(bookTitle, titleSize) > titleMaxW) titleSize -= 0.5;
  centered(ellipsize(fonts.bold, bookTitle, titleSize, titleMaxW), midTop + 96, titleSize, fonts.bold);

  // Footer: share code + site.
  const footTop = panel.h - 34;
  centered(`CODE ${code}`, footTop, 8, fonts.letter, faint);
  centered("LESFLECHES.COM", footTop + 12, 8, fonts.letter, faint);
}
