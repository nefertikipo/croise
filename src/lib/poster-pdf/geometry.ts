/**
 * Print geometry for the poster PDF: a single-sided 50 × 70 cm wall print.
 * Reuses the book engine's PageSpec/pageGeometry with symmetric margins (no
 * binding gutter). Trim + bleed + boxes, no crop marks — what Gelato expects.
 * Confirm the bleed against Gelato's poster template before the first order.
 */

import type { PageSpec } from "@/lib/book-pdf/geometry";

/** 50 × 70 cm poster, portrait — a framable statement size. */
export const POSTER_SPEC: PageSpec = {
  trimWmm: 500,
  trimHmm: 700,
  bleedMm: 3,
  // Generous safe margins so nothing important sits near the frame edge.
  marginTopMm: 30,
  marginBottomMm: 30,
  marginInnerMm: 30,
  marginOuterMm: 30,
};
