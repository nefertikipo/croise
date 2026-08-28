import { POD_PAGE_SIZE } from "@/lib/books/constants";
import type { PageSize } from "@/lib/book-pdf/geometry";

/**
 * The Lulu product our book maps to.
 *
 * pod_package_id (dotted format): [Trim].[Ink].[Quality].[Binding].[Paper].[Finish]
 * - 0744X0968  → Crown Quarto trim, 7.44 × 9.68 in (189 × 246 mm); 0583X0827 = A5
 * - BW         → black-and-white interior ink. This is the STANDARD edition:
 *               grids print mono (the interior PDF is rendered with ?bw=1), which
 *               is ~€5/copy cheaper and true to the newsstand mots-fléchés look.
 *               The colour "Édition Photo" upsell would use FC instead. NOTE: the
 *               COVER is always full colour regardless of this ink code.
 *               (B&W saddle stitch is offered at A5/Crown/A4 — verified against
 *               the live catalog 2026-08-27 via cost-calc + cover-dimensions.)
 * - STD        → standard quality (BW uses STD, not the FC-only PRE tier)
 * - SS         → saddle stitch (lies flat for solving; 4-48 interior pages)
 * - 060UW444   → 60# UNCOATED white paper — writable with pen/pencil, which a
 *                crossword book must be (coated/silk papers smear)
 * - GXX        → GLOSS cover (newsstand-magazine shine, same price as
 *                matte MXX), no linen, no foil. Interior stays uncoated/writable.
 *
 * Keyed to POD_PAGE_SIZE so flipping the trim swaps the SKU too. Override via
 * env if the chosen paper/finish/ink differs (e.g. the colour photo edition).
 */
const POD_SKU_BY_SIZE: Partial<Record<PageSize, string>> = {
  a5: "0583X0827.BW.STD.SS.060UW444.GXX",
  crown: "0744X0968.BW.STD.SS.060UW444.GXX",
};

export const LULU_POD_PACKAGE_ID =
  process.env.LULU_POD_PACKAGE_ID ??
  POD_SKU_BY_SIZE[POD_PAGE_SIZE] ??
  POD_SKU_BY_SIZE.crown!;

/**
 * Lulu's exact wraparound cover spread per saddle-stitch SKU, straight from the
 * Print API `coverDimensions` endpoint (constant across page counts — saddle
 * stitch has no spine — and identical for FC/BW inks). The cover generator sizes
 * its canvas to this so the file matches Lulu's spec to the 1/100 mm.
 * - A5:    302.510 × 216.410 mm (verified 2026-08-09)
 * - Crown: 384.300 × 252.200 mm (verified 2026-08-27)
 */
const COVER_SPREAD_BY_SIZE: Partial<Record<PageSize, { width: number; height: number }>> = {
  a5: { width: 302.51, height: 216.41 },
  crown: { width: 384.3, height: 252.2 },
};

export const LULU_SADDLE_COVER_SPREAD_MM =
  COVER_SPREAD_BY_SIZE[POD_PAGE_SIZE] ?? COVER_SPREAD_BY_SIZE.crown!;

/** Public base URL Lulu fetches the PDFs from (must be reachable from Lulu). */
export const LULU_SOURCE_BASE =
  process.env.LULU_SOURCE_BASE ?? "https://lesfleches.com";

export function bookSourceUrls(code: string): { interiorUrl: string; coverUrl: string } {
  return {
    // Standard edition = B&W interior at the POD trim (bw=1 renders mono).
    interiorUrl: `${LULU_SOURCE_BASE}/api/books/${code}/book.pdf?size=${POD_PAGE_SIZE}&bw=1`,
    coverUrl: `${LULU_SOURCE_BASE}/api/books/${code}/cover.pdf`,
  };
}
