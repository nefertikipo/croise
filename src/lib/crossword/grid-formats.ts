/**
 * The three grid formats offered across the app (standalone /fleche composer
 * and the book grid creator). Rationalized to named presets so the choice
 * reads as an editorial size, not a raw dimension: petite, moyenne, classique.
 *
 * "classique" is the default — the standard mots fléchés grid that fills an A5
 * book page nicely. Keep this file free of client/server-only imports so both
 * sides can share it.
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

/** The default preset (classique). */
export const DEFAULT_GRID_FORMAT: GridFormat =
  GRID_FORMATS.find((f) => f.id === "classique") ?? GRID_FORMATS[GRID_FORMATS.length - 1];
