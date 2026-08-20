/**
 * Compose the back-of-book word index: every answer, grouped by word length
 * (shortest first) and alphabetical within each group, ONE WORD PER LINE (the
 * screen WordIndexPage is the source of truth), flowed into four columns and
 * paginated across as many pages as needed.
 *
 * Pagination is pure arithmetic (no font metrics — one word per line means no
 * width-dependent wrapping), shared between `composeIndexPages` and
 * `countIndexPages` so the page-count prediction is exact.
 */

import type { BookFonts } from "@/lib/book-pdf/fonts";
import { hex2rgb, mixHex, type AddPage, type Geometry } from "@/lib/book-pdf/geometry";
import { DEFAULT_ACCENT_HEX } from "@/lib/book-pdf/draw-grid";
import { nfc } from "@/lib/book-pdf/text";
import type { WordIndexEntry } from "@/types/book";

const INK = "#2f2a26";
const PAGE_BG = "#fff6ec";

const BODY_SIZE = 8.5;
const BODY_LINE = BODY_SIZE * 1.4;
const HEADER_SIZE = 8;
const COLS = 4;
const COL_GAP = 12;
/** Vertical room taken by the "INDEX DES MOTS" heading block on page 1. */
const FIRST_PAGE_HEADER_H = 20 + 4 + 8 + 10;
/** Extra breathing room kept below the last line of each column, so the tightly
 * packed word lists don't run right up to the (now 10 mm) bottom margin. */
const COLUMN_BOTTOM_PAD = 10;

interface Line {
  text: string;
  size: number;
  kind: "header" | "word";
  gapBefore: number;
}

interface PlacedLine {
  line: Line;
  col: number;
  yTop: number;
}

function buildLines(entries: WordIndexEntry[]): Line[] {
  const lines: Line[] = [];
  entries.forEach((entry, idx) => {
    lines.push({ text: `${entry.length} LETTRES`, size: HEADER_SIZE, kind: "header", gapBefore: idx === 0 ? 0 : 9 });
    const words = entry.words.length > 0 ? entry.words.map(nfc) : ["—"];
    words.forEach((text, i) => lines.push({ text, size: BODY_SIZE, kind: "word", gapBefore: i === 0 ? 2 : 0 }));
  });
  return lines;
}

/** Flow the lines into columns/pages. Deterministic — geometry only. */
function paginateIndex(entries: WordIndexEntry[], g: Geometry): PlacedLine[][] {
  const lines = buildLines(entries);
  const contentBottom = g.contentTop + g.contentH - COLUMN_BOTTOM_PAD;
  const pages: PlacedLine[][] = [];
  let cur: PlacedLine[] = [];
  let col = 0;
  let cursor = 0;
  // Top of every column on the current page. On page 1 the full-width heading
  // block reserves the top band, so all columns (not just the first) start
  // below it — otherwise the narrow columns 2–4 would run under the title.
  let pageTop = 0;

  const startPage = (first: boolean) => {
    cur = [];
    pages.push(cur);
    col = 0;
    pageTop = g.contentTop + (first ? FIRST_PAGE_HEADER_H : 0);
    cursor = pageTop;
  };
  const nextColumn = () => {
    if (col < COLS - 1) {
      col++;
      cursor = pageTop;
    } else {
      startPage(false);
    }
  };

  startPage(true);
  for (const line of lines) {
    if (cursor + line.gapBefore + line.size > contentBottom) nextColumn();
    cursor += line.gapBefore;
    cur.push({ line, col, yTop: cursor });
    cursor += BODY_LINE;
  }
  return pages;
}

/** Exact page count of the index section — used by countInteriorPages. */
export function countIndexPages(entries: WordIndexEntry[], g: Geometry): number {
  return paginateIndex(entries, g).length;
}

export interface IndexPagesOptions {
  addPage: AddPage;
  /** Base geometry (side-independent metrics: contentW/H, contentTop). */
  g: Geometry;
  fonts: BookFonts;
  entries: WordIndexEntry[];
  accentHex?: string;
  /** Black-and-white print mode: white page, black section headers. */
  mono?: boolean;
}

export function composeIndexPages({ addPage, g, fonts, entries, accentHex, mono }: IndexPagesOptions): void {
  // In B&W mode the section headers are black (a coloured accent would just
  // become an inconsistent grey once the shop prints mono).
  const accent = mono ? INK : accentHex || DEFAULT_ACCENT_HEX;
  const total = entries.reduce((n, e) => n + e.words.length, 0);
  const colW = (g.contentW - COL_GAP * (COLS - 1)) / COLS;
  const layout = paginateIndex(entries, g);

  layout.forEach((placed, pi) => {
    const { page, g: pg } = addPage();
    page.drawRectangle({ x: 0, y: 0, width: pg.pageW, height: pg.pageH, color: mono ? hex2rgb("#ffffff") : hex2rgb(PAGE_BG) });
    if (pi === 0) {
      const hSize = 20;
      let top = pg.contentTop;
      page.drawText("INDEX DES MOTS", { x: pg.contentX, y: pg.pageH - (top + hSize), size: hSize, font: fonts.heading, color: hex2rgb(INK) });
      top += hSize + 4;
      page.drawText(`${total} MOTS`, { x: pg.contentX, y: pg.pageH - (top + 8), size: 8, font: fonts.letter, color: mixHex(INK, PAGE_BG, 0.5) });
    }
    for (const p of placed) {
      const x = pg.contentX + p.col * (colW + COL_GAP);
      const isHeader = p.line.kind === "header";
      page.drawText(p.line.text, {
        x,
        y: pg.pageH - (p.yTop + p.line.size),
        size: p.line.size,
        font: isHeader ? fonts.bold : fonts.letter,
        color: isHeader ? hex2rgb(accent) : hex2rgb(INK),
      });
    }
  });
}
