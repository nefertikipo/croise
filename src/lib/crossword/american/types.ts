// =============================================================================
// american/types.ts — data model for American-style crosswords ("mots croisés")
// =============================================================================
// Deliberately SELF-CONTAINED: this module does not import from the mots fléchés
// engine (fleche-*.ts). The only shared assets it reuses are the generic
// `WordList` class and the French corpus loader. American puzzles have a
// fundamentally different model from fléchés: black blocker squares + numbered
// white cells + two external Across/Down clue lists (no in-grid arrow cells).
// =============================================================================

export type Direction = "across" | "down";

/**
 * A single grid cell. Either a black blocker square, or a white letter cell.
 * `number` is the clue number printed in the cell's corner (only word-start
 * cells get one; interior cells are `null`).
 */
export type AmCell =
  | { kind: "block" }
  | { kind: "letter"; letter: string; number: number | null };

/** A grid of cells, row-major `cells[y][x]`. */
export interface AmGrid {
  width: number;
  height: number;
  cells: AmCell[][];
}

/**
 * A word slot: a maximal run of >= 3 white cells, horizontal (across) or
 * vertical (down). `number` is the standard crossword number shown in its first
 * cell. Cells are listed in reading order (left→right / top→bottom).
 */
export interface AmSlot {
  id: number;
  number: number;
  direction: Direction;
  cells: { x: number; y: number }[];
  length: number;
}

/**
 * A crossing between two slots: `a`'s position `ai` occupies the same grid cell
 * as `b`'s position `bi`. Every American crossing is between one across and one
 * down slot.
 */
export interface AmCrossing {
  a: number; // slot id
  b: number; // slot id
  ai: number; // index within slot a
  bi: number; // index within slot b
}

/** A resolved clue in one of the two lists. */
export interface AmClue {
  number: number;
  direction: Direction;
  clue: string;
  answer: string;
  isCustom: boolean;
  /** Start cell (0-indexed grid coords). */
  row: number;
  col: number;
  length: number;
  /** 1=facile, 2=moyen, 3=difficile; null for custom/unscored. */
  difficulty: number | null;
}

/** The finished puzzle handed to the API / renderer. */
export interface AmPuzzle {
  width: number;
  height: number;
  cells: AmCell[][];
  across: AmClue[];
  down: AmClue[];
}
