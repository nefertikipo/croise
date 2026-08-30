/**
 * Compose one interior mots croisés (American) grid page: the same editorial
 * title band as the fléchés grid page, the numbered grid scaled into the top
 * region, and the Across/Down clue lists auto-fitted into columns beneath it.
 * Mirrors composeGridPage's contract so generate-book can dispatch on page kind.
 */

import { type PDFPage, rgb } from "pdf-lib";
import type { BookFonts } from "@/lib/book-pdf/fonts";
import { hex2rgb, mixHex, type Geometry } from "@/lib/book-pdf/geometry";
import { ellipsize, nfc } from "@/lib/book-pdf/text";
import type { GridMode } from "@/lib/book-pdf/draw-grid";
import type { AmPuzzle, AmClue } from "@/lib/crossword/american/types";

const INK = "#2f2a26";
const PAGE_BG = "#fff6ec";

export interface CroisesPageOptions {
  page: PDFPage;
  g: Geometry;
  fonts: BookFonts;
  puzzle: AmPuzzle;
  gridNumber: number;
  mode: GridMode;
  headingOverride?: string;
  mono?: boolean;
}

/**
 * Draw a croisés grid (black blocks + numbered white cells, optional letters)
 * with its top-left at (originX, originTop) in top-down coords. Shared with the
 * solutions composer. `pageH` is used for the pdf-lib bottom-left y-flip.
 */
