/**
 * Mots fléchés generator.
 *
 * Algorithm:
 * 1. Start with an empty grid of given dimensions
 * 2. Place clue cells in a pattern (typically first row and first column
 *    have more clue cells, but they can appear anywhere)
 * 3. For each clue cell, try to place a word starting from the adjacent cell
 *    in the arrow direction
 * 4. Use backtracking to fill the grid, respecting crossing constraints
 *
 * In a standard mots fléchés layout:
 * - Clue cells form an irregular pattern (not symmetric like mots croisés)
 * - The first row often has clue cells pointing down
 * - The first column often has clue cells pointing right
 * - Interior clue cells can point right, down, or both
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

interface SlotDef {
  clueRow: number;
  clueCol: number;
  direction: ArrowDirection;
  startRow: number;
  startCol: number;
  length: number;
}

/**
 * Generate a mots fléchés grid layout.
 * Places clue cells to create word slots of 3-7 letters.
 * Returns the positions of clue cells and the word slots they define.
 */
function generateLayout(width: number, height: number): SlotDef[] {
  const isClue = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false)
  );

  // First row and first column are all clue cells
  for (let c = 0; c < width; c++) isClue[0][c] = true;
  for (let r = 0; r < height; r++) isClue[r][0] = true;

  // Add interior clue cells with randomized placement.
  // Each generation produces a different layout.
  // Target slot length varies randomly between 3-7 for each row/column.
  for (let r = 1; r < height; r++) {
    let lastClueCol = 0;
    let nextGap = 3 + Math.floor(Math.random() * 4); // 3-6

    for (let c = 1; c < width; c++) {
      const gap = c - lastClueCol;
      if (gap >= nextGap + 1 && c < width - 2) {
        // Add some randomness to exact position
        const jitter = Math.random() < 0.4 ? 1 : 0;
        const placeCol = Math.min(c + jitter, width - 2);
        if (!isClue[r][placeCol]) {
          isClue[r][placeCol] = true;
          lastClueCol = placeCol;
          nextGap = 3 + Math.floor(Math.random() * 4);
        }
      }
    }
  }

  // Add clue cells in columns too (creates down slots)
  for (let c = 1; c < width; c++) {
    let lastClueRow = 0;
    let nextGap = 3 + Math.floor(Math.random() * 4);

    for (let r = 1; r < height; r++) {
      if (isClue[r][c]) { lastClueRow = r; continue; }
      const gap = r - lastClueRow;
      if (gap >= nextGap + 1 && r < height - 2) {
        const jitter = Math.random() < 0.4 ? 1 : 0;
        const placeRow = Math.min(r + jitter, height - 2);
        if (!isClue[placeRow][c]) {
          isClue[placeRow][c] = true;
          lastClueRow = placeRow;
          nextGap = 3 + Math.floor(Math.random() * 4);
        }
      }
    }
  }

  // Now extract all slots from the clue cell positions
  const slots: SlotDef[] = [];

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (!isClue[r][c]) continue;

      // Right slot
      if (c + 1 < width && !isClue[r][c + 1]) {
        const len = findRunLength(isClue, r, c + 1, "right", width, height);
        if (len >= 3 && len <= 8) {
          slots.push({
            clueRow: r, clueCol: c,
            direction: "right",
            startRow: r, startCol: c + 1,
            length: len,
          });
        }
      }

      // Down slot
      if (r + 1 < height && !isClue[r + 1][c]) {
        const len = findRunLength(isClue, r + 1, c, "down", width, height);
        if (len >= 3 && len <= 8) {
          slots.push({
            clueRow: r, clueCol: c,
            direction: "down",
            startRow: r + 1, startCol: c,
            length: len,
          });
        }
      }
    }
  }

  return slots;
}

/**
 * Find how many consecutive non-clue cells exist from a starting position.
 */
function findRunLength(
  isClue: boolean[][],
  startRow: number,
  startCol: number,
  direction: ArrowDirection,
  width: number,
  height: number
): number {
  let len = 0;
  let r = startRow;
  let c = startCol;

  while (r < height && c < width && !isClue[r][c]) {
    len++;
    if (direction === "right") c++;
    else r++;
  }

  return len;
}

/**
 * Get word candidates from the word list that fit constraints.
 */
