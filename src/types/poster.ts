/**
 * Shared types for the poster product: a mots fléchés grid printed large and
 * framed. A poster is just a crossword printed at wall-art size — no separate
 * entity, so it loads straight from `crosswords` by share code.
 */

import type { BookWord, FlecheCell } from "@/types/book";

export interface PosterData {
  /** The crossword's share code (also the poster's identifier). */
  code: string;
  title: string | null;
  width: number;
  height: number;
  cells: FlecheCell[][];
  words: BookWord[];
}
