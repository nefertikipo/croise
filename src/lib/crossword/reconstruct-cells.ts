import type { FlecheCell } from "@/types/book";

interface StoredCrossword {
  width: number;
  height: number;
  gridPattern: string;
  gridSolution: string;
}

interface StoredPlacedWord {
  answer: string;
  direction: string;
  startRow: number;
  startCol: number;
  length: number;
  clueText: string;
  isCustom: boolean;
}

/**
 * Rebuild the interactive `FlecheCell[][]` grid from the flat storage format
 * (pattern + solution strings) plus placed words. Shared by the grille and book
 * GET routes so persisted grids render identically to freshly generated ones.
 */
export function reconstructCells(
  grid: StoredCrossword,
  words: StoredPlacedWord[],
): FlecheCell[][] {
  const cells: FlecheCell[][] = [];
  for (let y = 0; y < grid.height; y++) {
    const row: FlecheCell[] = [];
    for (let x = 0; x < grid.width; x++) {
      const idx = y * grid.width + x;
      const isBlue = grid.gridPattern[idx] === "#";
      if (isBlue) {
        const clueData = words
          .filter((w) => {
            if (w.direction === "right" && w.startRow === y && w.startCol === x + 1) return true;
            if (w.direction === "down" && w.startCol === x && w.startRow === y + 1) return true;
            if (w.direction === "right" && w.startRow === y + 1 && w.startCol === x + 1) return true;
            if (w.direction === "down" && w.startRow === y + 1 && w.startCol === x + 1) return true;
            if (w.direction === "right" && w.startRow === y + 1 && w.startCol === x) return true;
            if (w.direction === "down" && w.startRow === y && w.startCol === x + 1) return true;
            return false;
          })
          .slice(0, 2)
          .map((w) => ({
            text: w.clueText,
            direction: w.direction as "right" | "down",
            answerRow: w.startRow,
            answerCol: w.startCol,
            answerLength: w.length,
            answer: w.answer,
            isCustom: w.isCustom,
          }));
        row.push({ type: "clue", clues: clueData });
      } else {
        const letter = grid.gridSolution[idx];
        row.push({ type: "letter", letter: letter !== "#" ? letter : undefined });
      }
    }
    cells.push(row);
  }
  return cells;
}