function getCandidates(
  slot: SlotDef,
  grid: (string | null)[][],
  wordList: WordList,
  usedWords: Set<string>
): string[] {
  const constraints: { pos: number; letter: string }[] = [];

  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === "right" ? slot.startRow : slot.startRow + i;
    const c = slot.direction === "right" ? slot.startCol + i : slot.startCol;
    const letter = grid[r]?.[c];
    if (letter) {
      constraints.push({ pos: i, letter });
    }
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
 * Generate a mots fléchés grid.
 */
export function generateFleche(
  params: FlecheGenerationParams,
  wordList: WordList,
  clueDatabase: Map<string, string[]>
): FlecheGrid {
  const { width, height } = params;
  const customClues = params.customClues ?? [];

  // Generate layout (clue cell positions and word slots)
  const slots = generateLayout(width, height);

  // Initialize letter grid (null = empty)
  const grid: (string | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );

  // Track which cells are clue cells
  const clueCells = new Set<string>();
  for (const slot of slots) {
    clueCells.add(`${slot.clueRow},${slot.clueCol}`);
  }

  const usedWords = new Set<string>();
  const placedSlots: (string | null)[] = new Array(slots.length).fill(null);

  // Place custom words first
  const customMap = new Map<string, string>();
  const normalizedCustom = customClues.map((c) => ({
    answer: c.answer.toUpperCase().replace(/[^A-Z]/g, ""),
    clue: c.clue,
  })).filter((c) => c.answer.length >= 2);

  for (const cw of normalizedCustom.sort((a, b) => b.answer.length - a.answer.length)) {
    for (let si = 0; si < slots.length; si++) {
      if (placedSlots[si] !== null) continue;
      if (slots[si].length !== cw.answer.length) continue;

      let ok = true;
      for (let p = 0; p < cw.answer.length; p++) {
        const r = slots[si].direction === "right" ? slots[si].startRow : slots[si].startRow + p;
        const c = slots[si].direction === "right" ? slots[si].startCol + p : slots[si].startCol;
        if (grid[r][c] !== null && grid[r][c] !== cw.answer[p]) { ok = false; break; }
      }

      if (ok) {
        for (let p = 0; p < cw.answer.length; p++) {
          const r = slots[si].direction === "right" ? slots[si].startRow : slots[si].startRow + p;
          const c = slots[si].direction === "right" ? slots[si].startCol + p : slots[si].startCol;
          grid[r][c] = cw.answer[p];
        }
        placedSlots[si] = cw.answer;
        usedWords.add(cw.answer);
        customMap.set(cw.answer, cw.clue);
        break;
      }
    }
  }

  // Fill remaining slots with backtracking
  const unfilled = slots.map((_, i) => i).filter((i) => placedSlots[i] === null);
  let backtracks = 0;
  const MAX_BT = 200_000;

  function placeWord(si: number, word: string) {
    const slot = slots[si];
    for (let p = 0; p < word.length; p++) {
      const r = slot.direction === "right" ? slot.startRow : slot.startRow + p;
      const c = slot.direction === "right" ? slot.startCol + p : slot.startCol;
      grid[r][c] = word[p];
    }
  }

  function solve(idx: number): boolean {
    if (idx >= unfilled.length) return true;
    if (backtracks > MAX_BT) return false;

    // MRV: pick most constrained
    let bestIdx = idx;
    let bestCount = Infinity;
    for (let i = idx; i < unfilled.length; i++) {
      const count = getCandidates(slots[unfilled[i]], grid, wordList, usedWords).length;
      if (count < bestCount) { bestCount = count; bestIdx = i; }
      if (count === 0) break;
    }
    if (bestCount === 0) { backtracks++; return false; }

    [unfilled[idx], unfilled[bestIdx]] = [unfilled[bestIdx], unfilled[idx]];

    const si = unfilled[idx];
    const slot = slots[si];
    const cands = getCandidates(slot, grid, wordList, usedWords);

    // Randomize for variety
    const shuffled = cands
      .map((w) => ({ w, score: (wordList.getByLength(w.length).find((e) => e.word === w)?.score ?? 50) + Math.random() * 30 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 80)
      .map((x) => x.w);

    for (const word of shuffled) {
      const saved: { r: number; c: number; v: string | null }[] = [];
      for (let p = 0; p < slot.length; p++) {
        const r = slot.direction === "right" ? slot.startRow : slot.startRow + p;
        const c = slot.direction === "right" ? slot.startCol + p : slot.startCol;
        saved.push({ r, c, v: grid[r][c] });
        grid[r][c] = word[p];
      }
      placedSlots[si] = word;
      usedWords.add(word);

      // Forward check crossings
      let valid = true;
      for (let p = 0; p < slot.length; p++) {
        const r = slot.direction === "right" ? slot.startRow : slot.startRow + p;
        const c = slot.direction === "right" ? slot.startCol + p : slot.startCol;
        // Check all other unfilled slots that pass through this cell
        for (let j = idx + 1; j < unfilled.length; j++) {
          const otherSlot = slots[unfilled[j]];
          if (placedSlots[unfilled[j]] !== null) continue;
          // Does this slot pass through (r,c)?
          for (let op = 0; op < otherSlot.length; op++) {
            const or2 = otherSlot.direction === "right" ? otherSlot.startRow : otherSlot.startRow + op;
            const oc = otherSlot.direction === "right" ? otherSlot.startCol + op : otherSlot.startCol;
            if (or2 === r && oc === c) {
              if (getCandidates(otherSlot, grid, wordList, usedWords).length === 0) {
                valid = false;
              }
              break;
            }
          }
          if (!valid) break;
        }
        if (!valid) break;
      }

      if (valid && solve(idx + 1)) return true;

      backtracks++;
      usedWords.delete(word);
      placedSlots[si] = null;
      for (const s of saved) grid[s.r][s.c] = s.v;
    }

    [unfilled[idx], unfilled[bestIdx]] = [unfilled[bestIdx], unfilled[idx]];
    return false;
  }

  const success = solve(0);

  // Build the FlecheGrid
  const cells: FlecheCell[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      if (clueCells.has(`${r},${c}`)) {
        return { type: "clue" as const, clues: [] as ClueInCell[] };
      }
      const letter = grid[r][c];
      if (letter) {
        return { type: "letter" as const, letter };
      }
      return { type: "empty" as const };
    })
  );

  // Assign clues to clue cells
  const flecheWords: FlecheWord[] = [];

  for (let si = 0; si < slots.length; si++) {
    const word = placedSlots[si];
    if (!word) continue;

    const slot = slots[si];
    const cell = cells[slot.clueRow][slot.clueCol];

    // Pick a clue: custom first, then from database, then fallback
    let clueText: string;
    const isCustom = customMap.has(word);

    if (isCustom) {
      clueText = customMap.get(word)!;
    } else {
      const dbClues = clueDatabase.get(word);
      if (dbClues && dbClues.length > 0) {
        // Pick a random clue for variety
        clueText = dbClues[Math.floor(Math.random() * dbClues.length)];
      } else {
        clueText = word; // Fallback: just show the word
      }
    }

    if (cell.type === "clue" && cell.clues) {
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
      isCustom,
    });
  }

  return {
    width,
    height,
    cells,
    words: flecheWords,
  };
}
