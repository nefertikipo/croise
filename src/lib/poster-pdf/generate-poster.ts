/**
 * Assemble the print-ready PDF for a poster: a single 50 × 70 cm page — an
 * editorial title, the fléchés grid printed large, and a footer brand mark.
 * Reuses the book engine's vector grid renderer, fonts and print-box helpers so
 * the poster matches the on-screen grid exactly. Single-sided (Gelato cl 4-0).
 */

import { PDFDocument } from "pdf-lib";
import { embedBookFonts } from "@/lib/book-pdf/fonts";
import { drawFlecheGrid } from "@/lib/book-pdf/draw-grid";
import { hex2rgb, mixHex, mm2pt, pageGeometry, setPrintBoxes } from "@/lib/book-pdf/geometry";
import { ellipsize, nfc } from "@/lib/book-pdf/text";
import { POSTER_SPEC } from "@/lib/poster-pdf/geometry";
import type { PosterData } from "@/types/poster";

const INK = "#2f2a26";
const PAGE_BG = "#fff6ec";

export class EmptyPosterError extends Error {
  constructor() {
    super("Poster has no grid to print.");
    this.name = "EmptyPosterError";
  }
}

export async function generatePosterPdf(poster: PosterData): Promise<Uint8Array> {
  if (!poster.cells?.length) throw new EmptyPosterError();

  const doc = await PDFDocument.create();
  const fonts = await embedBookFonts(doc);
  const g = pageGeometry(POSTER_SPEC); // symmetric margins → side-independent
  const page = doc.addPage([g.pageW, g.pageH]);
  setPrintBoxes(page, g);

  const inkRgb = hex2rgb(INK);
  const muted = mixHex(INK, PAGE_BG, 0.45);
  page.drawRectangle({ x: 0, y: 0, width: g.pageW, height: g.pageH, color: hex2rgb(PAGE_BG) });

  // ---- Title band (large) ----
  const heading = nfc(poster.title?.trim() || "Mots fléchés").toUpperCase();
  const headSize = 44;
  let headDrawSize = headSize;
  while (headDrawSize > 20 && fonts.heading.widthOfTextAtSize(heading, headDrawSize) > g.contentW) {
    headDrawSize -= 1;
  }
  const headText = ellipsize(fonts.heading, heading, headDrawSize, g.contentW);
  page.drawText(headText, {
    x: g.contentX,
    y: g.pageH - (g.contentTop + headSize),
    size: headDrawSize,
    font: fonts.heading,
    color: inkRgb,
  });
  const ruleY = g.pageH - (g.contentTop + headSize + mm2pt(4));
  page.drawLine({ start: { x: g.contentX, y: ruleY }, end: { x: g.contentX + g.contentW, y: ruleY }, thickness: 3, color: inkRgb });

  // ---- Footer brand mark ----
  const brand = `LES FLÈCHES · ${poster.code}`;
  const brandSize = 12;
  const brandW = fonts.letter.widthOfTextAtSize(brand, brandSize);
  page.drawText(brand, {
    x: g.contentX + (g.contentW - brandW) / 2,
    y: g.pageH - (g.contentTop + g.contentH),
    size: brandSize,
    font: fonts.letter,
    color: muted,
  });

  // ---- Grid, scaled to fill the area between the band and the footer ----
  const gridTop = g.contentTop + headSize + mm2pt(14);
  const footerH = mm2pt(12);
  const availH = g.contentTop + g.contentH - gridTop - footerH;
  const cellPt = Math.min(g.contentW / poster.width, availH / poster.height);
  const gridW = cellPt * poster.width;
  const gridH = cellPt * poster.height;
  const originX = g.contentX + (g.contentW - gridW) / 2;
  const originTop = gridTop + Math.max(0, (availH - gridH) / 2);

  drawFlecheGrid({
    page,
    cells: poster.cells,
    width: poster.width,
    height: poster.height,
    originX,
    originTop,
    cellPt,
    pageH: g.pageH,
    fonts,
    mode: "puzzle",
  });
  page.drawRectangle({
    x: originX,
    y: g.pageH - (originTop + gridH),
    width: gridW,
    height: gridH,
    borderColor: inkRgb,
    borderWidth: 2.5,
    opacity: 0,
  });

  return doc.save();
}
