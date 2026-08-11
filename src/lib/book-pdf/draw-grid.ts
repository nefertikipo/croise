/**
 * Vector renderer for a mots fléchés grid — the print counterpart of the
 * on-screen `FlecheGrid` component. Draws cells, tinted clue cells with fitted
 * multi-line clue text, elbow arrows, letters, word-break rules and numbered
 * hidden-word cells directly as PDF vectors (pdf-lib), so print matches screen
 * and stays razor-sharp at any size.
 *
 * All geometry is authored in the same 70px cell space as the screen component
 * and scaled by `u = cellPt / 70`, so arrows and insets keep their proportions.
 */

import { rgb, type PDFPage, type RGB } from "pdf-lib";
import type { BookFonts } from "@/lib/book-pdf/fonts";
import { hex2rgb, mixHex } from "@/lib/book-pdf/geometry";
import { nfc } from "@/lib/book-pdf/text";
import { NBSP, preventFrenchOrphans } from "@/lib/crossword/french-typography";
import type { FlecheCell } from "@/types/book";

/* Palette — mirrors the constants at the top of fleche-grid.tsx. */
const INK = "#2f2a26";
const PAPER = "#fffcf5";
const EMPTY_BG = "#ece3d3";
const CUSTOM_BG = "#dbe6fb";
export const DEFAULT_ACCENT_HEX = "#007cb8"; // resolved --blueprint (light)
const HIDDEN_ACCENT = "#0f4c81"; // --primary (deep blue)
const HIDDEN_BG = "#f3ddd4";
const LETTER_BORDER = "#c0bcb4"; // ink @30% over paper
const EMPTY_BORDER = "#d9d0c0";
const PLAIN_CLUE_BG = "#e9e6e0";

export type GridMode = "puzzle" | "solution" | "plain";

const INK_RGB = hex2rgb(INK);

export interface DrawGridOptions {
  page: PDFPage;
  cells: FlecheCell[][];
  width: number;
  height: number;
  /** Grid top-left in points, top-left page origin. */
  originX: number;
  originTop: number;
  /** Cell edge length in points. */
  cellPt: number;
  /** Full page height in points, for the top-left → bottom-left y flip. */
  pageH: number;
  fonts: BookFonts;
  mode: GridMode;
  /** Base clue-cell colour; defaults to the blueprint blue. */
  accentHex?: string;
  /** "row,col" → 1-indexed hidden-word position. */
  hidden?: Map<string, number>;
  /**
   * Hand-drawn "sketch" theme (used by the carte): wobbly green strokes and pink
   * clue cells instead of the crisp blueprint look. Ignored for `plain` mode so
   * a solution answer key stays clean and legible.
   */
  sketch?: boolean;
}

/* Sketch (hand-drawn) palette — green ink, pink clue cells. */
const SKETCH_INK = "#2f6b4a"; // forest-green strokes: borders, arrows, rules
const SKETCH_CLUE_BG = "#f6d4d9"; // soft pink clue cells
const SKETCH_CUSTOM_BG = "#eeb0c0"; // deeper pink for custom (personal) clues
const SKETCH_CELL_BORDER = "#9ac4ab"; // light-green letter-cell outline
const SKETCH_HIDDEN_ACCENT = "#c0537a"; // pink-red for hidden-word cells

/* ------------------------------------------------------------------ arrows */

/** One arrow's shaft polyline + head triangle, in grid-space points (top-left
 * origin at the grid's corner). Ports GridArrow from fleche-grid.tsx. */
