/**
 * Mots fléchés generator - custom-word-first approach.
 *
 * Algorithm:
 * 1. Place custom words first, maximizing crossings between them
 * 2. Place clue cells adjacent to each word's start
 * 3. Scan remaining empty space, add clue cells to create fillable slots
 * 4. Fill those slots with dictionary words via backtracking
 * 5. Assign real clues from the database
 *
 * Every grid is unique because it's built around the user's words.
 */

import type {
  FlecheCell,
  FlecheGrid,
  FlecheWord,
  FlecheGenerationParams,
  ArrowDirection,
  ClueInCell,
} from "@/lib/crossword/fleche-types";
import type { WordList } from "@/lib/crossword/word-list";

// Internal types
interface PlacedWord {
  word: string;
  row: number;
  col: number;
  direction: ArrowDirection;
  clue?: string;
  isCustom: boolean;
}

interface Slot {
  clueRow: number;
  clueCol: number;
  startRow: number;
  startCol: number;
  direction: ArrowDirection;
  length: number;
}

// Grid cell types during generation
const EMPTY = 0;
const LETTER = 1;
const CLUE = 2;

type CellType = typeof EMPTY | typeof LETTER | typeof CLUE;

/**
 * Check if a word can be placed at a position.
 * Returns crossing count (>=0) or -1 if invalid.
 */
function canPlace(
  word: string,
  row: number,
  col: number,
  dir: ArrowDirection,
  letterGrid: (string | null)[][],
  typeGrid: CellType[][],
  height: number,
  width: number
): number {
  let crossings = 0;

  for (let i = 0; i < word.length; i++) {
    const r = dir === "right" ? row : row + i;
    const c = dir === "right" ? col + i : col;

    if (r < 0 || r >= height || c < 0 || c >= width) return -1;
    if (typeGrid[r][c] === CLUE) return -1;

    const existing = letterGrid[r][c];
    if (existing !== null) {
      if (existing !== word[i]) return -1;
      crossings++;
    }
  }

  // Need the cell before the word start for the clue cell
  const clueR = dir === "right" ? row : row - 1;
  const clueC = dir === "right" ? col - 1 : col;
  if (clueR < 0 || clueC < 0 || clueR >= height || clueC >= width) return -1;
  // Clue cell position must be empty or already a clue cell
  if (typeGrid[clueR][clueC] === LETTER) return -1;

  return crossings;
}

/**
 * Place a word on the grid.
 */
function placeOnGrid(
  word: string,
  row: number,
  col: number,
  dir: ArrowDirection,
  letterGrid: (string | null)[][],
  typeGrid: CellType[][]
) {
  for (let i = 0; i < word.length; i++) {
    const r = dir === "right" ? row : row + i;
    const c = dir === "right" ? col + i : col;
    letterGrid[r][c] = word[i];
    typeGrid[r][c] = LETTER;
  }
  // Mark clue cell
  const clueR = dir === "right" ? row : row - 1;
  const clueC = dir === "right" ? col - 1 : col;
  typeGrid[clueR][clueC] = CLUE;
}

/**
 * Place custom words trying to maximize crossings.
 */
function placeCustomWords(
  customWords: { word: string; clue: string }[],
  letterGrid: (string | null)[][],
  typeGrid: CellType[][],
  height: number,
  width: number
): PlacedWord[] {
  const placed: PlacedWord[] = [];
  const sorted = [...customWords].sort((a, b) => b.word.length - a.word.length);

  for (const cw of sorted) {
    const word = cw.word;
    let bestPos: { row: number; col: number; dir: ArrowDirection; crossings: number } | null = null;

    // Try all positions and both directions
    for (const dir of ["right", "down"] as ArrowDirection[]) {
      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          // Check bounds
          const endR = dir === "right" ? r : r + word.length - 1;
          const endC = dir === "right" ? c + word.length - 1 : c;
          if (endR >= height || endC >= width) continue;

          const crossings = canPlace(word, r, c, dir, letterGrid, typeGrid, height, width);
          if (crossings < 0) continue;

          // Prefer positions with more crossings, then more central
          const centrality = -Math.abs(r - height / 2) - Math.abs(c - width / 2);
          const score = crossings * 100 + centrality;

          if (!bestPos || score > bestPos.crossings * 100 + (-Math.abs(bestPos.row - height / 2) - Math.abs(bestPos.col - width / 2))) {
            bestPos = { row: r, col: c, dir, crossings };
          }
        }
      }
    }

    if (bestPos) {
      placeOnGrid(word, bestPos.row, bestPos.col, bestPos.dir, letterGrid, typeGrid);
      placed.push({
        word,
        row: bestPos.row,
        col: bestPos.col,
        direction: bestPos.dir,
        clue: cw.clue,
        isCustom: true,
      });
    }
  }

  return placed;
}

