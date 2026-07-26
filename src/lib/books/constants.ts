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

/** Typical POD perfect-bound minimum interior page count (Lulu saddle stitch
 * accepts 4-48; we aim for at least 24 so the book feels substantial). */
export const POD_MIN_INTERIOR_PAGES = 24;

/** Binding for the POD book (Lulu). Saddle stitch: lies flat for solving,
 * matches the crossword-magazine identity, 4-48 interior pages, and its cover
 * spread has NO spine panel. Switch to "perfect" if books outgrow 48 pages. */
export const BOOK_BINDING: "saddle-stitch" | "perfect" = "saddle-stitch";

/** Lulu's saddle-stitch page ceiling; above this the book must go perfect-bound. */
export const SADDLE_MAX_INTERIOR_PAGES = 48;