function arrowGeometry(
  r: number,
  c: number,
  dx: number,
  dy: number,
  flow: "right" | "down",
  band: number,
  S: number,
): { shaft: [number, number][]; head: [number, number][] } {
  const u = S / 70;
  const HEAD = 10 * u;
  const HALF = 6.5 * u;
  const cx = c * S;
  const cy = r * S;
  const rightN = dx === 1 && dy === 0;
  const belowN = dx === 0 && dy === 1;

  let pts: [number, number][];
  let tip: [number, number];
  let head: "right" | "down";

  if (rightN && flow === "right") {
    const y = cy + band * S;
    const bx = cx + S;
    pts = [[bx, y], [bx + 18 * u - HEAD, y]];
    tip = [bx + 18 * u, y];
    head = "right";
  } else if (belowN && flow === "down") {
    const x = cx + band * S;
    const by = cy + S;
    pts = [[x, by], [x, by + 18 * u - HEAD]];
    tip = [x, by + 18 * u];
    head = "down";
  } else if (belowN && flow === "right") {
    const x = cx + S * 0.3;
    const by = cy + S;
    pts = [[x, by], [x, by + 13 * u], [x + 16 * u - HEAD, by + 13 * u]];
    tip = [x + 16 * u, by + 13 * u];
    head = "right";
  } else if (rightN && flow === "down") {
    const y = cy + S * 0.3;
    const bx = cx + S;
    pts = [[bx, y], [bx + 13 * u, y], [bx + 13 * u, y + 16 * u - HEAD]];
    tip = [bx + 13 * u, y + 16 * u];
    head = "down";
  } else if (flow === "right") {
    pts = [[cx + S, cy + S], [cx + S + 21 * u - HEAD, cy + S + 9 * u]];
    tip = [cx + S + 21 * u, cy + S + 9 * u];
    head = "right";
  } else {
    pts = [[cx + S, cy + S], [cx + S + 9 * u, cy + S + 21 * u - HEAD]];
    tip = [cx + S + 9 * u, cy + S + 21 * u];
    head = "down";
  }

  const [tx, ty] = tip;
  const headTri: [number, number][] =
    head === "right"
      ? [[tx, ty], [tx - HEAD, ty - HALF], [tx - HEAD, ty + HALF]]
      : [[tx, ty], [tx - HALF, ty - HEAD], [tx + HALF, ty - HEAD]];

  return { shaft: pts, head: headTri };
}

/* -------------------------------------------------------------- text fitting */

interface FitResult {
  size: number;
  lines: string[];
}

/** Split a clue into wrap tokens. Breaks on whitespace EXCEPT NBSP, so a
 * one-letter word glued to the next word (see `preventFrenchOrphans`) stays one
 * atomic token; the joiner is normalised to a plain space so the embedded font
 * never sees NBSP. */
function clueWords(text: string): string[] {
  return text
    .split(/[^\S\u00A0]+/)
    .filter(Boolean)
    .map((t) => t.replaceAll(NBSP, " "));
}

/** Char-break `word` into chunks that each fit the box (`fits`), but never a
 * single-letter chunk: a lone letter is merged into a neighbour (overflowing the
 * box a touch), because a line holding just one letter reads as broken. Greedy
 * fill first, then a merge pass collapses any 1-char fragment. */
function breakIntoChunks(word: string, fits: (s: string) => boolean): string[] {
  const chunks: string[] = [];
  let chunk = "";
  for (const ch of word) {
    if (fits(chunk + ch) || !chunk) chunk += ch;
    else {
      chunks.push(chunk);
      chunk = ch;
    }
  }
  if (chunk) chunks.push(chunk);
  // Collapse any single-character fragment into an adjacent chunk.
  let k = 0;
  while (k < chunks.length && chunks.length > 1) {
    if (chunks[k].length >= 2) {
      k++;
    } else if (k > 0) {
      chunks[k - 1] += chunks[k];
      chunks.splice(k, 1);
      k = Math.max(0, k - 1);
    } else {
      chunks[k] += chunks[k + 1];
      chunks.splice(k + 1, 1);
    }
  }
  return chunks;
}

/** Greedy word-wrap of `text` at `size`, char-breaking a word wider than the box
 * (mirrors the screen's break-on-overflow). A forced break never leaves a lone
 * single letter on a line — fragments are kept to >=2 chars, overflowing the box
 * slightly if that's the only way (see `breakIntoChunks`). */
