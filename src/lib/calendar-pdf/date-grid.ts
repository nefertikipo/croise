/**
 * Draw one month's date grid (7 weekday columns × up to 6 week rows) into a
 * pdf-lib page, Monday-first. Pure calendar math — no crossword coupling.
 */

import { type PDFPage } from "pdf-lib";
import type { BookFonts } from "@/lib/book-pdf/fonts";
import { hex2rgb, mixHex } from "@/lib/book-pdf/geometry";
import { WEEKDAYS_FR, daysInMonth, firstWeekdayMondayIndex } from "@/lib/calendar-pdf/geometry";

const INK = "#2f2a26";
const PAGE_BG = "#fff6ec";

export interface DateGridOptions {
  page: PDFPage;
  fonts: BookFonts;
  pageH: number;
  /** Top-left origin of the date-grid area, in points (top-left page origin). */
  x: number;
  top: number;
  w: number;
  h: number;
  year: number;
  /** 1–12. */
  month: number;
}

export function drawDateGrid({ page, fonts, pageH, x, top, w, h, year, month }: DateGridOptions) {
  const inkRgb = hex2rgb(INK);
  const muted = mixHex(INK, PAGE_BG, 0.45);
  const cols = 7;
  const colW = w / cols;
  const headerH = Math.min(24, h * 0.12);
  const rows = 6;
  const rowH = (h - headerH) / rows;

  // Weekday header labels.
  const labelSize = Math.min(11, colW * 0.28);
  WEEKDAYS_FR.forEach((label, c) => {
    const tw = fonts.bold.widthOfTextAtSize(label, labelSize);
    page.drawText(label, {
      x: x + c * colW + (colW - tw) / 2,
      y: pageH - (top + headerH - labelSize),
      size: labelSize,
      font: fonts.bold,
      color: muted,
    });
  });
  // Rule under the header.
  const ruleY = pageH - (top + headerH);
  page.drawLine({ start: { x, y: ruleY }, end: { x: x + w, y: ruleY }, thickness: 1, color: inkRgb });

  const first = firstWeekdayMondayIndex(year, month);
  const total = daysInMonth(year, month);
  const daySize = Math.min(16, colW * 0.32);
  for (let day = 1; day <= total; day++) {
    const cellIndex = first + day - 1;
    const r = Math.floor(cellIndex / cols);
    const c = cellIndex % cols;
    const cellX = x + c * colW;
    const cellTop = top + headerH + r * rowH;
    // Light cell separators.
    page.drawRectangle({
      x: cellX,
      y: pageH - (cellTop + rowH),
      width: colW,
      height: rowH,
      borderColor: mixHex(INK, PAGE_BG, 0.8),
      borderWidth: 0.5,
      opacity: 0,
    });
    // Day number, top-left of the cell.
    page.drawText(String(day), {
      x: cellX + 4,
      y: pageH - (cellTop + daySize + 2),
      size: daySize,
      font: fonts.letter,
      color: inkRgb,
    });
  }
}
