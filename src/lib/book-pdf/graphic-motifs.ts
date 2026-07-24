/**
 * Baked graphic-tile motifs, shared by the print engine (compose-photo-page)
 * and the on-screen preview so both draw pixel-identical tiles. Each helper
 * returns inner SVG markup that fills a w×h box.
 */

export type Motif = "vesica" | "solid" | "hand";
export type HandDir = "up" | "down" | "left" | "right";

/** When set, hands render from pre-oriented cut-out PNGs at
 * `${HAND_IMAGE_DIR}/hand-{dir}.png` (with their vintage paper ground) instead
 * of the drawn manicule. The print engine reads them from public/; the preview
 * loads them over HTTP. Set to null to fall back to the drawn manicule. */
export const HAND_IMAGE_DIR: string | null = "/motifs";

/** Public URL of the cut-out for a direction, or null when disabled. */
export function handImageSrc(dir: HandDir = "right"): string | null {
  return HAND_IMAGE_DIR ? `${HAND_IMAGE_DIR}/hand-${dir}.png` : null;
}

const INK = "#171512";
const LENS = "#fff6ec"; // cream lens reads as the paper cutting through the tile

/** Horizontal vesica lens of width w and vertical thickness h, centred at (cx,cy). */
function vesica(cx: number, cy: number, w: number, h: number): string {
  const r = (h * h + w * w) / (4 * h);
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  return `M ${x0} ${cy} A ${r} ${r} 0 0 1 ${x1} ${cy} A ${r} ${r} 0 0 1 ${x0} ${cy} Z`;
}

const HAND_ROT: Record<HandDir, number> = { right: 0, down: 90, left: 180, up: 270 };

/** A detailed vintage manicule (pointing hand) centred in a w×h box, pointing
 * `dir`: articulated index finger, knuckles, thumb and a shirt cuff. Base art is
 * drawn in a 130×90 user space (pointing right) then rotated into place. The
 * crease lines are drawn in the cell colour so they read as cuts in the ink. */
export function handMarkup(w: number, h: number, dir: HandDir, paper: string, ink = INK): string {
  const scale = (Math.min(w, h) * 0.6) / 130;
  const cx = w / 2;
  const cy = h / 2;
  return `<g transform="rotate(${HAND_ROT[dir]} ${cx} ${cy}) translate(${cx} ${cy}) scale(${scale}) translate(-65 -45)">
    <path d="M2 30 L26 24 L26 66 L2 60 Z" fill="${ink}"/>
    <path d="M22 24 h7 v42 h-7 Z" fill="${ink}"/>
    <rect x="27" y="22" width="42" height="46" rx="14" fill="${ink}"/>
    <path d="M58 30 Q112 28 122 35 Q124 37 122 39 Q112 46 58 44 Z" fill="${ink}"/>
    <path d="M116 34 Q120 37 116 40" fill="none" stroke="${paper}" stroke-width="1.4"/>
    <path d="M40 24 Q42 8 56 8 Q64 8 64 15 Q64 22 52 24 Z" fill="${ink}"/>
    <rect x="52" y="44" width="22" height="9" rx="4.5" fill="${ink}"/>
    <rect x="51" y="52" width="20" height="9" rx="4.5" fill="${ink}"/>
    <rect x="50" y="60" width="18" height="9" rx="4.5" fill="${ink}"/>
    <path d="M54 48.5 h20" stroke="${paper}" stroke-width="1.3"/>
    <path d="M53 56.5 h18" stroke="${paper}" stroke-width="1.3"/>
    <path d="M56 44 Q60 40 66 40" stroke="${paper}" stroke-width="1.3" fill="none"/>
    <path d="M9 33 L9 57" stroke="${paper}" stroke-width="1.3"/>
  </g>`;
}

/** Inner SVG markup for a baked graphic tile filling a w×h box. */
export function graphicInner(
  w: number,
  h: number,
  color: string,
  motif: Motif = "vesica",
  dir: HandDir = "right",
): string {
  const bg = `<rect width="${w}" height="${h}" fill="${color}"/>`;
  if (motif === "solid") return bg;
  if (motif === "hand") return bg + handMarkup(w, h, dir, color);
  return (
    bg +
    `<path d="${vesica(w / 2, h * 0.255, w, h * 0.5)}" fill="${LENS}"/>` +
    `<path d="${vesica(w / 2, h * 0.745, w, h * 0.5)}" fill="${LENS}"/>`
  );
}