function wrapLines(
  font: BookFonts["clue"],
  text: string,
  size: number,
  boxW: number,
): string[] {
  const words = clueWords(text);
  const w = (s: string) => font.widthOfTextAtSize(s, size);
  const lines: string[] = [];
  let cur = "";
  const pushWord = (word: string) => {
    if (w(word) <= boxW) {
      cur = word;
      return;
    }
    const chunks = breakIntoChunks(word, (s) => w(s) <= boxW);
    for (let k = 0; k < chunks.length - 1; k++) lines.push(chunks[k]);
    cur = chunks[chunks.length - 1] ?? "";
  };
  for (const word of words) {
    const cand = cur ? `${cur} ${word}` : word;
    if (w(cand) <= boxW) cur = cand;
    else {
      if (cur) lines.push(cur);
      cur = "";
      pushWord(word);
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Largest size in [min,max] whose wrapped lines fit the box (binary search),
 * matching FitText's measure-and-shrink. */
function fitText(
  font: BookFonts["clue"],
  text: string,
  boxW: number,
  boxH: number,
  max: number,
  min: number,
  lineRatio: number,
): FitResult {
  const fits = (size: number): string[] | null => {
    const lines = wrapLines(font, text, size, boxW);
    return lines.length * size * lineRatio <= boxH + 0.5 ? lines : null;
  };
  const atMax = fits(max);
  if (atMax) return { size: max, lines: atMax };
  let lo = min;
  let hi = max;
  let best = min;
  let bestLines = wrapLines(font, text, min, boxW);
  for (let i = 0; i < 18 && hi - lo > 0.25; i++) {
    const mid = (lo + hi) / 2;
    const ok = fits(mid);
    if (ok) {
      best = mid;
      bestLines = ok;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { size: best, lines: bestLines };
}

/* ---------------------------------------------------------------- drawing */

export function drawFlecheGrid(opts: DrawGridOptions) {
  const { page, cells, width, height, originX, originTop, cellPt: S, pageH, fonts, mode } = opts;
  const u = S / 70;
  const accent = opts.accentHex || DEFAULT_ACCENT_HEX;
  const plain = mode === "plain";
  const sketch = (opts.sketch ?? false) && !plain;
  // Stroke ink (borders, rules, arrows) turns green in the sketch theme; clue
  // and letter TEXT stays dark ink for legibility.
  const strokeInk = sketch ? hex2rgb(SKETCH_INK) : INK_RGB;
  const clueBg = plain
    ? hex2rgb(PLAIN_CLUE_BG)
    : sketch
      ? hex2rgb(SKETCH_CLUE_BG)
      : mixHex(PAPER, accent, 0.18);
  const clueRule = sketch ? hex2rgb(SKETCH_INK) : mixHex(PAPER, accent, 0.45);
  const customBg = sketch ? hex2rgb(SKETCH_CUSTOM_BG) : hex2rgb(CUSTOM_BG);
  const hiddenAccent = sketch ? hex2rgb(SKETCH_HIDDEN_ACCENT) : hex2rgb(HIDDEN_ACCENT);
  const letterBorder = sketch ? hex2rgb(SKETCH_CELL_BORDER) : hex2rgb(LETTER_BORDER);

  /** Bottom-left rect for grid cell (r,c). */
  const cellRect = (r: number, c: number) => ({
    x: originX + c * S,
    y: pageH - (originTop + (r + 1) * S),
    w: S,
    h: S,
  });
  /** Top-left page point (px,py in grid-space pt) → pdf baseline coords. */
  const abs = (px: number, py: number): [number, number] => [originX + px, pageH - (originTop + py)];

  const fill = (r: number, c: number, color: RGB) => {
    const b = cellRect(r, c);
    page.drawRectangle({ x: b.x, y: b.y, width: b.w, height: b.h, color });
  };
  const border = (r: number, c: number, color: RGB, thickness: number) => {
    if (sketch) {
      sketchRect(page, r, c, S, originX, originTop, pageH, color, Math.max(thickness, 0.9 * u), u);
      return;
    }
    const b = cellRect(r, c);
    page.drawRectangle({ x: b.x, y: b.y, width: b.w, height: b.h, borderColor: color, borderWidth: thickness, opacity: 0 });
  };

  const centeredText = (r: number, c: number, text: string, size: number, font: BookFonts["clue"], color: RGB) => {
    const b = cellRect(r, c);
    const tw = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: b.x + (b.w - tw) / 2,
      y: b.y + (b.h - size * 0.7) / 2,
      size,
      font,
      color,
    });
  };

  // Pass 1: fills + borders.
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = cells[r][c];
      if (cell.type === "empty") {
        fill(r, c, hex2rgb(EMPTY_BG));
        border(r, c, sketch ? letterBorder : hex2rgb(EMPTY_BORDER), 0.5 * u);
      } else if (cell.type === "clue") {
        fill(r, c, clueBg);
        if (!plain) border(r, c, clueRule, 0.5 * u);
        else border(r, c, hex2rgb(LETTER_BORDER), 0.5 * u);
      } else {
        const key = `${r},${c}`;
        const isHidden = opts.hidden?.has(key) ?? false;
        fill(r, c, plain ? rgb(1, 1, 1) : isHidden ? hex2rgb(HIDDEN_BG) : hex2rgb(PAPER));
        if (isHidden) border(r, c, plain ? INK_RGB : hiddenAccent, 1.4 * u);
        else border(r, c, letterBorder, 0.5 * u);
      }
    }
  }

  // Pass 2: clue text (skip in plain answer-key mode).
  if (!plain) {
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const cell = cells[r][c];
        if (cell.type !== "clue" || !cell.clues?.length) continue;
        const clueTexts = [...cell.clues].sort(
          (a, b) => (a.answerRow > r ? 1 : 0) - (b.answerRow > r ? 1 : 0),
        );
        const hasTwo = clueTexts.length >= 2;
        const b = cellRect(r, c);
        // Proportional band split: when two clues share a cell the longer
        // definition gets a taller band (clamped 0.34–0.66 so the shorter never
        // collapses), mirroring fleche-grid.tsx. `bandTopFrac[i]` is band i's
        // top and `grow[i]/growSum` its height, as 0–1 fractions down the cell.
        const totalLen = clueTexts.reduce((s, cl) => s + cl.text.length, 0) || 1;
        const grow = clueTexts.map((cl) => Math.min(0.66, Math.max(0.34, cl.text.length / totalLen)));
        const growSum = grow.reduce((a, x) => a + x, 0) || 1;
        let acc = 0;
        const bandTopFrac = grow.map((g) => {
          const top = acc / growSum;
          acc += g;
          return top;
        });
        if (hasTwo) {
          // Divider follows the split (band-1 top), not a fixed 50%.
          const yDiv = pageH - (originTop + r * S + bandTopFrac[1] * S);
          page.drawLine({
            start: { x: b.x, y: yDiv },
            end: { x: b.x + b.w, y: yDiv },
            thickness: 0.5 * u,
            color: clueRule,
          });
        }
        clueTexts.forEach((cl, i) => {
          const subTop = originTop + r * S + bandTopFrac[i] * S;
          const subH = (grow[i] / growSum) * S;
          if (cl.isCustom) {
            page.drawRectangle({
              x: b.x + 0.5 * u,
              y: pageH - (subTop + subH) + 0.5 * u,
              width: b.w - 1 * u,
              height: subH - 1 * u,
              color: customBg,
            });
          }
          const boxLeft = 4 * u;
          const boxW = S - 7 * u;
          const boxH = subH - 4 * u;
          const italic = cl.text === cl.answer;
          const clueText = preventFrenchOrphans(nfc(cl.text).toUpperCase());
          const fitted = fitText(fonts.clue, clueText, boxW, boxH, (hasTwo ? 10 : 13) * u, 5 * u, 1.1);
          const lineH = fitted.size * 1.1;
          // Center the text block vertically within the band, and each line
          // horizontally within the box (mirrors the screen's centred clues).
          const vPad = Math.max(0, (boxH - fitted.lines.length * lineH) / 2);
          fitted.lines.forEach((line, li) => {
            const lineW = fonts.clue.widthOfTextAtSize(line, fitted.size);
            const xLine = boxLeft + Math.max(0, (boxW - lineW) / 2);
            const baseTop = subTop + 2 * u + vPad + li * lineH + fitted.size * 0.8;
            const [x, y] = abs(c * S + xLine, (baseTop - originTop));
            page.drawText(line, {
              x,
              y,
              size: fitted.size,
              font: fonts.clue,
              color: italic ? mixHex(INK, PAPER, 0.4) : INK_RGB,
            });
          });
        });
      }
    }
  }

  // Pass 3: letters (solution + plain-with-answers) and hidden-word numbers.
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = cells[r][c];
      if (cell.type !== "letter") continue;
      const key = `${r},${c}`;
      const hiddenNum = opts.hidden?.get(key);
      if (hiddenNum !== undefined) {
        const b = cellRect(r, c);
        page.drawText(String(hiddenNum), {
          x: b.x + 2 * u,
          y: b.y + b.h - 9 * u,
          size: 9 * u,
          font: fonts.bold,
          color: plain ? INK_RGB : hiddenAccent,
        });
      }
      if ((mode === "solution" || (plain && mode === "plain")) && cell.letter) {
        centeredText(r, c, nfc(cell.letter).toUpperCase(), 22 * u, fonts.letter, INK_RGB);
      }
    }
  }

  // Pass 4: word-break dotted rules on letter cells.
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = cells[r][c];
      if (cell.type !== "letter") continue;
      const b = cellRect(r, c);
      if (cell.breakRight) {
        page.drawLine({ start: { x: b.x + b.w, y: b.y }, end: { x: b.x + b.w, y: b.y + b.h }, thickness: 2 * u, color: strokeInk, dashArray: [3 * u, 2 * u] });
      }
      if (cell.breakBottom) {
        page.drawLine({ start: { x: b.x, y: b.y }, end: { x: b.x + b.w, y: b.y }, thickness: 2 * u, color: strokeInk, dashArray: [3 * u, 2 * u] });
      }
    }
  }

  // Pass 5: arrows (skip in plain mode).
  if (!plain) {
    for (let ar = 0; ar < height; ar++) {
      for (let ac = 0; ac < width; ac++) {
        const cell = cells[ar][ac];
        if (cell.type !== "clue" || !cell.clues?.length) continue;
        const sorted = [...cell.clues].sort(
          (a, b) => (a.answerRow > ar ? 1 : 0) - (b.answerRow > ar ? 1 : 0),
        );
        // Each arrow tail sits at the centre of its (unequal) band — same
        // proportional split as the clue text above.
        const sortedTotalLen = sorted.reduce((s, cl) => s + cl.text.length, 0) || 1;
        const grow = sorted.map((cl) => Math.min(0.66, Math.max(0.34, cl.text.length / sortedTotalLen)));
        const growSum = grow.reduce((a, x) => a + x, 0) || 1;
        sorted.forEach((cl, i) => {
          const before = grow.slice(0, i).reduce((a, x) => a + x, 0);
          const center = (before + grow[i] / 2) / growSum;
          const geo = arrowGeometry(
            ar,
            ac,
            cl.answerCol - ac,
            cl.answerRow - ar,
            cl.direction,
            sorted.length === 1 ? 0.5 : center,
            S,
          );
          if (sketch) {
            sketchStroke(page, geo.shaft, originX, originTop, pageH, strokeInk, 2.6 * u, seeded(ar * 131 + ac * 17 + i * 7), 0.7 * u);
          } else {
            drawPolyline(page, geo.shaft, originX, originTop, pageH, strokeInk, 3 * u);
          }
          drawFilledTri(page, geo.head, originX, originTop, pageH, strokeInk);
        });
      }
    }
  }
}

