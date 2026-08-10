/**
 * Shared types for the calendar product: 12 monthly mots fléchés grids bound as
 * an A3 wall calendar. Each month page pairs a grid (to solve) with that month's
 * date grid. Grids live in `crosswords`; the calendar just orders them by month.
 */

import type { FlecheCell } from "@/types/book";

export interface CalendarMonthGrid {
  /** 1 = January … 12 = December. */
  month: number;
  code: string;
  width: number;
  height: number;
  cells: FlecheCell[][];
}

export interface CalendarData {
  code: string;
  title: string | null;
  year: number;
  /** Accent colour for the grids' clue cells (hex); null = default blueprint. */
  gridColor: string | null;
  /** The month grids present so far (0–12), in month order. */
  months: CalendarMonthGrid[];
}