/**
 * Scan the grid and create word slots by placing additional clue cells.
 * Targets slot lengths of 3-7 letters.
 */
function createSlots(
  typeGrid: CellType[][],
  letterGrid: (string | null)[][],
  height: number,
  width: number
): Slot[] {
  const slots: Slot[] = [];

  // First: collect existing clue-cell slots (from custom word placement)
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (typeGrid[r][c] !== CLUE) continue;

      // Right slot
      if (c + 1 < width && typeGrid[r][c + 1] !== CLUE) {
        let len = 0;
        let cc = c + 1;
        while (cc < width && typeGrid[r][cc] !== CLUE) { len++; cc++; }
        if (len >= 3) {
          slots.push({ clueRow: r, clueCol: c, startRow: r, startCol: c + 1, direction: "right", length: len });
        }
      }

      // Down slot
      if (r + 1 < height && typeGrid[r + 1][c] !== CLUE) {
        let len = 0;
        let rr = r + 1;
        while (rr < height && typeGrid[rr][c] !== CLUE) { len++; rr++; }
        if (len >= 3) {
          slots.push({ clueRow: r, clueCol: c, startRow: r + 1, startCol: c, direction: "down", length: len });
        }
      }
    }
  }

  // Second: scan for long empty/letter runs without a clue cell, add clue cells to break them up
  // Horizontal runs
  for (let r = 1; r < height; r++) {
    let runStart = -1;
    for (let c = 0; c <= width; c++) {
      const isEnd = c === width || typeGrid[r][c] === CLUE;
      if (!isEnd && runStart === -1) runStart = c;
      if (isEnd && runStart !== -1) {
        const runLen = c - runStart;
        if (runLen >= 3) {
          // This run needs a clue cell at its start
          // Check if the cell before runStart can be a clue
          const clueC = runStart - 1;
          if (clueC >= 0 && typeGrid[r][clueC] !== LETTER) {
            typeGrid[r][clueC] = CLUE;
            // If run is too long, break it up
            let segStart = runStart;
            while (segStart < c) {
              const maxLen = Math.min(3 + Math.floor(Math.random() * 4), c - segStart);
              if (maxLen >= 3) {
                slots.push({
                  clueRow: r, clueCol: segStart - 1 < 0 ? segStart : segStart - 1,
                  startRow: r, startCol: segStart,
                  direction: "right", length: maxLen,
                });
              }
              segStart += maxLen;
              if (segStart < c - 2) {
                // Place a clue cell to start next segment
                if (typeGrid[r][segStart] !== LETTER) {
                  typeGrid[r][segStart] = CLUE;
                  segStart++;
                } else {
                  break;
                }
              }
            }
          }
        }
        runStart = -1;
      }
    }
  }

  // Vertical runs
  for (let c = 1; c < width; c++) {
    let runStart = -1;
    for (let r = 0; r <= height; r++) {
      const isEnd = r === height || typeGrid[r][c] === CLUE;
      if (!isEnd && runStart === -1) runStart = r;
      if (isEnd && runStart !== -1) {
        const runLen = r - runStart;
        if (runLen >= 3) {
          const clueR = runStart - 1;
          if (clueR >= 0 && typeGrid[clueR][c] !== LETTER) {
            typeGrid[clueR][c] = CLUE;
            let segStart = runStart;
            while (segStart < r) {
              const maxLen = Math.min(3 + Math.floor(Math.random() * 4), r - segStart);
              if (maxLen >= 3) {
                slots.push({
                  clueRow: segStart - 1 < 0 ? segStart : segStart - 1, clueCol: c,
                  startRow: segStart, startCol: c,
                  direction: "down", length: maxLen,
                });
              }
              segStart += maxLen;
              if (segStart < r - 2) {
                if (typeGrid[segStart][c] !== LETTER) {
                  typeGrid[segStart][c] = CLUE;
                  segStart++;
                } else {
                  break;
                }
              }
            }
          }
        }
        runStart = -1;
      }
    }
  }

  // Filter: valid length, and answer start cell must not be a clue cell
  return slots.filter((s) => {
    if (s.length < 3 || s.length > 8) return false;
    // Verify every cell in the slot is not a clue cell
    for (let i = 0; i < s.length; i++) {
      const r = s.direction === "right" ? s.startRow : s.startRow + i;
      const c = s.direction === "right" ? s.startCol + i : s.startCol;
      if (r >= height || c >= width) return false;
      if (typeGrid[r][c] === CLUE) return false;
    }
    return true;
  });
}

