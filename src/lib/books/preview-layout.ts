/**
 * On-screen pagination for the auto-generated back-matter (Solutions + word
 * Index). The PDF composers (`compose-solutions-page.ts`, `compose-index-page.ts`)
 * flow these sections across as many pages as they need; the editor preview must
 * do the same, or a long section pours into one page frame and *looks* like it
 * overflows the page when in print it simply spans several pages.
 *
 * These paginators are the on-screen mirror of the PDF ones — pure arithmetic in
 * a fixed design-pixel space (A5 proportions), so a page never overfills. They
 * match the PDF's shape (4 solution columns, 4 index columns) without importing
 * the pdf-lib composers into the client bundle.
 */

import type { GridPage, WordIndexEntry } from "@/types/book";

/** Design-space page box, A5 proportions. The rendered frame scales this. */
export const PREVIEW_PAGE_W = 560;
export const PREVIEW_PAGE_H = Math.round(PREVIEW_PAGE_W * 1.414); // 792
const PAD_X = 36;
const PAD_Y = 32;
export const PREVIEW_USABLE_W = PREVIEW_PAGE_W - 2 * PAD_X; // 488
const USABLE_H = PREVIEW_PAGE_H - 2 * PAD_Y; // 728

// --- Solutions ------------------------------------------------------------
export const SOLUTION_COLS = 4;
export const SOLUTION_TILE_GAP = 12;
const SOLUTION_ROW_GAP = 12;
const SOLUTION_CAPTION_H = 16;
/** Height reserved for the "Solutions" heading band (repeated on every page,
 * mirroring the PDF's "SOLUTIONS (SUITE)"). */
const SOLUTION_HEADER_H = 44;
/** Uniform tile width so every mini-grid lines up in its column. */
export const SOLUTION_TILE_W =
  (PREVIEW_USABLE_W - (SOLUTION_COLS - 1) * SOLUTION_TILE_GAP) / SOLUTION_COLS;

/** Cell size (px) that renders `grid` at exactly one tile-width wide. */
export function solutionCellPx(grid: GridPage): number {
  return SOLUTION_TILE_W / grid.width;
}

/**
 * Split the grids into pages of answer-key tiles, greedily filling four columns
 * per row and starting a new page when the next row would overflow — the same
 * fill order as the PDF, so the preview page count tracks the printed one.
 */
export function paginateSolutionTiles(grids: GridPage[]): GridPage[][] {
  if (grids.length === 0) return [];
  const pages: GridPage[][] = [];
  let cur: GridPage[] = [];
  let cursorTop = SOLUTION_HEADER_H;
  let col = 0;
  let rowH = 0;

  const startPage = () => {
    cur = [];
    pages.push(cur);
    cursorTop = SOLUTION_HEADER_H;
    col = 0;
    rowH = 0;
  };

  startPage();
  for (const grid of grids) {
    const tileH = SOLUTION_CAPTION_H + solutionCellPx(grid) * grid.height;
    if (col >= SOLUTION_COLS) {
      cursorTop += rowH + SOLUTION_ROW_GAP;
      col = 0;
      rowH = 0;
    }
    if (cursorTop + tileH > USABLE_H && cur.length > 0) startPage();
    cur.push(grid);
    col += 1;
    rowH = Math.max(rowH, tileH);
  }
  return pages;
}

// --- Word index -----------------------------------------------------------
export const INDEX_COLS = 4;

export interface IndexLine {
  text: string;
  kind: "header" | "word";
  gapBefore: number;
}
/** One page of the index: `INDEX_COLS` columns of lines. */
export type IndexPage = IndexLine[][];

const IDX_WORD_LINE = 15;
const IDX_HEADER_LINE = 14;
const IDX_GROUP_GAP = 10;
const IDX_HEADER_GAP = 3;
/** Height reserved for the "Index des mots" heading + count on the first page. */
const IDX_HEADER_H = 46;

function buildIndexLines(entries: WordIndexEntry[]): IndexLine[] {
  const lines: IndexLine[] = [];
  entries.forEach((entry, idx) => {
    lines.push({
      text: `${entry.length} lettres`,
      kind: "header",
      gapBefore: idx === 0 ? 0 : IDX_GROUP_GAP,
    });
    const words = entry.words.length > 0 ? entry.words : ["—"];
    words.forEach((text, i) =>
      lines.push({ text, kind: "word", gapBefore: i === 0 ? IDX_HEADER_GAP : 0 }),
    );
  });
  return lines;
}

/**
 * Flow the index lines down four columns per page, wrapping to the next column
 * (then the next page) when a column fills — the on-screen mirror of the PDF
 * index pagination.
 */
export function paginateIndex(entries: WordIndexEntry[]): IndexPage[] {
  const lines = buildIndexLines(entries);
  if (lines.length === 0) return [];
  const pages: IndexPage[] = [];
  let cur: IndexPage = [];
  let col = 0;
  let onFirstPage = true;
  let cursor = 0;

  const columnTop = () => (onFirstPage ? IDX_HEADER_H : 0);
  const startPage = (first: boolean) => {
    onFirstPage = first;
    cur = Array.from({ length: INDEX_COLS }, () => []);
    pages.push(cur);
    col = 0;
    cursor = columnTop();
  };
  const nextColumn = () => {
    if (col < INDEX_COLS - 1) {
      col += 1;
      cursor = columnTop();
    } else {
      startPage(false);
    }
  };

  startPage(true);
  for (const line of lines) {
    const lineH = line.kind === "header" ? IDX_HEADER_LINE : IDX_WORD_LINE;
    if (cursor + line.gapBefore + lineH > USABLE_H) nextColumn();
    cursor += line.gapBefore + lineH;
    cur[col].push(line);
  }
  return pages;
}