export function drawCroisesGrid(
  page: PDFPage,
  puzzle: AmPuzzle,
  fonts: BookFonts,
  originX: number,
  originTop: number,
  cellPt: number,
  pageH: number,
  withLetters: boolean,
  accentHex?: string,
) {
  const ink = hex2rgb(INK);
  const blockColor = accentHex ? hex2rgb(accentHex) : ink;
  for (let r = 0; r < puzzle.height; r++) {
    for (let c = 0; c < puzzle.width; c++) {
      const cell = puzzle.cells[r][c];
      const x = originX + c * cellPt;
      const yBottom = pageH - (originTop + (r + 1) * cellPt);
      if (cell.kind === "block") {
        page.drawRectangle({ x, y: yBottom, width: cellPt, height: cellPt, color: blockColor });
        continue;
      }
      page.drawRectangle({
        x,
        y: yBottom,
        width: cellPt,
        height: cellPt,
        borderColor: rgb(0.2, 0.2, 0.2),
        borderWidth: 0.5,
      });
      if (cell.number != null) {
        const ns = Math.max(4, cellPt * 0.26);
        page.drawText(String(cell.number), {
          x: x + 1,
          y: yBottom + cellPt - ns - 0.5,
          size: ns,
          font: fonts.clue,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
      if (withLetters && cell.letter) {
        const ls = cellPt * 0.56;
        const lw = fonts.letter.widthOfTextAtSize(cell.letter, ls);
        page.drawText(cell.letter, {
          x: x + (cellPt - lw) / 2,
          y: yBottom + (cellPt - ls) / 2 + ls * 0.12,
          size: ls,
          font: fonts.letter,
          color: ink,
        });
      }
    }
  }
  page.drawRectangle({
    x: originX,
    y: pageH - (originTop + puzzle.height * cellPt),
    width: puzzle.width * cellPt,
    height: puzzle.height * cellPt,
    borderColor: ink,
    borderWidth: 1.4,
    opacity: 0,
  });
}

function wrapLines(text: string, font: BookFonts["clue"], size: number, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxW || !line) line = trial;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function composeCroisesPage({
  page,
  g,
  fonts,
  puzzle,
  gridNumber,
  mode,
  headingOverride,
  mono,
}: CroisesPageOptions): void {
  const inkRgb = hex2rgb(INK);
  const muted = mixHex(INK, PAGE_BG, 0.5);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: g.pageW,
    height: g.pageH,
    color: mono ? hex2rgb("#ffffff") : hex2rgb(PAGE_BG),
  });

  // ---- Title band (identical treatment to the fléchés grid page) ----
  const headTop = g.contentTop;
  const heading = nfc(headingOverride ?? `Mots croisés N°${gridNumber}`);
  const headSize = 15;
  const meta = `${puzzle.width}×${puzzle.height}`;
  const metaSize = 7;
  const metaW = fonts.letter.widthOfTextAtSize(meta.toUpperCase(), metaSize);
  const headMaxW = g.contentW - metaW - 10;
  let headText = heading.toUpperCase();
  let headDrawSize = headSize;
  while (headDrawSize > 8 && fonts.heading.widthOfTextAtSize(headText, headDrawSize) > headMaxW)
    headDrawSize -= 0.5;
  headText = ellipsize(fonts.heading, headText, headDrawSize, headMaxW);
  page.drawText(headText, {
    x: g.contentX,
    y: g.pageH - (headTop + headSize),
    size: headDrawSize,
    font: fonts.heading,
    color: inkRgb,
  });
  page.drawText(meta.toUpperCase(), {
    x: g.contentX + g.contentW - metaW,
    y: g.pageH - (headTop + headSize - 2),
    size: metaSize,
    font: fonts.letter,
    color: muted,
  });
  const ruleY = g.pageH - (headTop + headSize + 5);
  page.drawLine({
    start: { x: g.contentX, y: ruleY },
    end: { x: g.contentX + g.contentW, y: ruleY },
    thickness: 1.5,
    color: inkRgb,
  });

  // ---- Grid (top region) + clue lists (below), sharing the safe area ----
  const gridTop = headTop + headSize + 12;
  const fullAvailH = g.contentTop + g.contentH - gridTop;
  // Give the grid up to ~58% of the free height; the clue lists take the rest.
  const gridRegionH = fullAvailH * 0.58;
  const cellPt = Math.min(g.contentW / puzzle.width, gridRegionH / puzzle.height);
  const gridW = cellPt * puzzle.width;
  const gridH = cellPt * puzzle.height;
  const originX = g.contentX + (g.contentW - gridW) / 2;

  drawCroisesGrid(page, puzzle, fonts, originX, gridTop, cellPt, g.pageH, mode !== "puzzle");

  // ---- Across / Down clue lists, auto-fit into columns below the grid ----
  const clueTop = gridTop + gridH + 14;
  const clueAreaH = g.contentTop + g.contentH - clueTop;
  const COLS = g.contentW > 300 ? 3 : 2;
  const gutter = 10;
  const colW = (g.contentW - gutter * (COLS - 1)) / COLS;

  // Pre-wrap at a trial size, then shrink until everything fits the columns.
  const blocks: { text: string; heading?: boolean }[] = [];
  const push = (label: string, clues: AmClue[]) => {
    blocks.push({ text: label, heading: true });
    for (const c of clues) blocks.push({ text: `${c.number}. ${c.clue}` });
  };
  push("HORIZONTAL", puzzle.across);
  push("VERTICAL", puzzle.down);

  const fits = (size: number): boolean => {
    const lead = size * 1.28;
    const headLead = size * 1.5 + 3;
    let col = 0;
    let y = 0;
    const capacity = clueAreaH;
    for (const b of blocks) {
      if (b.heading) {
        if (y + headLead > capacity) {
          col++;
          y = 0;
          if (col >= COLS) return false;
        }
        y += headLead;
      } else {
        const lines = wrapLines(b.text, fonts.clue, size, colW);
        const need = lines.length * lead + 1.5;
        if (y + need > capacity) {
          col++;
          y = 0;
          if (col >= COLS) return false;
        }
        y += need;
      }
    }
    return true;
  };

  let size = 8;
  while (size > 4.5 && !fits(size)) size -= 0.25;

  // Draw at the chosen size.
  const lead = size * 1.28;
  const headLead = size * 1.5 + 3;
  const headSizeClue = size + 1.5;
  let col = 0;
  let y = clueTop;
  const colX = (i: number) => g.contentX + i * (colW + gutter);
  const advanceColumn = () => {
    col++;
    y = clueTop;
  };
  for (const b of blocks) {
    if (col >= COLS) break; // safety: never overflow the page
    if (b.heading) {
      if (y + headLead > g.contentTop + g.contentH) {
        advanceColumn();
        if (col >= COLS) break;
      }
      page.drawText(b.text, {
        x: colX(col),
        y: g.pageH - (y + headSizeClue),
        size: headSizeClue,
        font: fonts.heading,
        color: inkRgb,
      });
      y += headLead;
    } else {
      const lines = wrapLines(b.text, fonts.clue, size, colW);
      const need = lines.length * lead + 1.5;
      if (y + need > g.contentTop + g.contentH) {
        advanceColumn();
        if (col >= COLS) break;
      }
      for (const line of lines) {
        page.drawText(line, {
          x: colX(col),
          y: g.pageH - (y + size),
          size,
          font: fonts.clue,
          color: hex2rgb(INK),
        });
        y += lead;
      }
      y += 1.5;
    }
  }
}
