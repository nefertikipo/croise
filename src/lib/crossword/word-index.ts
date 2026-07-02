import type { BookWord, GridPage, WordIndexEntry } from "@/types/book";

/**
 * Build the book's word index: for each grid (in book order), every placed word
 * sorted alphabetically. Rendered as an index section at the back of the book and
 * in the print layout.
 */
export function buildWordIndex(grids: Pick<GridPage, "words">[]): WordIndexEntry[] {
  return grids.map((grid, i) => ({
    grid: i + 1,
    words: [...grid.words]
      .map((w: BookWord) => w.answer.toUpperCase())
      .sort((a, b) => a.localeCompare(b, "fr")),
  }));
}