/** Stroke a polyline given as grid-space points. */
function drawPolyline(page: PDFPage, pts: [number, number][], ox: number, oy: number, pageH: number, color: RGB, thickness: number) {
  for (let i = 1; i < pts.length; i++) {
    page.drawLine({
      start: { x: ox + pts[i - 1][0], y: pageH - (oy + pts[i - 1][1]) },
      end: { x: ox + pts[i][0], y: pageH - (oy + pts[i][1]) },
      thickness,
      color,
      lineCap: undefined,
    });
  }
}

/** Fill a triangle given as three grid-space points. */
function drawFilledTri(page: PDFPage, pts: [number, number][], ox: number, oy: number, pageH: number, color: RGB) {
  const p = pts.map(([x, y]) => `${ox + x} ${oy + y}`);
  const path = `M ${p[0]} L ${p[1]} L ${p[2]} Z`;
  page.drawSvgPath(path, { x: 0, y: pageH, color, borderWidth: 0 });
}

/* ----------------------------------------------------- hand-drawn (sketch) */

/** Deterministic tiny PRNG so a card renders identically every time. */
function seeded(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A straight segment redrawn as a gently wavy one: subdivide and nudge the
 * interior points perpendicular to the line by up to `amp`. */
function wobbleSeg(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amp: number,
  rnd: () => number,
): [number, number][] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = Math.max(2, Math.round(len / 22));
  const pts: [number, number][] = [[x1, y1]];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const off = (rnd() * 2 - 1) * amp;
    pts.push([x1 + dx * t + nx * off, y1 + dy * t + ny * off]);
  }
  pts.push([x2, y2]);
  return pts;
}

