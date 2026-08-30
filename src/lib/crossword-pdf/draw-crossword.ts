// =============================================================================
// crossword-pdf/draw-crossword.ts — print-ready PDF for American crosswords
// =============================================================================
// A4 puzzle page(s): the grid (black blocks + numbered white cells) with the
// Across/Down clue lists flowing in columns beneath it, plus a final solution
// page with the grid filled in. Vector drawing via pdf-lib; fonts reuse the
// book engine (Barlow for grid letters, Inter for clues, Anton for headings).
// Self-contained — does not touch the fléchés PDF pipeline.
// =============================================================================

import { PDFDocument, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { embedBookFonts, type BookFonts } from "@/lib/book-pdf/fonts";
import type { AmPuzzle, AmClue } from "@/lib/crossword/american/types";

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 42;
const USABLE_W = A4.w - MARGIN * 2;
const BLACK = rgb(0, 0, 0);
const GREY = rgb(0.6, 0.6, 0.6);

export type CrosswordPdfMode = "both" | "puzzle" | "solution";

export interface CrosswordPdfOptions {
  title?: string;
  code?: string;
  mode?: CrosswordPdfMode;
}

/** Wrap `text` to fit `maxWidth` at `size` in `font`. */
function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth || !line) line = trial;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draw the grid with its top-left at (x, topY). Returns the drawn height. */
function drawGrid(
  page: PDFPage,
  puzzle: AmPuzzle,
  fonts: BookFonts,
  x: number,
  topY: number,
  cell: number,
  withLetters: boolean,
): number {
  const gridH = puzzle.height * cell;
  const gridW = puzzle.width * cell;

  for (let r = 0; r < puzzle.height; r++) {
    for (let c = 0; c < puzzle.width; c++) {
      const cx = x + c * cell;
      const cy = topY - (r + 1) * cell; // pdf-lib y grows upward
      const model = puzzle.cells[r][c];
      if (model.kind === "block") {
        page.drawRectangle({ x: cx, y: cy, width: cell, height: cell, color: BLACK });
        continue;
      }
      page.drawRectangle({
        x: cx,
        y: cy,
        width: cell,
        height: cell,
        borderColor: rgb(0.15, 0.15, 0.15),
        borderWidth: 0.6,
      });
      if (model.number != null) {
        const ns = Math.max(5, cell * 0.28);
        page.drawText(String(model.number), {
          x: cx + 1.2,
          y: cy + cell - ns - 0.5,
          size: ns,
          font: fonts.clue,
          color: rgb(0.25, 0.25, 0.25),
        });
      }
      if (withLetters && model.letter) {
        const ls = cell * 0.58;
        const lw = fonts.letter.widthOfTextAtSize(model.letter, ls);
        page.drawText(model.letter, {
          x: cx + (cell - lw) / 2,
          y: cy + (cell - ls) / 2 + ls * 0.12,
          size: ls,
          font: fonts.letter,
          color: BLACK,
        });
      }
    }
  }
  // outer frame
  page.drawRectangle({
    x,
    y: topY - gridH,
    width: gridW,
    height: gridH,
    borderColor: BLACK,
    borderWidth: 1.4,
  });
  return gridH;
}

/** A flowing multi-column layout for the two clue lists. */
function drawClues(
  doc: PDFDocument,
  firstPage: PDFPage,
  firstTop: number,
  fonts: BookFonts,
  across: AmClue[],
  down: AmClue[],
) {
  const COLS = 3;
  const gutter = 16;
  const colW = (USABLE_W - gutter * (COLS - 1)) / COLS;
  const size = 8.5;
  const lead = 11;
  const headSize = 10;

  let page = firstPage;
  let col = 0;
  // On page 1 all columns start below the grid; on overflow pages, at the top.
  let colTop = firstTop;
  let y = colTop;
  const colX = (i: number) => MARGIN + i * (colW + gutter);
  const bottom = MARGIN + 10;

  const nextColumn = () => {
    col++;
    if (col >= COLS) {
      page = doc.addPage([A4.w, A4.h]);
      col = 0;
      colTop = A4.h - MARGIN;
    }
    y = colTop;
  };
  const ensure = (needed: number) => {
    if (y - needed < bottom) nextColumn();
  };

  const drawHeading = (label: string) => {
    ensure(lead * 2);
    page.drawText(label, {
      x: colX(col),
      y: y - headSize,
      size: headSize,
      font: fonts.heading,
      color: BLACK,
    });
    y -= headSize + 6;
  };

  const drawList = (label: string, clues: AmClue[]) => {
    drawHeading(label);
    for (const clue of clues) {
      const text = `${clue.number}. ${clue.clue}`;
      const lines = wrapLines(text, fonts.clue, size, colW);
      ensure(lines.length * lead);
      for (const line of lines) {
        page.drawText(line, {
          x: colX(col),
          y: y - size,
          size,
          font: fonts.clue,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lead;
      }
      y -= 1.5;
    }
    y -= 8;
  };

  drawList("HORIZONTAL", across);
  drawList("VERTICAL", down);
}

function drawHeader(page: PDFPage, fonts: BookFonts, title: string, subtitle?: string): number {
  let y = A4.h - MARGIN;
  page.drawText(title, { x: MARGIN, y: y - 20, size: 20, font: fonts.heading, color: BLACK });
  y -= 26;
  if (subtitle) {
    page.drawText(subtitle, { x: MARGIN, y: y - 9, size: 9, font: fonts.clue, color: GREY });
    y -= 14;
  }
  return y - 10;
}

export async function generateCrosswordPdf(
  puzzle: AmPuzzle,
  options: CrosswordPdfOptions = {},
): Promise<Uint8Array> {
  const mode = options.mode ?? "both";
  const title = options.title ?? "Mots croisés";

  const doc = await PDFDocument.create();
  const fonts = await embedBookFonts(doc);

  if (mode !== "solution") {
    const page = doc.addPage([A4.w, A4.h]);
    const afterHeader = drawHeader(page, fonts, title, options.code);
    // Cap the grid so clue columns get room on the same page.
    const cell = Math.min(USABLE_W / puzzle.width, 460 / puzzle.width, 28);
    const gridW = puzzle.width * cell;
    const gridX = MARGIN + (USABLE_W - gridW) / 2;
    const gridH = drawGrid(page, puzzle, fonts, gridX, afterHeader, cell, false);
    drawClues(doc, page, afterHeader - gridH - 22, fonts, puzzle.across, puzzle.down);
  }

  if (mode !== "puzzle") {
    const page = doc.addPage([A4.w, A4.h]);
    const afterHeader = drawHeader(page, fonts, `${title} — solution`, options.code);
    const cell = Math.min(USABLE_W / puzzle.width, 420 / puzzle.width, 26);
    const gridW = puzzle.width * cell;
    const gridX = MARGIN + (USABLE_W - gridW) / 2;
    drawGrid(page, puzzle, fonts, gridX, afterHeader, cell, true);
  }

  return doc.save();
}
