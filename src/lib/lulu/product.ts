/**
 * The Lulu product our book maps to.
 *
 * pod_package_id (dotted format): [Trim].[Ink].[Quality].[Binding].[Paper].[Finish]
 * - 0583X0827  → A5 trim, 5.83 × 8.27 in (148 × 210 mm)
 * - FC         → full colour ink
 * - PRE        → premium quality (saddle stitch at A5 only exists in PRE full colour — verified against the live catalog 2026-07-26)
 * - SS         → saddle stitch (lies flat for solving; 4-48 interior pages)
 * - 060UW444   → 60# UNCOATED white paper — writable with pen/pencil, which a
 *                crossword book must be (coated/silk papers smear)
 * - GXX        → GLOSS cover (newsstand-magazine shine, same price as
 *                matte MXX), no linen, no foil. Interior stays uncoated/writable.
 *
 * Confirm this exact SKU exists in the pricing calculator before the first
 * real order (developers.lulu.com/price-calculator); override via env if the
 * chosen paper/finish differs.
 */
export const LULU_POD_PACKAGE_ID =
  process.env.LULU_POD_PACKAGE_ID ?? "0583X0827.FC.PRE.SS.060UW444.GXX";

/**
 * Lulu's exact wraparound cover spread for our saddle-stitch A5 SKU, straight
 * from the Print API `coverDimensions` endpoint. Verified against production
 * 2026-08-09: a constant 302.510 × 216.410 mm across page counts (saddle stitch
 * has no spine) and identical for the FC and BW inks. The cover generator sizes
 * its canvas to this so the file matches Lulu's spec to the 1/100 mm — their
 * trim is 5.83 × 8.27 in = 148.08 × 210.06 mm (a hair over nominal A5 148×210)
 * plus a uniform 0.125 in bleed, which is where our old ~0.18 mm gap came from.
 */
export const LULU_SADDLE_COVER_SPREAD_MM = { width: 302.51, height: 216.41 };

/** Public base URL Lulu fetches the PDFs from (must be reachable from Lulu). */
export const LULU_SOURCE_BASE =
  process.env.LULU_SOURCE_BASE ?? "https://lesfleches.com";

export function bookSourceUrls(code: string): { interiorUrl: string; coverUrl: string } {
  return {
    interiorUrl: `${LULU_SOURCE_BASE}/api/books/${code}/book.pdf?size=a5`,
    coverUrl: `${LULU_SOURCE_BASE}/api/books/${code}/cover.pdf`,
  };
}
