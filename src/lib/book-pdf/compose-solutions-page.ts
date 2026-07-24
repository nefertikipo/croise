/**
 * Compose the back-of-book Solutions section: small plain answer-key grids
 * (grey clue blocks, black letters, no clue text or arrows) tiled several per
 * page — the classic mots fléchés solutions look, mirroring the on-screen
 * SolutionTile. Paginates across as many pages as the grid count needs.
 */

import { type PDFDocument, type PDFPage } from "pdf-lib";
import type { BookFonts } from "@/lib/book-pdf/fonts";
import { drawFlecheGrid } from "@/lib/book-pdf/draw-grid";
import { drawCropMarks, hex2rgb, type Geometry } from "@/lib/book-pdf/geometry";
import type { GridPage } from "@/types/book";

const INK = "#2f2a26";
const PAGE_BG = "#fff6ec";
const PRIMARY = "#0f4c81";

/* Four tiles across: a default 11×17 grid then tiles ~4-across on A5, so a full
   4×N solutions block fits one page — real-magazine density. */
const COLS = 4;
const TILE_GAP = 8; // horizontal gap between tiles (pt)
const ROW_GAP = 12; // vertical gap between rows (pt)
const CAPTION_H = 11; // caption band height above each grid (pt)
const CAPTION_SIZE = 8;

export interface SolutionsPagesOptions {
  doc: PDFDocument;
  g: Geometry;
  fonts: BookFonts;
  grids: GridPage[];
}

export function composeSolutionsPages({ doc, g, fonts, grids }: SolutionsPagesOptions): PDFPage[] {
  const pages: PDFPage[] = [];
  const contentBottom = g.contentTop + g.contentH;
  const tileW = (g.contentW - (COLS - 1) * TILE_GAP) / COLS;

  let page!: PDFPage;
  let cursorTop = 0; // top-left y (pt from page top) of the current row
  let col = 0;
  let rowH = 0; // tallest tile in the current row

  const newPage = (first: boolean) => {
    page = doc.addPage([g.pageW, g.pageH]);
    pages.push(page);
    page.drawRectangle({ x: 0, y: 0, width: g.pageW, height: g.pageH, color: hex2rgb(PAGE_BG) });
    drawCropMarks(page, g);
    const hSize = 20;
    page.drawText(first ? "SOLUTIONS" : "SOLUTIONS (SUITE)", {
      x: g.contentX,
      y: g.pageH - (g.contentTop + hSize),
      size: hSize,
      font: fonts.heading,
      color: hex2rgb(INK),
    });
    cursorTop = g.contentTop + hSize + 14;
    col = 0;
    rowH = 0;
  };

  const wrapRow = () => {
    cursorTop += rowH + ROW_GAP;
    col = 0;
    rowH = 0;
  };

  newPage(true);
  grids.forEach((grid, i) => {
    const cellPt = tileW / grid.width;
    const gridH = cellPt * grid.height;
    const tileH = CAPTION_H + gridH;

    if (col >= COLS) wrapRow();
    if (cursorTop + tileH > contentBottom) newPage(false);

    const x = g.contentX + col * (tileW + TILE_GAP);

    // Caption "N°i" — "N°" in ink, the number in the brand blue (mirrors SolutionTile).
    const prefix = "N°";
    page.drawText(prefix, {
      x,
      y: g.pageH - (cursorTop + CAPTION_SIZE),
      size: CAPTION_SIZE,
      font: fonts.heading,
      color: hex2rgb(INK),
    });
    page.drawText(String(i + 1), {
      x: x + fonts.heading.widthOfTextAtSize(prefix, CAPTION_SIZE),
      y: g.pageH - (cursorTop + CAPTION_SIZE),
      size: CAPTION_SIZE,
      font: fonts.heading,
      color: hex2rgb(PRIMARY),
    });

    const gridTop = cursorTop + CAPTION_H;
    drawFlecheGrid({
      page,
      cells: grid.cells,
      width: grid.width,
      height: grid.height,
      originX: x,
      originTop: gridTop,
      cellPt,
      pageH: g.pageH,
      fonts,
      mode: "plain",
      accentHex: grid.config.gridColor,
    });
    // Thin outer frame around the tile for definition.
    page.drawRectangle({
      x,
      y: g.pageH - (gridTop + gridH),
      width: grid.width * cellPt,
      height: gridH,
      borderColor: hex2rgb(INK),
      borderWidth: 0.8,
      opacity: 0,
    });

    col++;
    rowH = Math.max(rowH, tileH);
  });

  return pages;
}
