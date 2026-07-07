import type { FlecheCell } from "@/types/book";

interface GridShape {
  width: number;
  height: number;
  cells: FlecheCell[][];
}

/** Normalize a word to bare uppercase A-Z letters. */
export function normalizeHiddenWord(word: string): string {
  return word.toUpperCase().replace(/[^A-Z]/g, "");
}

/**
 * Which of the hidden word's distinct letters don't appear anywhere in the
 * grid. If this is empty the word can (at least letter-wise) be spelled out.
 * Used to give the user a concrete reason when a hidden word can't be placed.
 */
export function missingHiddenLetters(grid: GridShape, word: string): string[] {
  const target = normalizeHiddenWord(word);
  if (!target) return [];
  const present = new Set<string>();
  for (const row of grid.cells) {
    for (const cell of row) {
      if (cell.type === "letter" && cell.letter) {
        present.add(cell.letter.toUpperCase());
      }
    }
  }
  return [...new Set([...target])].filter((ch) => !present.has(ch));
}

/**
 * Find letter cells that spell out a hidden word, one cell per letter, spread
 * across the grid. Returns a map of "row,col" -> 1-indexed position, or an empty
 * map if the word cannot be formed. Deterministic (greedy max-spread), so it can
 * be recomputed on load from just the stored word — no cell coords need saving.
 */
export function findHiddenWordCells(grid: GridShape, word: string): Map<string, number> {
  const target = normalizeHiddenWord(word);
  if (!target) return new Map();

  const letterPositions = new Map<string, { r: number; c: number }[]>();
  for (let r = 0; r < grid.height; r++) {
    for (let c = 0; c < grid.width; c++) {
      const cell = grid.cells[r][c];
      if (cell.type === "letter" && cell.letter) {
        const letter = cell.letter.toUpperCase();
        if (!letterPositions.has(letter)) letterPositions.set(letter, []);
        letterPositions.get(letter)!.push({ r, c });
      }
    }
  }

  const used = new Set<string>();
  const result = new Map<string, number>();

  for (let i = 0; i < target.length; i++) {
    const letter = target[i];
    const positions = letterPositions.get(letter);
    if (!positions) return new Map();

    let best: { r: number; c: number } | null = null;
    let bestScore = -1;

    for (const pos of positions) {
      const key = `${pos.r},${pos.c}`;
      if (used.has(key)) continue;

      let minDist = Infinity;
      for (const usedKey of used) {
        const [ur, uc] = usedKey.split(",").map(Number);
        const dist = Math.abs(pos.r - ur) + Math.abs(pos.c - uc);
        minDist = Math.min(minDist, dist);
      }
      const score = used.size === 0 ? 0 : minDist;

      if (score > bestScore) {
        bestScore = score;
        best = pos;
      }
    }

    if (!best) return new Map();
    const key = `${best.r},${best.c}`;
    used.add(key);
    result.set(key, i + 1);
  }

  return result;
}
