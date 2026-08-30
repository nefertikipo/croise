/**
 * Solutions section for mots croisés pages: filled grids tiled a few per page,
 * each captioned with its grid number. Parallel to compose-solutions-page.ts
 * (which handles the fléchés answer-key tiles) so the two puzzle types keep
 * separate, clean solution sections.
 */

import { hex2rgb, type Geometry, type AddPage } from "@/lib/book-pdf/geometry";
import type { BookFonts } from "@/lib/book-pdf/fonts";
import { drawCroisesGrid } from "@/lib/book-pdf/compose-croises-page";
import type { AmPuzzle } from "@/lib/crossword/american/types";

const INK = "#2f2a26";
const PAGE_BG = "#fff6ec";
const HEADER_H = 34;
const CAPTION_H = 12;
const TILE_GAP = 14;

export interface CroisesSolution {
  puzzle: AmPuzzle;
  /** Grid number (1-based) shown as the caption; matches the puzzle page. */
  number: number;
}

interface Placement {
  idx: number;
  col: number;
  yTop: number;
  cellPt: number;
}

function paginate(sols: CroisesSolution[], g: Geometry) {
  const cols = 2;
  const tileW = (g.contentW - TILE_GAP * (cols - 1)) / cols;
  const contentBottom = g.contentTop + g.contentH;
  const pages: Placement[][] = [];
  let cur: Placement[] = [];
  let col = 0;
  let cursorTop = g.contentTop + HEADER_H;
  let rowH = 0;

  const startRow = () => {
    col = 0;
    cursorTop += rowH + TILE_GAP;
    rowH = 0;
  };
  const startPage = () => {
    pages.push(cur);
    cur = [];
    col = 0;
    cursorTop = g.contentTop + HEADER_H;
    rowH = 0;
  };

  sols.forEach((s, i) => {
    const cellPt = tileW / s.puzzle.width;
    const tileH = CAPTION_H + cellPt * s.puzzle.height;
    if (col >= cols) startRow();
    if (cursorTop + tileH > contentBottom && cur.length > 0) startPage();
    cur.push({ idx: i, col, yTop: cursorTop, cellPt });
    col++;
    rowH = Math.max(rowH, tileH);
  });
  if (cur.length > 0) pages.push(cur);
  return { cols, tileW, pages };
}

/** Exact page count of the croisés solutions section — used by countInteriorPages. */
export function countCroisesSolutionsPages(sols: CroisesSolution[], g: Geometry): number {
  if (sols.length === 0) return 0;
  return paginate(sols, g).pages.length;
}

export interface CroisesSolutionsOptions {
  addPage: AddPage;
  g: Geometry;
  fonts: BookFonts;
  sols: CroisesSolution[];
  mono?: boolean;
}

export function composeCroisesSolutionsPages({
  addPage,
  g,
  fonts,
  sols,
  mono,
}: CroisesSolutionsOptions): void {
  if (sols.length === 0) return;
  const { tileW, pages } = paginate(sols, g);

  pages.forEach((placements, pi) => {
    const { page, g: pg } = addPage();
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pg.pageW,
      height: pg.pageH,
      color: mono ? hex2rgb("#ffffff") : hex2rgb(PAGE_BG),
    });
    const hSize = 20;
    page.drawText(pi === 0 ? "SOLUTIONS — MOTS CROISÉS" : "SOLUTIONS — MOTS CROISÉS (SUITE)", {
      x: pg.contentX,
      y: pg.pageH - (pg.contentTop + hSize),
      size: hSize,
      font: fonts.heading,
      color: hex2rgb(INK),
    });

    for (const t of placements) {
      const s = sols[t.idx];
      const x = pg.contentX + t.col * (tileW + TILE_GAP);
      page.drawText(`N°${s.number}`, {
        x,
        y: pg.pageH - (t.yTop + 8),
        size: 8,
        font: fonts.heading,
        color: hex2rgb(INK),
      });
      drawCroisesGrid(page, s.puzzle, fonts, x, t.yTop + CAPTION_H, t.cellPt, pg.pageH, true);
    }
  });
}
