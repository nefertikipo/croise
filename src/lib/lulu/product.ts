/**
 * The Lulu product our book maps to.
 *
 * pod_package_id (dotted format): [Trim].[Ink].[Quality].[Binding].[Paper].[Finish]
 * - 0583X0827  → A5 trim, 5.83 × 8.27 in (148 × 210 mm)
 * - FC         → full colour ink
 * - STD        → standard quality
 * - SS         → saddle stitch (lies flat for solving; 4-48 interior pages)
 * - 060UW444   → 60# UNCOATED white paper — writable with pen/pencil, which a
 *                crossword book must be (coated/silk papers smear)
 * - MXX        → matte cover, no linen, no foil
 *
 * Confirm this exact SKU exists in the pricing calculator before the first
 * real order (developers.lulu.com/price-calculator); override via env if the
 * chosen paper/finish differs.
 */
export const LULU_POD_PACKAGE_ID =
  process.env.LULU_POD_PACKAGE_ID ?? "0583X0827.FC.STD.SS.060UW444.MXX";

/** Public base URL Lulu fetches the PDFs from (must be reachable from Lulu). */
export const LULU_SOURCE_BASE =
  process.env.LULU_SOURCE_BASE ?? "https://lesfleches.com";

export function bookSourceUrls(code: string): { interiorUrl: string; coverUrl: string } {
  return {
    interiorUrl: `${LULU_SOURCE_BASE}/api/books/${code}/book.pdf?size=a5`,
    coverUrl: `${LULU_SOURCE_BASE}/api/books/${code}/cover.pdf`,
  };
}
