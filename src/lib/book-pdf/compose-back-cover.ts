/**
 * Back cover panel of the wraparound cover spread: a quiet, gift-like layout —
 * a small arrow motif, the "Les Flèches" imprint, the book title (the hero) and
 * an "imaginé avec amour par …" maker credit, optically centred in the panel,
 * with the site as a discreet footer. Everything is set in the SAME face as the
 * front-cover title, so the object reads as one design; hierarchy comes from
 * size and colour, not from mixing typefaces.
 */

import type { PDFFont, PDFPage } from "pdf-lib";
import { resolveCoverColor } from "@/lib/book-pdf/cover-templates";
import { hex2rgb, mixHex, type PanelRect } from "@/lib/book-pdf/geometry";
import { formatAuthorList, parseNameList } from "@/lib/books/authors";
import { ellipsize, nfc, wrapText } from "@/lib/book-pdf/text";
import type { CoverConfig } from "@/types/book";

export interface BackCoverPanelOptions {
  page: PDFPage;
  /** The cover title font — the single face used across the whole back panel. */
  font: PDFFont;
  /** Trim rect of the back-cover panel (bottom-left origin, pt). */
  panel: PanelRect;
  title: string;
  cover: CoverConfig | null;
  /** Contributors credited on the notepad, for the "imaginé par" line. */
  authors?: string[];
}

/** A small mots-fléchés arrow (down-then-right elbow), the brand's signature
 * clue glyph, centred at (cx, yBaseline) within an `s`-point box. */
function drawArrowMotif(page: PDFPage, cx: number, yBaseline: number, s: number, color: ReturnType<typeof hex2rgb>): void {
  const th = Math.max(1, s * 0.09);
  const x0 = cx - s / 2;
  const top = yBaseline + s * 0.55;
  const bend = yBaseline - s * 0.15;
  page.drawLine({ start: { x: x0, y: top }, end: { x: x0, y: bend }, thickness: th, color });
  page.drawLine({ start: { x: x0 - th / 2, y: bend }, end: { x: cx + s * 0.28, y: bend }, thickness: th, color });
  const hx = cx + s * 0.28;
  page.drawLine({ start: { x: hx, y: bend }, end: { x: hx - s * 0.16, y: bend + s * 0.14 }, thickness: th, color });
  page.drawLine({ start: { x: hx, y: bend }, end: { x: hx - s * 0.16, y: bend - s * 0.14 }, thickness: th, color });
}

export function composeBackCoverPanel({ page, font, panel, title, cover, authors = [] }: BackCoverPanelOptions): void {
  const { bg, border } = resolveCoverColor(cover?.coverColor);

  const inkRgb = hex2rgb(border);
  const soft = mixHex(border, bg, 0.16);
  const faint = mixHex(border, bg, 0.42);
  const cx = panel.x + panel.w / 2;
  const panelTopY = panel.y + panel.h;
  const centered = (text: string, yTop: number, size: number, color = inkRgb) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: cx - w / 2, y: panelTopY - (yTop + size), size, font, color });
  };

  // Discreet keyline frame inside the trim.
  const inset = 12;
  page.drawRectangle({
    x: panel.x + inset,
    y: panel.y + inset,
    width: panel.w - 2 * inset,
    height: panel.h - 2 * inset,
    borderColor: faint,
    borderWidth: 1,
  });

  // --- One optically-centred block: motif · imprint · title · credit. -------
  const maxW = panel.w - 2 * inset - 24;

  const bookTitle = nfc(title).toUpperCase();
  let titleSize = 27;
  while (titleSize > 14 && font.widthOfTextAtSize(bookTitle, titleSize) > maxW) titleSize -= 0.5;
  const titleText = ellipsize(font, bookTitle, titleSize, maxW);

  // Credited names: the maker's explicit back-cover names win; otherwise fall
  // back to the contributors auto-derived from the clue-idea notepad.
  const creditNames = parseNameList(cover?.backCoverNames);
  const names = creditNames.length > 0 ? creditNames : authors;
  const hasCredit = names.length > 0;
  const creditLines = hasCredit ? wrapText(font, formatAuthorList(names), 12, maxW) : [];

  // Optional personal line the maker can add under the credit.
  const messageText = nfc((cover?.backCoverMessage ?? "").trim());
  const messageLines = messageText ? wrapText(font, messageText, 11, maxW) : [];

  // Measure the block so it sits optically centred (nudged slightly high).
  const motifH = 24;
  const imprintSize = 14;
  const gapMotif = 24;
  const gapRule = 12;
  const gapAfterRule = 20;
  const titleLineH = titleSize * 1.1;
  const gapCredit = hasCredit ? 22 : 0;
  const creditLabelH = hasCredit ? 11 : 0;
  const creditLineH = 12 * 1.4;
  const gapMessage = messageLines.length > 0 ? 20 : 0;
  const messageLineH = 11 * 1.4;
  const blockH =
    motifH + gapMotif + imprintSize + gapRule + 1 + gapAfterRule + titleLineH +
    gapCredit + creditLabelH + creditLines.length * creditLineH +
    gapMessage + messageLines.length * messageLineH;

  let y = panel.h * 0.44 - blockH / 2; // optical centre, biased above true middle
  if (y < inset + 20) y = inset + 20;

  // Motif.
  drawArrowMotif(page, cx, panelTopY - (y + motifH * 0.5), motifH, faint);
  y += motifH + gapMotif;

  // Imprint wordmark.
  centered("LES FLÈCHES", y, imprintSize, soft);
  y += imprintSize + gapRule;

  // Thin rule.
  const rW = panel.w * 0.13;
  page.drawLine({ start: { x: cx - rW, y: panelTopY - y }, end: { x: cx + rW, y: panelTopY - y }, thickness: 1, color: faint });
  y += 1 + gapAfterRule;

  // Book title — the hero, in the same face as the front cover.
  centered(titleText, y, titleSize);
  y += titleLineH;

  // Maker credit.
  if (hasCredit) {
    y += gapCredit;
    centered("Imaginé avec amour par", y, 10, faint);
    y += creditLabelH;
    for (const line of creditLines) {
      centered(line, y, 12, soft);
      y += creditLineH;
    }
  }

  // Optional personal line.
  if (messageLines.length > 0) {
    y += gapMessage;
    for (const line of messageLines) {
      centered(line, y, 11, soft);
      y += messageLineH;
    }
  }

  // Discreet footer.
  centered("lesfleches.com", panel.h - 26, 9, faint);
}
