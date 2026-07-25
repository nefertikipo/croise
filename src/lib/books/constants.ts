/**
 * Product-level book sizing rules, shared by client and server code
 * (keep this file free of server-only imports).
 *
 * A real printed book needs enough grids to feel like a gift and enough
 * interior pages to be accepted by the POD printer (perfect-bound minimums
 * are typically ~24 pages). The editor nudges toward BOOK_MIN_GRIDS and
 * offers generic grids + notes pages to fill the gap.
 */
export const BOOK_MIN_GRIDS = 12;

/** Typical POD perfect-bound minimum interior page count (calibrate with the
 * chosen Gelato product before the first order). */
export const POD_MIN_INTERIOR_PAGES = 24;