/**
 * Get candidates for a slot given current grid state.
 */
function getCandidates(
  slot: Slot,
  letterGrid: (string | null)[][],
  wordList: WordList,
  usedWords: Set<string>
): string[] {
  const constraints: { pos: number; letter: string }[] = [];

  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === "right" ? slot.startRow : slot.startRow + i;
    const c = slot.direction === "right" ? slot.startCol + i : slot.startCol;
    const letter = letterGrid[r]?.[c];
    if (letter) constraints.push({ pos: i, letter });
  }

  let words: string[];
  if (constraints.length === 0) {
    words = wordList.getByLength(slot.length).map((e) => e.word);
  } else {
    words = wordList.getByConstraint(slot.length, constraints[0].pos, constraints[0].letter);
    for (let i = 1; i < constraints.length; i++) {
      words = words.filter((w) => w[constraints[i].pos] === constraints[i].letter);
    }
  }

  return words.filter((w) => !usedWords.has(w));
}

/**
 * Fill slots with dictionary words using backtracking.
 */
function fillSlots(
  slots: Slot[],
  letterGrid: (string | null)[][],
  wordList: WordList,
  usedWords: Set<string>
): Map<number, string> {
  const placed = new Map<number, string>();
  let backtracks = 0;
  const MAX_BT = 200_000;

  function solve(idx: number): boolean {
    if (idx >= slots.length) return true;
    if (backtracks > MAX_BT) return false;

    // MRV heuristic
    let bestIdx = idx;
    let bestCount = Infinity;
    for (let i = idx; i < slots.length; i++) {
      if (placed.has(i)) continue;
      const count = getCandidates(slots[i], letterGrid, wordList, usedWords).length;
      if (count < bestCount) { bestCount = count; bestIdx = i; }
      if (count === 0) break;
    }
    if (bestCount === 0) { backtracks++; return false; }

    [slots[idx], slots[bestIdx]] = [slots[bestIdx], slots[idx]];

    const slot = slots[idx];
    const cands = getCandidates(slot, letterGrid, wordList, usedWords);

    const shuffled = cands
      .map((w) => ({
        w,
        score: (wordList.getByLength(w.length).find((e) => e.word === w)?.score ?? 50) + Math.random() * 30,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 80)
      .map((x) => x.w);

    for (const word of shuffled) {
      const saved: { r: number; c: number; v: string | null }[] = [];
      for (let i = 0; i < word.length; i++) {
        const r = slot.direction === "right" ? slot.startRow : slot.startRow + i;
        const c = slot.direction === "right" ? slot.startCol + i : slot.startCol;
        saved.push({ r, c, v: letterGrid[r][c] });
        letterGrid[r][c] = word[i];
      }
      usedWords.add(word);
      placed.set(idx, word);

      if (solve(idx + 1)) return true;

      backtracks++;
      usedWords.delete(word);
      placed.delete(idx);
      for (const s of saved) letterGrid[s.r][s.c] = s.v;
    }

    [slots[idx], slots[bestIdx]] = [slots[bestIdx], slots[idx]];
    return false;
  }

  solve(0);
  return placed;
}

/**
 * Calculate grid dimensions based on custom words.
 */
function calculateGridSize(
  customWords: { word: string }[],
  requestedWidth: number,
  requestedHeight: number
): { width: number; height: number } {
  if (customWords.length === 0) {
    return { width: requestedWidth, height: requestedHeight };
  }

  const maxWordLen = Math.max(...customWords.map((w) => w.word.length));
  // Grid needs to be at least maxWordLen + 2 (for clue cell + margin)
  const minDim = maxWordLen + 3;

  return {
    width: Math.max(requestedWidth, minDim),
    height: Math.max(requestedHeight, minDim),
  };
}

/**
 * Main entry point: generate a mots fléchés grid.
 */
export function generateFleche(
  params: FlecheGenerationParams,
  wordList: WordList,
  clueDatabase: Map<string, string[]>
): FlecheGrid {
  const customClues = (params.customClues ?? [])
    .map((c) => ({
      word: c.answer.toUpperCase().replace(/[^A-Z]/g, ""),
      clue: c.clue,
    }))
    .filter((c) => c.word.length >= 3);

  const { width, height } = calculateGridSize(
    customClues,
    params.width,
    params.height
  );

  // Initialize grids
  const letterGrid: (string | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );
  const typeGrid: CellType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => EMPTY)
  );

  // Place initial clue cells in a scattered pattern.
  // First column: clue cells (right-pointing) on every other row
  for (let r = 0; r < height; r += 2) {
    typeGrid[r][0] = CLUE;
  }
  // First row: clue cells (down-pointing) on every other column
  for (let c = 0; c < width; c += 2) {
    typeGrid[0][c] = CLUE;
  }
  // Corner is always a clue cell
  typeGrid[0][0] = CLUE;

  // Step 1: Place custom words
  const customPlaced = placeCustomWords(customClues, letterGrid, typeGrid, height, width);
  const usedWords = new Set(customPlaced.map((p) => p.word));

  // Step 2: Create slots (adds more clue cells as needed)
  const slots = createSlots(typeGrid, letterGrid, height, width);

  // Step 3: Fill slots with dictionary words
  const filledMap = fillSlots(slots, letterGrid, wordList, usedWords);

  // Step 4: Build the output grid
  const cells: FlecheCell[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      if (typeGrid[r][c] === CLUE) {
        return { type: "clue" as const, clues: [] as ClueInCell[] };
      }
      const letter = letterGrid[r][c];
      if (letter) {
        return { type: "letter" as const, letter };
      }
      return { type: "empty" as const };
    })
  );

  // Assign clues
  const flecheWords: FlecheWord[] = [];

  // Custom words
  for (const pw of customPlaced) {
    const clueR = pw.direction === "right" ? pw.row : pw.row - 1;
    const clueC = pw.direction === "right" ? pw.col - 1 : pw.col;

    const cell = cells[clueR]?.[clueC];
    if (cell?.type === "clue" && cell.clues) {
      cell.clues.push({
        text: pw.clue!,
        direction: pw.direction,
        answerLength: pw.word.length,
        answer: pw.word,
      });
    }

    flecheWords.push({
      answer: pw.word,
      clue: pw.clue!,
      direction: pw.direction,
      clueRow: clueR,
      clueCol: clueC,
      startRow: pw.row,
      startCol: pw.col,
      length: pw.word.length,
      isCustom: true,
    });
  }

  // Dictionary-filled words
  for (const [slotIdx, word] of filledMap) {
    const slot = slots[slotIdx];
    const dbClues = clueDatabase.get(word);
    let clueText = word;
    if (dbClues && dbClues.length > 0) {
      // Prefer shorter clues that fit in a cell (under 30 chars)
      const short = dbClues.filter((c) => c.length <= 30);
      const pool = short.length > 0 ? short : dbClues;
      clueText = pool[Math.floor(Math.random() * pool.length)];
      // Hard cap at 35 chars
      if (clueText.length > 35) clueText = clueText.slice(0, 32) + "...";
    }

    const cell = cells[slot.clueRow]?.[slot.clueCol];
    if (cell?.type === "clue" && cell.clues) {
      cell.clues.push({
        text: clueText,
        direction: slot.direction,
        answerLength: word.length,
        answer: word,
      });
    }

    flecheWords.push({
      answer: word,
      clue: clueText,
      direction: slot.direction,
      clueRow: slot.clueRow,
      clueCol: slot.clueCol,
      startRow: slot.startRow,
      startCol: slot.startCol,
      length: word.length,
      isCustom: false,
    });
  }

  return { width, height, cells, words: flecheWords };
}
