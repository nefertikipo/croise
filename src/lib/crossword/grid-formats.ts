/**
 * The three grid formats offered across the app (standalone /fleche composer
 * and the book grid creator). Rationalized to named presets so the choice
 * reads as an editorial size, not a raw dimension: petite, moyenne, classique.
 *
 * "moyenne" is the default — big enough to feel like a real puzzle, but its
 * cells stay large enough on an A5 page that the clue text prints legibly (the
 * denser "classique" grid floors long clues at ~2 pt on A5). "classique" is
 * still one tap away for anyone who wants the fuller grid. Keep this file free of
 * client/server-only imports so both sides can share it.
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
