/**
 * Print geometry for the calendar PDF: A3 portrait pages (297 × 420 mm), the
 * trim of Gelato's A3 wall calendar. Symmetric margins (wire-O bound at the top;
 * no side gutter to worry about for the artwork area). Trim + bleed + boxes.
 * Confirm bleed against Gelato's calendar template before the first order.
 */

import type { PageSpec } from "@/lib/book-pdf/geometry";

export const CALENDAR_SPEC: PageSpec = {
  trimWmm: 297,
  trimHmm: 420,
  bleedMm: 3,
  // Extra top margin leaves room clear of the wire-O binding at the top edge.
  marginTopMm: 18,
  marginBottomMm: 16,
  marginInnerMm: 16,
  marginOuterMm: 16,
};

/**
 * Grid dimensions for each month. Landscape (fills the A3 month box, which is
 * ~265×206 mm — wider than tall), ~18 mm cells (very legible, bigger than the
 * book's ~12 mm A5 cells), holds ~8 custom words, and generates reliably. See
 * the sizing analysis; bumping past ~17 wide slows generation (×12 per order).
 */
export const CALENDAR_GRID_WIDTH = 15;
export const CALENDAR_GRID_HEIGHT = 11;

export const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/** Weekday column labels, Monday-first (French week convention). */
export const WEEKDAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Number of days in `month` (1–12) of `year`. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Monday-first index (0 = Monday … 6 = Sunday) of the month's first day. */
export function firstWeekdayMondayIndex(year: number, month: number): number {
  const sundayFirst = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  return (sundayFirst + 6) % 7;
}
