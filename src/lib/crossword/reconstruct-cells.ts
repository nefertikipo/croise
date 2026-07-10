import type { ClueInCell, FlecheCell } from "@/types/book";

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
  /** JSON array of multi-word break offsets, if any. */
  breaks?: string | null;
}

/**
 * The single blue cell that "sources" a word, given only its start + direction
 * (the placement vector isn't persisted). Mirrors `findSource` in
 * fleche-vector-gen.ts: straight source first, then diagonal offset, then the
 * comb fallback. Returning ONE owner per word is what keeps a word from being
 * claimed by several blue cells — the old positional match let a single answer
 * appear in up to three cells, duplicating its clue text and drawing bent
 * arrows that pointed nowhere.
 */
function ownerBlueCell(
  w: StoredPlacedWord,
  isBlue: (x: number, y: number) => boolean,
): { x: number; y: number } | null {
  const r = w.startRow;
  const c = w.startCol;
  if (w.direction === "right") {
    if (isBlue(c - 1, r)) return { x: c - 1, y: r }; // straight-right
    if (isBlue(c - 1, r - 1)) return { x: c - 1, y: r - 1 }; // offset-right
    if (isBlue(c, r - 1)) return { x: c, y: r - 1 }; // top-comb offset
    if (c === 0) {
      for (let y = r - 1; y >= 0; y--) if (isBlue(0, y)) return { x: 0, y };
    }
  } else {
    if (isBlue(c, r - 1)) return { x: c, y: r - 1 }; // straight-down
    if (isBlue(c - 1, r - 1)) return { x: c - 1, y: r - 1 }; // offset-down
    if (isBlue(c - 1, r)) return { x: c - 1, y: r }; // left-comb offset
    if (r === 0) {
      for (let x = c - 1; x >= 0; x--) if (isBlue(x, 0)) return { x, y: 0 };
    }
  }
  return null;
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
  const isBlue = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < grid.width &&
    y < grid.height &&
    grid.gridPattern[y * grid.width + x] === "#";

  // Assign each word to its single owning blue cell up front, so no answer is
  // rendered in more than one cell.
  const cluesByCell = new Map<string, ClueInCell[]>();
  for (const w of words) {
    const owner = ownerBlueCell(w, isBlue);
    if (!owner) continue;
    const key = `${owner.x},${owner.y}`;
    const list = cluesByCell.get(key) ?? [];
    if (list.length >= 2) continue;
    list.push({
      text: w.clueText,
      direction: w.direction as "right" | "down",
      answerRow: w.startRow,
      answerCol: w.startCol,
      answerLength: w.length,
      answer: w.answer,
      isCustom: w.isCustom,
    });
    cluesByCell.set(key, list);
  }

  const cells: FlecheCell[][] = [];
  for (let y = 0; y < grid.height; y++) {
    const row: FlecheCell[] = [];
    for (let x = 0; x < grid.width; x++) {
      if (isBlue(x, y)) {
        row.push({ type: "clue", clues: cluesByCell.get(`${x},${y}`) ?? [] });
      } else {
        const letter = grid.gridSolution[y * grid.width + x];
        row.push({ type: "letter", letter: letter !== "#" ? letter : undefined });
      }
    }
    cells.push(row);
  }

  // Multi-word breaks: flag the trailing edge of each finished word's last cell.
  for (const w of words) {
    if (!w.breaks) continue;
    let offsets: number[];
    try {
      offsets = JSON.parse(w.breaks);
    } catch {
      continue;
    }
    for (const p of offsets) {
      if (p < 1 || p >= w.length) continue;
      const k = p - 1;
      const r = w.startRow + (w.direction === "down" ? k : 0);
      const c = w.startCol + (w.direction === "right" ? k : 0);
      const cell = cells[r]?.[c];
      if (cell?.type !== "letter") continue;
      if (w.direction === "right") cell.breakRight = true;
      else cell.breakBottom = true;
    }
  }

  return cells;
}
