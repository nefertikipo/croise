/**
 * Assemble the print-ready PDF for a postcard: a two-page document — front
 * (title band + the fléchés grid to solve) then back (a personal message + the
 * solution as a small answer key). Flat A6, trim + bleed + boxes,
 * no crop marks. Gelato receives this as a single multi-page card file whose
 * pages map to the front/back print areas in order (see src/lib/gelato).
 *
 * Reuses the book engine's vector grid renderer (draw-grid), embedded fonts and
 * print-box helpers so a printed card matches the on-screen editor exactly.
 */

import { PDFDocument, type PDFPage } from "pdf-lib";
import { embedBookFonts, type BookFonts } from "@/lib/book-pdf/fonts";
import { drawFlecheGrid } from "@/lib/book-pdf/draw-grid";
import {
  hex2rgb,
  mixHex,
  pageGeometry,
  setPrintBoxes,
  type Geometry,
} from "@/lib/book-pdf/geometry";
import { ellipsize, nfc, wrapParagraphs } from "@/lib/book-pdf/text";
import { resolveDedicationFont } from "@/lib/books/dedication-fonts";
import { POSTCARD_SPEC } from "@/lib/postcard-pdf/geometry";
import type { PostcardData, PostcardDelivery, PostcardGrid } from "@/types/postcard";

const INK = "#2f2a26";
const PAGE_BG = "#fff6ec";
/** Hand-drawn grid green — matches the sketch theme in draw-grid.ts. */
const GRID_GREEN = "#2f6b4a";

/** Thrown when a card has no generated grid to print. */
export class EmptyPostcardError extends Error {
  constructor() {
    super("Postcard has no grid to print.");
    this.name = "EmptyPostcardError";
  }
}

/** Full-bleed cream background — every face gets it. */
function paintBackground(page: PDFPage, g: Geometry) {
  page.drawRectangle({ x: 0, y: 0, width: g.pageW, height: g.pageH, color: hex2rgb(PAGE_BG) });
}

/** Front face: editorial title band + the grid to solve. */
function composeFront(page: PDFPage, g: Geometry, fonts: BookFonts, card: PostcardData, grid: PostcardGrid) {
  const inkRgb = hex2rgb(INK);
  const muted = mixHex(INK, PAGE_BG, 0.5);
  paintBackground(page, g);

  // Title band — a card always has a heading (custom, "pour X", or a default).
  const heading = nfc(
    card.title?.trim() ||
      (card.recipientName?.trim() ? `Pour ${card.recipientName.trim()}` : "Mots fléchés"),
  ).toUpperCase();
  const headSize = 13;
  const meta = `${grid.width}×${grid.height}`;
  const metaSize = 6;
  const metaW = fonts.letter.widthOfTextAtSize(meta, metaSize);
  const headMaxW = g.contentW - metaW - 8;
  let headDrawSize = headSize;
  while (headDrawSize > 7 && fonts.heading.widthOfTextAtSize(heading, headDrawSize) > headMaxW) {
    headDrawSize -= 0.5;
  }
  const headText = ellipsize(fonts.heading, heading, headDrawSize, headMaxW);
  page.drawText(headText, {
    x: g.contentX,
    y: g.pageH - (g.contentTop + headSize),
    size: headDrawSize,
    font: fonts.heading,
    color: inkRgb,
  });
  page.drawText(meta, {
    x: g.contentX + g.contentW - metaW,
    y: g.pageH - (g.contentTop + headSize - 2),
    size: metaSize,
    font: fonts.letter,
    color: muted,
  });
  const ruleY = g.pageH - (g.contentTop + headSize + 4);
  page.drawLine({ start: { x: g.contentX, y: ruleY }, end: { x: g.contentX + g.contentW, y: ruleY }, thickness: 1.2, color: inkRgb });

  // Grid, scaled to fill the area below the band and centred.
  const gridTop = g.contentTop + headSize + 9;
  const availH = g.contentTop + g.contentH - gridTop;
  const cellPt = Math.min(g.contentW / grid.width, availH / grid.height);
  const gridW = cellPt * grid.width;
  const gridH = cellPt * grid.height;
  const originX = g.contentX + (g.contentW - gridW) / 2;
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
    mode: "puzzle",
    accentHex: card.gridColor ?? undefined,
    sketch: true,
  });
  page.drawRectangle({
    x: originX,
    y: g.pageH - (originTop + gridH),
    width: gridW,
    height: gridH,
    borderColor: hex2rgb(GRID_GREEN),
    borderWidth: 1.6,
    opacity: 0,
  });
}

