/**
 * Classic Cheerz-style photo-page layouts — DATA, not code. Each layout is a
 * set of photo slots (fractions of the A5 trim); the customer picks a layout
 * and drops a photo into each slot. Full-bleed slots print to the paper edge.
 *
 * Shared by the on-screen preview and the print composition engine.
 */

import type { FracRect, BleedEdges } from "@/lib/book-pdf/template-spec";

export interface LayoutSlot {
  rect: FracRect;
  bleed?: BleedEdges;
  /** "photo" = customer fills it; "graphic" = baked colour + lens motif tile. */
  kind?: "photo" | "graphic";
  /** Graphic tile colour (kind "graphic"). */
  color?: string;
}

export interface PhotoLayout {
  id: string;
  label: string;
  /** Page background (default cream). */
  background?: string;
  slots: LayoutSlot[];
}

// Brand tile colours.
const RED = "#cc3a2f";
const BLUE = "#2f6fd0";
const TEAL = "#1f7a4d";
const GOLD = "#bb9a62";
const SUN = "#e8c235";

// Page margin + gap between photos, as fractions of the trim.
const M = 0.04;
const G = 0.03;
const HALF = (1 - 2 * M - G) / 2; // one of two photos across the inner width

const ALL_BLEED: BleedEdges = { top: true, right: true, bottom: true, left: true };

/** A uniform grid of square cells (SUNLEAK-style), centred on the A5 page with
 * tight cream gaps. Cells are square in millimetres. */
function uniformGrid(cols: number, rows: number, id: string, label: string): PhotoLayout {
  const W = 148;
  const H = 210;
  const margin = 5;
  const gap = 2;
  const cell = (W - 2 * margin - (cols - 1) * gap) / cols;
  const blockH = rows * cell + (rows - 1) * gap;
  const top = (H - blockH) / 2;
  const slots: LayoutSlot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({
        rect: {
          x: (margin + c * (cell + gap)) / W,
          y: (top + r * (cell + gap)) / H,
          w: cell / W,
          h: cell / H,
        },
      });
    }
  }
  return { id, label, slots };
}

export const PHOTO_LAYOUTS: PhotoLayout[] = [
  {
    id: "full",
    label: "Pleine page",
    slots: [{ rect: { x: 0, y: 0, w: 1, h: 1 }, bleed: ALL_BLEED }],
  },
  {
    id: "single",
    label: "Une photo",
    slots: [{ rect: { x: 0.08, y: 0.08, w: 0.84, h: 0.84 } }],
  },
  {
    id: "two-v",
    label: "Deux · haut/bas",
    slots: [
      { rect: { x: M, y: M, w: 1 - 2 * M, h: HALF } },
      { rect: { x: M, y: M + HALF + G, w: 1 - 2 * M, h: HALF } },
    ],
  },
  {
    id: "two-h",
    label: "Deux · côte à côte",
    slots: [
      { rect: { x: M, y: M, w: HALF, h: 1 - 2 * M } },
      { rect: { x: M + HALF + G, y: M, w: HALF, h: 1 - 2 * M } },
    ],
  },
  {
    id: "four",
    label: "Quatre",
    slots: [
      { rect: { x: M, y: M, w: HALF, h: HALF } },
      { rect: { x: M + HALF + G, y: M, w: HALF, h: HALF } },
      { rect: { x: M, y: M + HALF + G, w: HALF, h: HALF } },
      { rect: { x: M + HALF + G, y: M + HALF + G, w: HALF, h: HALF } },
    ],
  },
  {
    id: "big-two",
    label: "Une grande + deux",
    slots: [
      { rect: { x: M, y: M, w: 1 - 2 * M, h: 0.58 } },
      { rect: { x: M, y: M + 0.58 + G, w: HALF, h: 1 - 2 * M - 0.58 - G } },
      { rect: { x: M + HALF + G, y: M + 0.58 + G, w: HALF, h: 1 - 2 * M - 0.58 - G } },
    ],
  },
  uniformGrid(3, 4, "grille-12", "Grille · 12"),
  uniformGrid(4, 4, "grille-16", "Grille · 16"),
  uniformGrid(4, 5, "grille-20", "Grille · 20"),
  {
    id: "sunleak",
    label: "Sunleak",
    slots: uniformGrid(4, 4, "_", "_").slots.map((s, i) => {
      const g: Record<number, string> = { 1: TEAL, 4: SUN, 6: BLUE, 11: RED, 13: TEAL };
      return g[i] ? { ...s, kind: "graphic", color: g[i] } : s;
    }),
  },
  {
    id: "hero",
    label: "Une grande",
    slots: [
      { rect: { x: 0.06, y: 0.06, w: 0.58, h: 0.42 } },
      { rect: { x: 0.68, y: 0.06, w: 0.26, h: 0.26 }, kind: "graphic", color: RED },
      { rect: { x: 0.68, y: 0.36, w: 0.26, h: 0.34 } },
      { rect: { x: 0.06, y: 0.54, w: 0.34, h: 0.4 } },
      { rect: { x: 0.44, y: 0.54, w: 0.2, h: 0.2 }, kind: "graphic", color: TEAL },
      { rect: { x: 0.44, y: 0.78, w: 0.5, h: 0.16 } },
    ],
  },
  {
    id: "field",
    label: "Sur couleur",
    background: RED,
    slots: [
      { rect: { x: 0.12, y: 0.12, w: 0.3, h: 0.22 } },
      { rect: { x: 0.54, y: 0.26, w: 0.26, h: 0.19 } },
      { rect: { x: 0.2, y: 0.46, w: 0.3, h: 0.22 } },
      { rect: { x: 0.16, y: 0.74, w: 0.34, h: 0.16 } },
    ],
  },
];

export function getPhotoLayout(id?: string): PhotoLayout {
  return PHOTO_LAYOUTS.find((l) => l.id === id) ?? PHOTO_LAYOUTS[0];
}
