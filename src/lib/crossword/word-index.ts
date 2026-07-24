import type { BookWord, GridPage, WordIndexEntry } from "@/types/book";

/**
 * Build the book's word index: every placed word across all grids, deduplicated
 * and grouped by word length (shortest first), alphabetical within each group.
 * Rendered as an index section at the back of the book and in the print layout.
 */
export function buildWordIndex(grids: Pick<GridPage, "words">[]): WordIndexEntry[] {
  const byLength = new Map<number, Set<string>>();
  for (const grid of grids) {
    for (const w of grid.words as BookWord[]) {
      const answer = w.answer.toUpperCase();
      let set = byLength.get(answer.length);
      if (!set) {
        set = new Set<string>();
        byLength.set(answer.length, set);
      }
      set.add(answer);
    }
  }
  return [...byLength.keys()]
    .sort((a, b) => a - b)
    .map((length) => ({
      length,
      words: [...byLength.get(length)!].sort((a, b) => a.localeCompare(b, "fr")),
    }));
}
