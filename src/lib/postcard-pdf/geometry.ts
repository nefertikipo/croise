/**
 * Print geometry for the postcard ("carte") PDF: a flat A6 card, printed both
 * sides. Unlike the book (bound, mirrored binding-gutter margins, recto/verso),
 * a card is two independent single-sided faces with symmetric margins, so it
 * reuses the book engine's PageSpec/pageGeometry with equal inner/outer margins.
 *
 * Output is trim + bleed with TrimBox/BleedBox metadata and NO crop marks —
 * what Gelato's card catalog expects. Confirm the bleed against the exact Gelato
 * product template before the first real order (Gelato ships downloadable
 * templates per product UID); 3 mm is their standard card bleed.
 */

import type { PageSpec } from "@/lib/book-pdf/geometry";

/** A6 flat card: 105 × 148 mm trim, Gelato's best-selling greeting-card size. */
export const POSTCARD_SPEC: PageSpec = {
  trimWmm: 105,
  trimHmm: 148,
  // Gelato's standard card bleed.
  bleedMm: 3,
  // Symmetric safe margins — no binding gutter on a flat card.
  marginTopMm: 6,
  marginBottomMm: 6,
  marginInnerMm: 6,
  marginOuterMm: 6,
};

/**
 * Grid dimensions printed on the front of a card. Sized so at least 3 real
 * custom words (names — the whole point of a personalized card) place reliably:
 * measured capacity is ~1 word at 5×7 and ~4 at 8×11, and small grids choke well
 * below their fill-ratio limit (see check-capacity.ts + the capacity stress
 * tests), so a smaller grid (e.g. 7×9 ≈ 2 name-words) can't guarantee 3. 8×11
 * (88 cells) fits ~4 invented/name words, and its 8:11 aspect ≈ A6's 105:148,
 * so it fills the card face with ~11 mm cells — still comfortably writable.
 */
export const POSTCARD_GRID_WIDTH = 8;
export const POSTCARD_GRID_HEIGHT = 11;
