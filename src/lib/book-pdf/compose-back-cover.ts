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
  // Every size/gap below was tuned for the A5 panel; scale them to the actual
  // panel so a larger trim (Crown Quarto) keeps the same visual proportions
  // instead of small text cramped in a big panel. Scale off the HEIGHT factor
  // (the block is a vertical stack) so the layout can never overflow the panel.
  const A5_PANEL_H_PT = (210 * 72) / 25.4;
  const k = panel.h / A5_PANEL_H_PT;
  const S = (n: number) => n * k;
  const centered = (text: string, yTop: number, size: number, color = inkRgb) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: cx - w / 2, y: panelTopY - (yTop + size), size, font, color });
  };

  // Discreet keyline frame inside the trim.
  const inset = S(12);
  page.drawRectangle({
    x: panel.x + inset,
    y: panel.y + inset,
    width: panel.w - 2 * inset,
    height: panel.h - 2 * inset,
    borderColor: faint,
    borderWidth: 1,
  });

  // --- One optically-centred block: motif · imprint · title · credit. -------
  const maxW = panel.w - 2 * inset - S(24);

  const bookTitle = nfc(title).toUpperCase();

  // Credited names: the maker's explicit back-cover names win; otherwise fall
  // back to the contributors auto-derived from the clue-idea notepad.
  const creditNames = parseNameList(cover?.backCoverNames);
  const names = creditNames.length > 0 ? creditNames : authors;
  const hasCredit = names.length > 0;
  const creditText = hasCredit ? formatAuthorList(names) : "";
  // A long group roll-call gets a hair smaller so it reads as an intentional
  // list; the generous leading below is what keeps it from feeling cramped.
  const creditNameSize = S(creditText.length > 90 ? 15 : 17);
  const creditLines = hasCredit ? wrapText(font, creditText, creditNameSize, maxW) : [];

  // Optional personal line the maker can add under the credit.
  const messageText = nfc((cover?.backCoverMessage ?? "").trim());
  const messageSize = S(14);
  const messageLines = messageText ? wrapText(font, messageText, messageSize, maxW) : [];

  // Title is the hero, but when many names sit below it, cap it so the whole
  // stack stays centred and airy instead of crowding the credit.
  let titleSize = S(34);
  while (titleSize > S(18) && font.widthOfTextAtSize(bookTitle, titleSize) > maxW) titleSize -= 0.5;
  if (creditLines.length >= 3) titleSize = Math.min(titleSize, S(27));
  const titleText = ellipsize(font, bookTitle, titleSize, maxW);

  // Measure the block so it sits optically centred (nudged slightly high).
  const motifH = S(28);
  const imprintSize = S(18);
  const gapMotif = S(20);
  const gapRule = S(12);
  const gapAfterRule = S(22);
  const titleLineH = titleSize * 1.1;
  const gapCredit = hasCredit ? S(24) : 0;
  const creditLabelSize = S(12.5);
  const creditLabelH = hasCredit ? creditLabelSize : 0;
  const gapLabelToNames = hasCredit ? S(7) : 0; // air between the label and the names
  const creditLineH = creditNameSize * 1.6; // generous leading so a long list breathes
  const gapMessage = messageLines.length > 0 ? S(22) : 0;
  const messageLineH = messageSize * 1.5;
  const blockH =
    motifH + gapMotif + imprintSize + gapRule + 1 + gapAfterRule + titleLineH +
    gapCredit + creditLabelH + gapLabelToNames + creditLines.length * creditLineH +
    gapMessage + messageLines.length * messageLineH;

  let y = panel.h * 0.44 - blockH / 2; // optical centre, biased above true middle
  if (y < inset + S(20)) y = inset + S(20);

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
    centered("Imaginé avec amour par", y, creditLabelSize, faint);
    y += creditLabelH + gapLabelToNames;
    for (const line of creditLines) {
      centered(line, y, creditNameSize, soft);
      y += creditLineH;
    }
  }

  // Optional personal line.
  if (messageLines.length > 0) {
    y += gapMessage;
    for (const line of messageLines) {
      centered(line, y, messageSize, soft);
      y += messageLineH;
    }
  }

  // Discreet footer.
  centered("lesfleches.com", panel.h - S(26), S(11), faint);
}
