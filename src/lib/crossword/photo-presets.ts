/**
 * Photo-in-grid presets: a maker can reserve a rectangular block of cells in a
 * book grid for a photo (like the mots fléchés that print a picture inside the
 * grid). The generator fills the rest of the grid around the block.
 *
 * This module is the SINGLE SOURCE OF TRUTH for where a preset's block sits, so
 * generation, the capacity guard, the on-screen overlay and the PDF compositor
 * all agree on the exact cell rectangle.
 *
 * Offered positions: CENTER + all four CORNERS. The Phase-0 + inset spikes
 * (scripts/spike-photo-block.ts) showed every one fills 100% at 11×17 with 4
 * custom words, PROVIDED the block sits at least COMB_INSET (3) cells off the
 * fixed potence/comb frame on row 0 / column 0 — flush corners collide with the
 * comb-seeded words and fail. Far edges (right/bottom) are not combs, so a small
 * EDGE_INSET keeps them tidy. Centre additionally costs no custom-word capacity
 * because it shatters the grid's hard full-width/height runs into short slots.
 */

/** A rectangle of grid cells, top-left origin, in cell units. */
export interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PhotoPresetId =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface PhotoPreset {
  id: PhotoPresetId;
  /** French label for the editor picker. */
  label: string;
}

export const PHOTO_PRESETS: PhotoPreset[] = [
  { id: "center", label: "Au centre" },
  { id: "top-left", label: "En haut à gauche" },
  { id: "top-right", label: "En haut à droite" },
  { id: "bottom-left", label: "En bas à gauche" },
  { id: "bottom-right", label: "En bas à droite" },
];

export const DEFAULT_PHOTO_PRESET: PhotoPresetId = "center";

const PRESET_IDS = new Set<string>(PHOTO_PRESETS.map((p) => p.id));
export function isPhotoPresetId(v: string): v is PhotoPresetId {
  return PRESET_IDS.has(v);
}

/**
 * The block's side length in cells for a given grid. Square in cell units (so it
 * prints square, since grid cells are square). ~40% of the width, clamped to
 * leave a solvable ring of cells around it. 11-wide → 4 (the validated size).
 */
function blockSide(width: number, height: number): number {
  const minDim = Math.min(width, height);
  const side = Math.round(width * 0.4);
  return Math.max(3, Math.min(side, minDim - 4));
}

/** Cells a corner block must keep clear of the row-0 / col-0 comb (validated). */
const COMB_INSET = 3;
/** Cells a corner block sits off the far (non-comb) right / bottom edge. */
const EDGE_INSET = 1;

/**
 * Resolve a preset id + grid dimensions to the exact reserved cell rectangle,
 * or null if the grid is too small to host the block at that position.
 */
export function reservedRectForPreset(
  preset: string,
  width: number,
  height: number,
): CellRect | null {
  if (!isPhotoPresetId(preset)) return null;
  const side = blockSide(width, height);
  if (side < 3) return null;

  const right = width - side - EDGE_INSET;
  const bottom = height - side - EDGE_INSET;
  let x: number;
  let y: number;
  switch (preset) {
    case "center":
      x = Math.round((width - side) / 2);
      y = Math.round((height - side) / 2);
      break;
    case "top-left":
      x = COMB_INSET;
      y = COMB_INSET;
      break;
    case "top-right":
      x = right;
      y = COMB_INSET;
      break;
    case "bottom-left":
      x = COMB_INSET;
      y = bottom;
      break;
    case "bottom-right":
      x = right;
      y = bottom;
      break;
  }

  // Must stay fully interior (off the row-0/col-0 combs) and within bounds.
  if (x < 1 || y < 1 || x + side > width || y + side > height) return null;
  return { x, y, w: side, h: side };
}

/** Aspect ratio (w/h) of a preset's photo slot — for the crop dialog. */
export function presetAspect(preset: string, width: number, height: number): number {
  const rect = reservedRectForPreset(preset, width, height);
  if (!rect) return 1;
  return rect.w / rect.h; // square cells → cell-count ratio is the pixel ratio
}
