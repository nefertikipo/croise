/**
 * Product-level book sizing rules, shared by client and server code
 * (keep this file free of server-only imports).
 *
 * A real printed book needs enough grids to feel like a gift and must land
 * inside the printer's saddle-stitch page window (see below). The editor nudges
 * toward BOOK_MIN_GRIDS and offers generic grids + notes pages to fill the gap.
 *
 * The printable window is a HARD rule enforced on both ends:
 * - MAX (BOOK_MAX_INTERIOR_PAGES): the add-page routes refuse to grow a book
 *   past the saddle-stitch ceiling, so no book can be built that the printer
 *   would reject.
 * - MIN (BOOK_MIN_INTERIOR_PAGES): the order flow refuses to send a book that
 *   is too thin to bind.
 */
export const BOOK_MIN_GRIDS = 8;

/** Lulu saddle stitch accepts 4-48 interior pages; we floor at 12 (a full
 * signature) so a book has a bit of heft without forcing a thick minimum.
 * HARD minimum for ordering/printing. */
export const BOOK_MIN_INTERIOR_PAGES = 12;

/** @deprecated Use {@link BOOK_MIN_INTERIOR_PAGES} — kept as an alias while
 * callers migrate. */
export const POD_MIN_INTERIOR_PAGES = BOOK_MIN_INTERIOR_PAGES;

/** Binding for the POD book (Lulu). Saddle stitch: lies flat for solving,
 * matches the crossword-magazine identity, 4-48 interior pages, and its cover
 * spread has NO spine panel. Switch to "perfect" if books outgrow 48 pages. */
export const BOOK_BINDING: "saddle-stitch" | "perfect" = "saddle-stitch";

/** Lulu's saddle-stitch page ceiling; above this the book must go perfect-bound.
 * HARD maximum: the add-page routes refuse to grow a book past this. */
export const SADDLE_MAX_INTERIOR_PAGES = 48;

/** Alias for {@link SADDLE_MAX_INTERIOR_PAGES} in the printable-window vocabulary. */
export const BOOK_MAX_INTERIOR_PAGES = SADDLE_MAX_INTERIOR_PAGES;

/** `crosswords.theme` value marking a shared "filler" grid — a pre-made grid
 * built from the community `/contribuer` words, used to top up short books. */
export const FILLER_THEME = "filler-contribuer";
