/**
 * Print template spec for the paid book — templates are DATA, not code.
 *
 * A cover template describes WHERE things go (photo slot, title box, grid) as
 * fractions of the trim box, plus physical trim size + bleed in millimetres.
 * The same spec drives the on-screen editor preview and the server-side PDF
 * composition engine (see compose-cover.ts), so the two can never drift.
 *
 * Decoration (frame / motif) is deliberately a swappable layer: today it's a
 * simple placeholder border; later it becomes a baked high-res asset dropped in
 * without touching the engine.
 */

/** Rectangle as fractions (0..1) of the trim box, origin at TOP-left. */
export interface FracRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Which edges of a slot extend into the bleed (i.e. print to the paper edge). */
export interface BleedEdges {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
}

/**
 * The "shuffled crossword grid" treatment — the same effect as the homepage
 * (ShuffledImage): slice the photo into cols x rows tiles and neighbour-swap
 * them, with gaps showing the page background between tiles.
 */
export interface ShuffleEffect {
  cols: number;
  rows: number;
  /** 0 = intact, 1 = fully shuffled. */
  intensity: number;
  seed: number;
  /** Gap between tiles in mm (reveals the page background). */
  gapMm: number;
}

export interface PhotoSlot {
  rect: FracRect;
  bleed?: BleedEdges;
  shuffle?: ShuffleEffect;
  /** Optional thin band drawn around the photo (the accent keyline). */
  border?: { color: string; widthPt: number };
}

export interface TitleBox {
  rect: FracRect;
  align: "left" | "center" | "right";
  /** Hex text colour. */
  color: string;
  /** Cap height as a fraction of trim height; the engine fits within the box. */
  sizeFrac: number;
  uppercase?: boolean;
  /** Optional solid fill behind the title — guarantees contrast independent of
   * the photo (the heavier bottom band). */
  fill?: string;
  /** Optional border drawn around the title box. */
  border?: { color: string; widthPt: number };
}

/** Placeholder frame — stand-in for the real baked decoration asset. */
export interface PlaceholderFrame {
  insetMm: number;
  color: string;
  widthPt: number;
}

export interface CoverTemplate {
  id: string;
  name: string;
  trimWidthMm: number;
  trimHeightMm: number;
  bleedMm: number;
  /** Hex page background, shown wherever no photo covers. */
  background: string;
  photo: PhotoSlot;
  title: TitleBox;
  frame?: PlaceholderFrame;
}

/** The dynamic, per-order inputs that fill a template. */
export interface CoverContent {
  title: string;
  /** Full-resolution original photo bytes (JPEG/PNG). */
  photo: Buffer;
  /** Title font file in public/fonts (see COVER_FONTS); defaults to the serif. */
  titleFontFile?: string;
  /** Render the title bold (synthetic — single-weight fonts). */
  titleBold?: boolean;
}
