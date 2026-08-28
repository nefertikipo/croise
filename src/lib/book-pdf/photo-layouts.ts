/**
 * Classic Cheerz-style photo-page layouts — DATA, not code. Each layout is a
 * set of photo slots (fractions of the A5 trim); the customer picks a layout
 * and drops a photo into each slot. Full-bleed slots print to the paper edge.
 *
 * Shared by the on-screen preview and the print composition engine.
 */

import type { FracRect, BleedEdges } from "@/lib/book-pdf/template-spec";
import type { Motif, HandDir } from "@/lib/book-pdf/graphic-motifs";
import { POD_TRIM } from "@/lib/books/constants";

export interface LayoutSlot {
  rect: FracRect;
  bleed?: BleedEdges;
  /** "photo" = customer fills it; "graphic" = baked colour tile. */
  kind?: "photo" | "graphic";
  /** Graphic tile colour (kind "graphic"). */
  color?: string;
  /** Graphic tile motif: "vesica" = SUNLEAK lens pair; "solid" = flat block; "hand" = manicule. */
  motif?: Motif;
  /** Pointing direction for motif "hand". */
  dir?: HandDir;
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
const ORANGE = "#d9612f";
// Swiss-grid warm-paper cell + heavy-rule black.
const PAPER = "#e9e0cf";
const INK = "#171512";

// Page margin + gap between photos, as fractions of the trim.
const M = 0.04;
const G = 0.03;
const HALF = (1 - 2 * M - G) / 2; // one of two photos across the inner width

const ALL_BLEED: BleedEdges = { top: true, right: true, bottom: true, left: true };

/** A uniform grid of square cells (SUNLEAK-style), centred on the A5 page with
 * tight cream gaps. Cells are square in millimetres. */
function uniformGrid(cols: number, rows: number, id: string, label: string, margin = 5, gap = 2): PhotoLayout {
  const W = POD_TRIM.w;
  const H = POD_TRIM.h;
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

/** Swiss modernist grid (Hermès): a non-uniform 4x6 module grid with cells that
 * span rows/columns, heavy black rules, sparse b&w photos, warm-paper negative
 * space, colour blocks and pointing hands. */
function hermesLayout(): PhotoLayout {
  const W = POD_TRIM.w;
  const H = POD_TRIM.h;
  const mx = 6;
  const my = 6;
  const gap = 3; // rule thickness
  const cols = 4;
  const rows = 6;
  const cw = (W - 2 * mx - (cols - 1) * gap) / cols;
  const rh = (H - 2 * my - (rows - 1) * gap) / rows;
  const cellRect = (c: number, r: number, cs: number, rs: number): FracRect => ({
    x: (mx + c * (cw + gap)) / W,
    y: (my + r * (rh + gap)) / H,
    w: (cs * cw + (cs - 1) * gap) / W,
    h: (rs * rh + (rs - 1) * gap) / H,
  });
  const photo = (c: number, r: number, cs = 1, rs = 1): LayoutSlot => ({ rect: cellRect(c, r, cs, rs) });
  const block = (c: number, r: number, color: string, cs = 1, rs = 1): LayoutSlot => ({
    rect: cellRect(c, r, cs, rs),
    kind: "graphic",
    motif: "solid",
    color,
  });
  const hand = (c: number, r: number, dir: HandDir): LayoutSlot => ({
    rect: cellRect(c, r, 1, 1),
    kind: "graphic",
    motif: "hand",
    color: PAPER,
    dir,
  });
  return {
    id: "hermes",
    label: "Hermès",
    background: INK,
    slots: [
      // rows 0-1
      hand(0, 0, "down"),
      photo(0, 1),
      block(1, 0, PAPER, 2, 2), // big cream negative space
      hand(3, 0, "left"),
      block(3, 1, SUN),
      // rows 2-3
      hand(0, 2, "right"),
      block(1, 2, ORANGE),
      photo(2, 2, 2, 1),
      photo(0, 3, 2, 1),
      block(2, 3, PAPER),
      block(3, 3, TEAL),
      block(3, 2, PAPER),
      // rows 4-5
      block(0, 4, PAPER, 1, 2), // tall cream
      photo(1, 4, 2, 1),
      hand(3, 4, "down"),
      block(1, 5, PAPER),
      photo(2, 5, 2, 1),
    ],
  };
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
    // Gapless 4x4; four graphic tiles at the reference's exact positions + colours.
    slots: uniformGrid(4, 4, "_", "_", 5, 0).slots.map((s, i) => {
      const g: Record<number, string> = { 2: "#2f7b4f", 4: "#4a6cc6", 11: "#d9612f", 13: "#e8c53f" };
      return g[i] ? { ...s, kind: "graphic", color: g[i] } : s;
    }),
  },
  hermesLayout(),
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