/**
 * Back face: solution answer key at the bottom, plus — depending on delivery —
 * either the typed personal message ("direct") or a blank ruled area the buyer
 * fills in by hand ("self").
 */
function composeBack(
  page: PDFPage,
  g: Geometry,
  fonts: BookFonts,
  card: PostcardData,
  grid: PostcardGrid,
  delivery: PostcardDelivery,
) {
  const inkRgb = hex2rgb(INK);
  const muted = mixHex(INK, PAGE_BG, 0.45);
  paintBackground(page, g);

  const msgFont = fonts.dedication[resolveDedicationFont(card.messageFont).key];

  // ---- Message block (top ~55% of the card) — printed only for direct send ----
  let y = g.contentTop + 6;
  if (delivery === "direct") {
    if (card.recipientName?.trim()) {
      const name = nfc(card.recipientName.trim());
      const size = 15;
      const w = msgFont.widthOfTextAtSize(name, size);
      page.drawText(name, { x: g.contentX + (g.contentW - w) / 2, y: g.pageH - (y + size), size, font: msgFont, color: inkRgb });
      y += size + 8;
    }
    const message = card.message?.trim();
    if (message) {
      const size = 11;
      const lineH = size * 1.35;
      const lines = wrapParagraphs(msgFont, nfc(message), size, g.contentW).slice(0, 12);
      for (const line of lines) {
        const w = msgFont.widthOfTextAtSize(line, size);
        page.drawText(line, { x: g.contentX + (g.contentW - w) / 2, y: g.pageH - (y + size), size, font: msgFont, color: inkRgb });
        y += lineH;
      }
    }
  }

  // ---- Solution answer key (bottom, compact plain grid) ----
  // Kept small: it's a discreet answer key, not the star of the back face.
  const labelSize = 7;
  const labelGap = 4;
  const bottomLimit = g.contentTop + g.contentH;
  const solTop = Math.max(y + 10, bottomLimit - labelSize - labelGap - g.contentH * 0.28);
  const solAvailH = bottomLimit - solTop - labelSize - labelGap;

  // Self-send: fill the empty upper area with faint guide lines to write on.
  if (delivery === "self") {
    const lineColor = mixHex(INK, PAGE_BG, 0.8);
    const gap = 15;
    const zoneBottom = solTop - 10;
    for (let ly = g.contentTop + 16; ly <= zoneBottom; ly += gap) {
      page.drawLine({
        start: { x: g.contentX, y: g.pageH - ly },
        end: { x: g.contentX + g.contentW, y: g.pageH - ly },
        thickness: 0.5,
        color: lineColor,
      });
    }
  }

  const label = "SOLUTION";
  page.drawText(label, {
    x: g.contentX,
    y: g.pageH - (solTop + labelSize),
    size: labelSize,
    font: fonts.bold,
    color: muted,
  });
  const gridArea = { top: solTop + labelSize + labelGap, h: solAvailH };
  // Cap the width too so the key stays modest (≤ half the content width).
  const cellPt = Math.min((g.contentW * 0.5) / grid.width, gridArea.h / grid.height);
  const gridW = cellPt * grid.width;
  const originX = g.contentX + (g.contentW - gridW) / 2;
  drawFlecheGrid({
    page,
    cells: grid.cells,
    width: grid.width,
    height: grid.height,
    originX,
    originTop: gridArea.top,
    cellPt,
    pageH: g.pageH,
    fonts,
    mode: "plain",
  });
}

export async function generatePostcardPdf(
  card: PostcardData,
  opts: { delivery?: PostcardDelivery } = {},
): Promise<Uint8Array> {
  if (!card.grid) throw new EmptyPostcardError();
  const grid = card.grid;
  const delivery = opts.delivery ?? "direct";

  const doc = await PDFDocument.create();
  const fonts = await embedBookFonts(doc);
  const g = pageGeometry(POSTCARD_SPEC); // symmetric margins → side-independent

  const front = doc.addPage([g.pageW, g.pageH]);
  setPrintBoxes(front, g);
  composeFront(front, g, fonts, card, grid);

  const back = doc.addPage([g.pageW, g.pageH]);
  setPrintBoxes(back, g);
  composeBack(back, g, fonts, card, grid, delivery);

  return doc.save();
}
