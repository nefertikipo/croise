/**
 * Compose the back-of-book word index: every answer, alphabetical, grouped by
 * grid, flowed into two balanced columns and paginated across as many pages as
 * needed. Mirrors the on-screen WordIndexPage.
 */

import { type PDFDocument, type PDFPage } from "pdf-lib";
import type { BookFonts } from "@/lib/book-pdf/fonts";
import { drawCropMarks, hex2rgb, mixHex, type Geometry } from "@/lib/book-pdf/geometry";
import { DEFAULT_ACCENT_HEX } from "@/lib/book-pdf/draw-grid";
import type { WordIndexEntry } from "@/types/book";

const INK = "#2f2a26";
const PAGE_BG = "#fff6ec";

interface Line {
  text: string;
  size: number;
  font: BookFonts["clue"];
  colorHex: string;
  gapBefore: number;
}

/** Wrap `words` joined by " · " into lines no wider than `w` at `size`. */
function wrapWordList(font: BookFonts["clue"], words: string[], size: number, w: number): string[] {
  if (words.length === 0) return ["—"];
  const sep = " · ";
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const cand = cur ? cur + sep + word : word;
    if (font.widthOfTextAtSize(cand, size) <= w || !cur) cur = cand;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export interface IndexPagesOptions {
  doc: PDFDocument;
  g: Geometry;
  fonts: BookFonts;
  entries: WordIndexEntry[];
  accentHex?: string;
}

export function composeIndexPages({ doc, g, fonts, entries, accentHex }: IndexPagesOptions): PDFPage[] {
  const accent = accentHex || DEFAULT_ACCENT_HEX;
  const bodySize = 8.5;
  const bodyLine = bodySize * 1.4;
  const headerSize = 8;
  const colGap = 18;
  const colW = (g.contentW - colGap) / 2;
  const total = entries.reduce((n, e) => n + e.words.length, 0);

  // Flatten to a list of drawable lines.
  const lines: Line[] = [];
  entries.forEach((entry, idx) => {
    lines.push({ text: `GRILLE ${entry.grid}`, size: headerSize, font: fonts.bold, colorHex: accent, gapBefore: idx === 0 ? 0 : 9 });
    const body = wrapWordList(fonts.letter, entry.words, bodySize, colW);
    body.forEach((t, i) => lines.push({ text: t, size: bodySize, font: fonts.letter, colorHex: INK, gapBefore: i === 0 ? 2 : 0 }));
  });

  const pages: PDFPage[] = [];
  const contentBottom = g.contentTop + g.contentH;
  let page!: PDFPage;
  let col = 0;
  let cursor = 0;
  let colX = 0;

  const newPage = (first: boolean) => {
    page = doc.addPage([g.pageW, g.pageH]);
    pages.push(page);
    page.drawRectangle({ x: 0, y: 0, width: g.pageW, height: g.pageH, color: hex2rgb(PAGE_BG) });
    drawCropMarks(page, g);
    let top = g.contentTop;
    if (first) {
      const hSize = 20;
      page.drawText("INDEX DES MOTS", { x: g.contentX, y: g.pageH - (top + hSize), size: hSize, font: fonts.heading, color: hex2rgb(INK) });
      top += hSize + 4;
      const sub = `${total} MOTS`;
      page.drawText(sub, { x: g.contentX, y: g.pageH - (top + 8), size: 8, font: fonts.letter, color: mixHex(INK, PAGE_BG, 0.5) });
      top += 8 + 10;
    }
    col = 0;
    cursor = top;
    colX = g.contentX;
  };

  const nextColumn = () => {
    if (col === 0) {
      col = 1;
      colX = g.contentX + colW + colGap;
      cursor = g.contentTop;
    } else {
      newPage(false);
    }
  };

  newPage(true);
  for (const line of lines) {
    if (cursor + line.gapBefore + line.size > contentBottom) nextColumn();
    cursor += line.gapBefore;
    page.drawText(line.text, { x: colX, y: g.pageH - (cursor + line.size), size: line.size, font: line.font, color: hex2rgb(line.colorHex) });
    cursor += bodyLine;
  }

  return pages;
}
