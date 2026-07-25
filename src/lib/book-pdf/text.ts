/**
 * Small text utilities for the PDF engine.
 *
 * `nfc` MUST be applied to every user-provided string before it is drawn:
 * decomposed combining marks (NFD input from macOS uploads, pasted text…) are
 * not in the subset-embedded fonts' cmaps and crash `doc.save()`.
 */

import type { PDFFont } from "pdf-lib";

/** Normalize a user string to NFC so accented chars map to single glyphs. */
export const nfc = (s: string) => s.normalize("NFC");

/** Truncate `text` with an ellipsis so it fits `maxW` at `size`. */
export function ellipsize(font: PDFFont, text: string, size: number, maxW: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  const ell = "…";
  let cut = text;
  while (cut.length > 1 && font.widthOfTextAtSize(cut + ell, size) > maxW) {
    cut = cut.slice(0, -1).trimEnd();
  }
  return cut + ell;
}

/** Greedy word-wrap of one paragraph into lines no wider than `maxW`. */
export function wrapText(font: PDFFont, text: string, size: number, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const cand = cur ? `${cur} ${word}` : word;
    if (font.widthOfTextAtSize(cand, size) <= maxW || !cur) cur = cand;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Wrap a multi-paragraph text (respecting \n, like whitespace-pre-wrap). */
export function wrapParagraphs(font: PDFFont, text: string, size: number, maxW: number): string[] {
  return text.split("\n").flatMap((para) => (para.trim() === "" ? [""] : wrapText(font, para, size, maxW)));
}
