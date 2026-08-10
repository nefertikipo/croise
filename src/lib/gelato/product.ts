/**
 * The Gelato product our postcard maps to.
 *
 * Gelato (not Lulu) fulfils the card: Lulu's Print API is book/booklet-only and
 * cannot produce a flat card, whereas Gelato has a real greeting-card catalog
 * (A6 105×148 mm is their best-selling size). The book stays on Lulu.
 *
 * Product UID format (Gelato):
 *   cards_pf_{size}_pt_{paper}_cl_{colors}_{orientation}
 * - cards_pf     → flat card product
 * - a6           → A6 trim (105 × 148 mm)
 * - pt 300-gsm-uncoated → paper. IMPORTANT: a mots fléchés card is solved with a
 *                  pen, so it MUST be an UNCOATED / writable stock — coated silk
 *                  smears (same reason the book uses uncoated paper). Confirm the
 *                  exact writable paper token exists for this size.
 * - cl 4-4       → full colour on BOTH sides (front grid + back message)
 * - ver          → vertical / portrait artwork
 *
 * This exact UID is verified against the live catalog — Gelato quoted it for
 * France (~€0.38/card). NOTE: Gelato's price tiers for this card start at
 * quantity 10 (a likely minimum order quantity) — confirm the MOQ before wiring
 * single-card checkout. Override via env to change paper/size.
 */
export const GELATO_POSTCARD_PRODUCT_UID =
  process.env.GELATO_POSTCARD_PRODUCT_UID ??
  "cards_pf_a6_pt_300-gsm-uncoated_cl_4-4_ver";

/**
 * The Gelato product our poster maps to: a large single-sided wall print of a
 * mots fléchés grid, "prête à encadrer".
 *
 * This exact UID is verified against the live catalog (fine-art catalog, 50 × 70
 * cm portrait, 200 gsm enhanced uncoated art paper, single-sided) — Gelato
 * quoted it at ~€13.87/unit qty 1 for France. The plain `posters` catalog tops
 * out at A4; large framable wall posters live under `fine-art`. Override via env
 * to change size/paper.
 */
export const GELATO_POSTER_PRODUCT_UID =
  process.env.GELATO_POSTER_PRODUCT_UID ??
  "fine_arts_poster_geo_simplified_product_12-0_ver_500x700-mm-20x28-inch_200-gsm-80lb-enhanced-uncoated";

/** Public base URL Gelato fetches the print file from (must be reachable). */
export const GELATO_SOURCE_BASE =
  process.env.GELATO_SOURCE_BASE ?? "https://lesfleches.com";

/** The print-ready card PDF URL Gelato pulls (front + back, one file). */
export function postcardSourceUrl(code: string): string {
  return `${GELATO_SOURCE_BASE}/api/postcards/${code}/card.pdf`;
}

/** The print-ready poster PDF URL Gelato pulls (single side). `code` is the
 * crossword's share code — a poster is just a grid, printed large. */
export function posterSourceUrl(code: string): string {
  return `${GELATO_SOURCE_BASE}/api/posters/${code}/poster.pdf`;
}

/**
 * Optional frame upsell for the poster: Gelato's `fine-art-framed-poster`
 * catalog offers the SAME 50×70 fine-art print combined with a frame as ONE
 * SKU — we send the identical poster PDF, Gelato prints + frames + ships it.
 * Only the wood frames are offered (verified live, FR/EUR qty 1):
 *   black €63.69 · white €63.69 · dark €63.69 · natural €67.70
 * (vs ~€13.87 bare). `swatch` is an on-screen approximation of the wood tone
 * for the frame picker + preview (see poster-frame-preview.tsx).
 */
export type PosterFrameColor = "black" | "white" | "natural" | "dark";

export const POSTER_FRAMES: {
  color: PosterFrameColor;
  label: string;
  /** Gelato colour token in the product UID. */
  token: string;
  /** CSS wood tones [outer, inner] for the on-screen frame mockup. */
  swatch: [string, string];
}[] = [
  { color: "black", label: "Noir", token: "black", swatch: ["#26221f", "#0f0d0c"] },
  { color: "white", label: "Blanc", token: "white", swatch: ["#f4efe6", "#dcd5c7"] },
  { color: "natural", label: "Bois clair", token: "natural-wood", swatch: ["#caa46a", "#a9834c"] },
  { color: "dark", label: "Bois foncé", token: "dark-wood", swatch: ["#5c3c24", "#3a2414"] },
];

/** The combined framed-poster SKU (500×700 fine-art + wood frame + plexiglass). */
export function framedPosterProductUid(color: PosterFrameColor): string {
  const token = POSTER_FRAMES.find((f) => f.color === color)?.token ?? "black";
  return `framed_fine_arts_poster_geo_simplified_product_12-0_${token}_wood_w12xt22-mm_plexiglass_ver_20x28-inch-500x700-mm_20x28-inch-500x700-mm_200-gsm-80lb-enhanced-uncoated`;
}

/**
 * The Gelato product our calendar maps to: an A3 portrait wall calendar,
 * wire-O bound with a hanging hook, printed both sides.
 *
 * Verified against the live catalog — Gelato quoted it at ~€9.56/unit qty 1 for
 * France. NOTE: every Gelato calendar stock is COATED SILK (no uncoated option),
 * so the printed grid is pencil-solvable, not pen (coated smears). The exact
 * page order / imposition Gelato expects for a 13-page (cover + 12 months) wall
 * calendar must be confirmed against their calendar template before the first
 * real order. Override via env.
 */
export const GELATO_CALENDAR_PRODUCT_UID =
  process.env.GELATO_CALENDAR_PRODUCT_UID ??
  "wall-calendars_pf_a3_pt_250-gsm-coated-silk_cl_4-4_bt_wire-with-hook-top_ver";

/** The print-ready calendar PDF URL Gelato pulls (cover + 12 months). */
export function calendarSourceUrl(code: string): string {
  return `${GELATO_SOURCE_BASE}/api/calendars/${code}/calendar.pdf`;
}