/** Stroke a wobbled polyline (grid-space points) as a single SVG path. */
function sketchStroke(
  page: PDFPage,
  pts: [number, number][],
  ox: number,
  oy: number,
  pageH: number,
  color: RGB,
  thickness: number,
  rnd: () => number,
  amp: number,
) {
  const all: [number, number][] = [];
  for (let i = 1; i < pts.length; i++) {
    const seg = wobbleSeg(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], amp, rnd);
    all.push(...(i === 1 ? seg : seg.slice(1)));
  }
  const d = all.map(([x, y], i) => `${i ? "L" : "M"} ${ox + x} ${oy + y}`).join(" ");
  page.drawSvgPath(d, { x: 0, y: pageH, borderColor: color, borderWidth: thickness });
}

/** A hand-drawn cell outline: four wobbly edges that overshoot the corners a
 * touch (the tell-tale sketched-box look). */
function sketchRect(
  page: PDFPage,
  r: number,
  c: number,
  S: number,
  ox: number,
  oy: number,
  pageH: number,
  color: RGB,
  thickness: number,
  u: number,
) {
  const rnd = seeded(r * 73856093 + c * 19349663);
  const amp = 0.9 * u;
  const o = 1.8 * u; // corner overshoot
  const x0 = c * S;
  const y0 = r * S;
  const x1 = (c + 1) * S;
  const y1 = (r + 1) * S;
  const edges: [number, number][][] = [
    [[x0 - o, y0], [x1 + o, y0]], // top
    [[x1, y0 - o], [x1, y1 + o]], // right
    [[x1 + o, y1], [x0 - o, y1]], // bottom
    [[x0, y1 + o], [x0, y0 - o]], // left
  ];
  for (const edge of edges) sketchStroke(page, edge, ox, oy, pageH, color, thickness, rnd, amp);
}
