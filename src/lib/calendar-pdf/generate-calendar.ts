/**
 * Assemble the print-ready calendar PDF: a cover page + one page per month, each
 * pairing that month's fléchés grid (to solve) with its date grid. A3 portrait,
 * trim + bleed + boxes. Reuses the book engine's grid renderer + fonts.
 *
 * Gelato receives this as the wall-calendar's multi-page file. The exact page
 * order / imposition Gelato expects must be confirmed against their calendar
 * template before the first real order (see gelato/product.ts).
 */

import { PDFDocument, type PDFPage } from "pdf-lib";
import { embedBookFonts, type BookFonts } from "@/lib/book-pdf/fonts";
import { drawFlecheGrid } from "@/lib/book-pdf/draw-grid";
import { hex2rgb, mixHex, mm2pt, pageGeometry, setPrintBoxes, type Geometry } from "@/lib/book-pdf/geometry";
import { nfc } from "@/lib/book-pdf/text";
import { CALENDAR_SPEC, MONTHS_FR } from "@/lib/calendar-pdf/geometry";
import { drawDateGrid } from "@/lib/calendar-pdf/date-grid";
import type { CalendarData, CalendarMonthGrid } from "@/types/calendar";

const INK = "#2f2a26";
const PAGE_BG = "#fff6ec";

export class EmptyCalendarError extends Error {
  constructor() {
    super("Calendar has no month grids to print.");
    this.name = "EmptyCalendarError";
  }
}

function newPage(doc: PDFDocument, g: Geometry): PDFPage {
  const page = doc.addPage([g.pageW, g.pageH]);
  setPrintBoxes(page, g);
  page.drawRectangle({ x: 0, y: 0, width: g.pageW, height: g.pageH, color: hex2rgb(PAGE_BG) });
  return page;
}

function composeCover(page: PDFPage, g: Geometry, fonts: BookFonts, cal: CalendarData) {
  const inkRgb = hex2rgb(INK);
  const title = nfc(cal.title?.trim() || "Mots fléchés").toUpperCase();
  let size = 60;
  while (size > 24 && fonts.heading.widthOfTextAtSize(title, size) > g.contentW) size -= 1;
  const tw = fonts.heading.widthOfTextAtSize(title, size);
  page.drawText(title, {
    x: g.contentX + (g.contentW - tw) / 2,
    y: g.pageH - (g.contentTop + g.contentH * 0.4),
    size,
    font: fonts.heading,
    color: inkRgb,
  });
  const year = String(cal.year);
  const ys = 120;
  const yw = fonts.heading.widthOfTextAtSize(year, ys);
  page.drawText(year, {
    x: g.contentX + (g.contentW - yw) / 2,
    y: g.pageH - (g.contentTop + g.contentH * 0.4 + ys + 20),
    size: ys,
    font: fonts.heading,
    color: hex2rgb("#0f4c81"),
  });
  const brand = "LES FLÈCHES";
  const bs = 14;
  const bw = fonts.letter.widthOfTextAtSize(brand, bs);
  page.drawText(brand, {
    x: g.contentX + (g.contentW - bw) / 2,
    y: g.pageH - (g.contentTop + g.contentH),
    size: bs,
    font: fonts.letter,
    color: mixHex(INK, PAGE_BG, 0.45),
  });
}

function composeMonth(page: PDFPage, g: Geometry, fonts: BookFonts, cal: CalendarData, m: CalendarMonthGrid) {
  const inkRgb = hex2rgb(INK);
  // Heading: month name + year.
  const heading = `${MONTHS_FR[m.month - 1]} ${cal.year}`.toUpperCase();
  const headSize = 30;
  page.drawText(heading, {
    x: g.contentX,
    y: g.pageH - (g.contentTop + headSize),
    size: headSize,
    font: fonts.heading,
    color: inkRgb,
  });
  const ruleY = g.pageH - (g.contentTop + headSize + mm2pt(3));
  page.drawLine({ start: { x: g.contentX, y: ruleY }, end: { x: g.contentX + g.contentW, y: ruleY }, thickness: 2, color: inkRgb });

  // Grid on the upper portion; date grid below.
  const bodyTop = g.contentTop + headSize + mm2pt(8);
  const bodyH = g.contentTop + g.contentH - bodyTop;
  const gridAreaH = bodyH * 0.56;
  const dateTop = bodyTop + gridAreaH + mm2pt(8);
  const dateH = g.contentTop + g.contentH - dateTop;

  const cellPt = Math.min(g.contentW / m.width, gridAreaH / m.height);
  const gridW = cellPt * m.width;
  const gridH = cellPt * m.height;
  const originX = g.contentX + (g.contentW - gridW) / 2;
  const originTop = bodyTop + Math.max(0, (gridAreaH - gridH) / 2);
  drawFlecheGrid({
    page,
    cells: m.cells,
    width: m.width,
    height: m.height,
    originX,
    originTop,
    cellPt,
    pageH: g.pageH,
    fonts,
    mode: "puzzle",
    accentHex: cal.gridColor ?? undefined,
  });
  page.drawRectangle({
    x: originX,
    y: g.pageH - (originTop + gridH),
    width: gridW,
    height: gridH,
    borderColor: inkRgb,
    borderWidth: 1.5,
    opacity: 0,
  });

  drawDateGrid({
    page,
    fonts,
    pageH: g.pageH,
    x: g.contentX,
    top: dateTop,
    w: g.contentW,
    h: dateH,
    year: cal.year,
    month: m.month,
  });
}

export async function generateCalendarPdf(cal: CalendarData): Promise<Uint8Array> {
  if (cal.months.length === 0) throw new EmptyCalendarError();

  const doc = await PDFDocument.create();
  const fonts = await embedBookFonts(doc);
  const g = pageGeometry(CALENDAR_SPEC);

  composeCover(newPage(doc, g), g, fonts, cal);
  for (const m of [...cal.months].sort((a, b) => a.month - b.month)) {
    composeMonth(newPage(doc, g), g, fonts, cal, m);
  }

  return doc.save();
}
