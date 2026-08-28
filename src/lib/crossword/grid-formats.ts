/**
 * The three grid formats offered across the app (standalone /fleche composer
 * and the book grid creator). Rationalized to named presets so the choice
 * reads as an editorial size, not a raw dimension: petite, moyenne, classique.
 *
 * "classique" is the default — the standard, full mots fléchés grid. It floored
 * long clues at ~2 pt on the old A5 book, but the book now prints on the wider
 * Crown Quarto trim (see POD_PAGE_SIZE) where 11×17 clue text stays legible, so
 * the fuller grid is the right default again. "moyenne"/"petite" remain one tap
 * away. Keep this file free of client/server-only imports so both sides share it.
 */
export interface GridFormat {
  /** Stable id used for selection and as the default marker. */
  id: "petite" | "moyenne" | "classique";
  label: string;
  w: number;
  h: number;
}

export const GRID_FORMATS: GridFormat[] = [
  { id: "petite", label: "Petite", w: 8, h: 11 },
  { id: "moyenne", label: "Moyenne", w: 9, h: 13 },
  { id: "classique", label: "Classique", w: 11, h: 17 },
];

/** The default preset (moyenne) — the largest grid that stays legible on A5. */
export const DEFAULT_GRID_FORMAT: GridFormat =
  GRID_FORMATS.find((f) => f.id === "moyenne") ?? GRID_FORMATS[GRID_FORMATS.length - 1];
