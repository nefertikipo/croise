/**
 * Compose one interior grid page (puzzle or solution) onto a pdf-lib page:
 * an editorial title band, the fléchés grid scaled to fit the safe area, and a
 * "mot caché" write-in strip when the grid hides a word. Mirrors the on-screen
 * GridPageView layout so the printed book matches the editor.
 */

import { type PDFPage } from "pdf-lib";
import type { BookFonts } from "@/lib/book-pdf/fonts";
import { drawFlecheGrid, type GridMode } from "@/lib/book-pdf/draw-grid";
import { hex2rgb, mixHex, type Geometry } from "@/lib/book-pdf/geometry";
import { findHiddenWordCells, normalizeHiddenWord } from "@/lib/crossword/hidden-word";
import type { GridPage } from "@/types/book";

const INK = "#2f2a26";
const PAPER = "#fffcf5";
const PAGE_BG = "#fff6ec";
const PRIMARY = "#0f4c81";

export interface GridPageOptions {
  page: PDFPage;
  g: Geometry;
  fonts: BookFonts;
  grid: GridPage;
  gridNumber: number;
  mode: GridMode;
  /** Heading override, e.g. "Solution — Grille 3". */
  headingOverride?: string;
}

export function composeGridPage({ page, g, fonts, grid, gridNumber, mode, headingOverride }: GridPageOptions) {
  const inkRgb = hex2rgb(INK);
  const muted = mixHex(INK, PAGE_BG, 0.5);

  // Page background across the full bleed.
  page.drawRectangle({ x: 0, y: 0, width: g.pageW, height: g.pageH, color: hex2rgb(PAGE_BG) });

  const hidden = grid.config.hiddenWord ?? "";
  const hiddenCells = hidden
    ? findHiddenWordCells({ width: grid.width, height: grid.height, cells: grid.cells }, hidden)
    : new Map<string, number>();
  const cleanHidden = normalizeHiddenWord(hidden);
  const hasStrip = hiddenCells.size > 0;

  // ---- Title band ----
  const headTop = g.contentTop;
  const heading = headingOverride ?? grid.config.title ?? `Grille N°${gridNumber}`;
  const headSize = 15;
  page.drawText(heading.toUpperCase(), {
    x: g.contentX,
    y: g.pageH - (headTop + headSize),
    size: headSize,
    font: fonts.heading,
    color: inkRgb,
  });
  const meta = `${grid.width}×${grid.height}` + (grid.config.difficulty && grid.config.difficulty !== "balanced" ? ` · ${grid.config.difficulty}` : "");
  const metaSize = 7;
  const metaW = fonts.letter.widthOfTextAtSize(meta.toUpperCase(), metaSize);
  page.drawText(meta.toUpperCase(), {
    x: g.contentX + g.contentW - metaW,
    y: g.pageH - (headTop + headSize - 2),
    size: metaSize,
    font: fonts.letter,
    color: muted,
  });
  const ruleY = g.pageH - (headTop + headSize + 5);
  page.drawLine({ start: { x: g.contentX, y: ruleY }, end: { x: g.contentX + g.contentW, y: ruleY }, thickness: 1.5, color: inkRgb });

  // ---- Grid, scaled to fit the area between the band and the strip ----
  const gridTop = headTop + headSize + 16;
  const stripH = hasStrip ? 40 : 0;
  const availH = g.contentTop + g.contentH - gridTop - stripH;
  const cellPt = Math.min(g.contentW / grid.width, availH / grid.height);
  const gridW = cellPt * grid.width;
  const gridH = cellPt * grid.height;
  const originX = g.contentX + (g.contentW - gridW) / 2;
  // Vertically centre in the free area so a portrait grid on a taller page (A4)
  // sits balanced rather than hugging the title band.
  const originTop = gridTop + Math.max(0, (availH - gridH) / 2);

  drawFlecheGrid({
    page,
    cells: grid.cells,
    width: grid.width,
    height: grid.height,
    originX,
    originTop,
    cellPt,
    pageH: g.pageH,
    fonts,
    mode,
    accentHex: grid.config.gridColor,
    hidden: hasStrip ? hiddenCells : undefined,
  });
  // Heavier outer frame around the whole grid.
  page.drawRectangle({
    x: originX,
    y: g.pageH - (originTop + gridH),
    width: gridW,
    height: gridH,
    borderColor: inkRgb,
    borderWidth: 1.4,
    opacity: 0,
  });

  // ---- Mot caché strip ----
  if (hasStrip) {
    const showLetters = mode !== "puzzle";
    const stripTop = originTop + gridH + 12;
    const box = 20;
    const gap = 4;
    const labelSize = 7;
    const label = "MOT CACHÉ";
    page.drawText(label, {
      x: g.contentX,
      y: g.pageH - (stripTop + box / 2 + labelSize / 2 - 1),
      size: labelSize,
      font: fonts.bold,
      color: inkRgb,
    });
    const labelW = fonts.bold.widthOfTextAtSize(label, labelSize) + 12;
    let bx = g.contentX + labelW;
    for (let i = 0; i < hiddenCells.size; i++) {
      const by = g.pageH - (stripTop + box);
      page.drawRectangle({ x: bx, y: by, width: box, height: box, color: hex2rgb(PAPER), borderColor: hex2rgb(PRIMARY), borderWidth: 1.4 });
      page.drawText(String(i + 1), { x: bx + 1.5, y: by + box - 7, size: 6, font: fonts.bold, color: hex2rgb(PRIMARY) });
      if (showLetters && cleanHidden[i]) {
        const ls = 12;
        const lw = fonts.letter.widthOfTextAtSize(cleanHidden[i], ls);
        page.drawText(cleanHidden[i], { x: bx + (box - lw) / 2, y: by + (box - ls * 0.7) / 2, size: ls, font: fonts.letter, color: inkRgb });
      }
      bx += box + gap;
      if (bx + box > g.contentX + g.contentW) break; // one row for now
    }
  }
}
