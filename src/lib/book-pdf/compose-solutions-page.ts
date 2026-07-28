/**
 * Compose the back-of-book Solutions section: small plain answer-key grids
 * (grey clue blocks, black letters, no clue text or arrows) tiled per page,
 * mirroring the on-screen SolutionTile. Paginates across as many pages as the
 * grid count needs.
 *
 * The column count is width-aware: we pick the most columns (up to MAX_COLS)
 * that still keep the solution letters above a low floor (letters are drawn at
 * 22/70 of the cell, see draw-grid.ts). These are compact answer-key grids, so
 * we favour more, smaller tiles per page: a typical 11-wide grid lands at the
 * full 4 columns on both A5 and A4. Only unusually wide grids drop to fewer
 * columns to avoid truly microscopic letters.
 *
 * Pagination is pure arithmetic, shared with `countSolutionsPages` so the
 * page-count prediction is exact.
 */

import type { BookFonts } from "@/lib/book-pdf/fonts";
import { hex2rgb, type AddPage, type Geometry } from "@/lib/book-pdf/geometry";
import { drawFlecheGrid } from "@/lib/book-pdf/draw-grid";
import type { GridPage } from "@/types/book";

const INK = "#2f2a26";
const PAGE_BG = "#fff6ec";
const PRIMARY = "#0f4c81";

const MAX_COLS = 4;
const TILE_GAP = 8; // horizontal gap between tiles (pt)
const ROW_GAP = 12; // vertical gap between rows (pt)
const CAPTION_H = 11; // caption band height above each grid (pt)
const CAPTION_SIZE = 8;
/** Solution letters are drawn at 22/70 of the cell edge (draw-grid.ts). */
const LETTER_FRAC = 22 / 70;
/** Legibility floor for the printed solution letters. Kept low so the compact
 * answer-key grids tile at the full MAX_COLS (smaller grids) per page — a
 * typical 11-wide grid lands at 4 columns on A5 (~2.3 pt letters). */
const MIN_LETTER_PT = 2.2;
/** Header block ("SOLUTIONS") height above the first tile row. */
const HEADER_H = 20 + 14;

/** Most columns whose resulting letter size stays ≥ MIN_LETTER_PT for the
 * widest grid in the book. Always at least 1. */
function solutionColumns(grids: GridPage[], g: Geometry): number {
  const widest = Math.max(...grids.map((grid) => grid.width));
  let cols = 1;
  for (let n = 2; n <= MAX_COLS; n++) {
    const tileW = (g.contentW - (n - 1) * TILE_GAP) / n;
    if ((tileW / widest) * LETTER_FRAC >= MIN_LETTER_PT) cols = n;
    else break;
  }
  return cols;
}

interface TilePlacement {
  gridIdx: number;
  col: number;
  yTop: number;
  cellPt: number;
}

function paginateSolutions(grids: GridPage[], g: Geometry): { cols: number; tileW: number; pages: TilePlacement[][] } {
  const cols = solutionColumns(grids, g);
  const tileW = (g.contentW - (cols - 1) * TILE_GAP) / cols;
  const contentBottom = g.contentTop + g.contentH;

  const pages: TilePlacement[][] = [];
  let cur: TilePlacement[] = [];
  let cursorTop = 0;
  let col = 0;
  let rowH = 0;

  const startPage = () => {
    cur = [];
    pages.push(cur);
    cursorTop = g.contentTop + HEADER_H;
    col = 0;
    rowH = 0;
  };
  const wrapRow = () => {
    cursorTop += rowH + ROW_GAP;
    col = 0;
    rowH = 0;
  };

  startPage();
  grids.forEach((grid, i) => {
    const cellPt = tileW / grid.width;
    const tileH = CAPTION_H + cellPt * grid.height;
    if (col >= cols) wrapRow();
    if (cursorTop + tileH > contentBottom && cur.length > 0) startPage();
    cur.push({ gridIdx: i, col, yTop: cursorTop, cellPt });
    col++;
    rowH = Math.max(rowH, tileH);
  });
  return { cols, tileW, pages };
}

/** Exact page count of the solutions section — used by countInteriorPages. */
export function countSolutionsPages(grids: GridPage[], g: Geometry): number {
  if (grids.length === 0) return 0;
  return paginateSolutions(grids, g).pages.length;
}

export interface SolutionsPagesOptions {
  addPage: AddPage;
  /** Base geometry (side-independent metrics: contentW/H, contentTop). */
  g: Geometry;
  fonts: BookFonts;
  grids: GridPage[];
}

export function composeSolutionsPages({ addPage, g, fonts, grids }: SolutionsPagesOptions): void {
  if (grids.length === 0) return;
  const { tileW, pages } = paginateSolutions(grids, g);

  pages.forEach((placements, pi) => {
    const { page, g: pg } = addPage();
    page.drawRectangle({ x: 0, y: 0, width: pg.pageW, height: pg.pageH, color: hex2rgb(PAGE_BG) });
    const hSize = 20;
    page.drawText(pi === 0 ? "SOLUTIONS" : "SOLUTIONS (SUITE)", {
      x: pg.contentX,
      y: pg.pageH - (pg.contentTop + hSize),
      size: hSize,
      font: fonts.heading,
      color: hex2rgb(INK),
    });

    for (const t of placements) {
      const grid = grids[t.gridIdx];
      const x = pg.contentX + t.col * (tileW + TILE_GAP);
      const gridH = t.cellPt * grid.height;

      // Caption "N°i" — "N°" in ink, the number in the brand blue (mirrors SolutionTile).
      const prefix = "N°";
      page.drawText(prefix, {
        x,
        y: pg.pageH - (t.yTop + CAPTION_SIZE),
        size: CAPTION_SIZE,
        font: fonts.heading,
        color: hex2rgb(INK),
      });
      page.drawText(String(t.gridIdx + 1), {
        x: x + fonts.heading.widthOfTextAtSize(prefix, CAPTION_SIZE),
        y: pg.pageH - (t.yTop + CAPTION_SIZE),
        size: CAPTION_SIZE,
        font: fonts.heading,
        color: hex2rgb(PRIMARY),
      });

      const gridTop = t.yTop + CAPTION_H;
      drawFlecheGrid({
        page,
        cells: grid.cells,
        width: grid.width,
        height: grid.height,
        originX: x,
        originTop: gridTop,
        cellPt: t.cellPt,
        pageH: pg.pageH,
        fonts,
        mode: "plain",
        accentHex: grid.config.gridColor,
      });
      // Thin outer frame around the tile for definition.
      page.drawRectangle({
        x,
        y: pg.pageH - (gridTop + gridH),
        width: grid.width * t.cellPt,
        height: gridH,
        borderColor: hex2rgb(INK),
        borderWidth: 0.8,
        opacity: 0,
      });
    }
  });
}
