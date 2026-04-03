/**
 * Mots fléchés generator v4.
 *
 * This is a dense crossword generator where black cells become clue cells.
 * Same constraint satisfaction + backtracking as the English generator,
 * but outputs a mots fléchés grid.
 *
 * 1. Generate a pattern with potence (top/left alternating clue cells)
 *    and scattered interior clue cells
 * 2. Extract all word slots (horizontal and vertical runs of letter cells)
 * 3. Fill ALL slots using backtracking with MRV heuristic
 * 4. Every letter cell is part of both a horizontal and vertical word
 * 5. Convert to FlecheGrid: black cells become clue cells with definitions
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

interface Slot {
  row: number;
  col: number;
  direction: ArrowDirection;
  length: number;
  crossings: { slotIdx: number; thisPos: number; otherPos: number }[];
}

/**
 * Generate a mots fléchés pattern.
 * '#' = clue cell, '.' = letter cell.
 *
 * Features:
 * - Potence: top row and left column alternate clue/letter
 * - Interior clue cells scattered to create 3-6 letter slots
 * - ~25-30% clue cells for dense fill
 * - Randomized for variety
 */
function generatePattern(width: number, height: number): string[] {
  const grid: string[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ".")
  );

  // Potence: entire first row and first column are clue cells.
  // Every row gets a clue cell at the start (→), every column gets one at top (↓).
  // This is the standard mots fléchés layout.
  for (let c = 0; c < width; c++) grid[0][c] = "#";
  for (let r = 0; r < height; r++) grid[r][0] = "#";

  // Interior clue cells: fewer needed since potence covers edges.
  // Place them on a staggered grid to break long runs into 3-6 letter slots.
  const SPACING = 6;
  for (let r = 2; r < height; r++) {
    const rowOffset = (r % 2 === 0) ? 0 : Math.floor(SPACING / 2);
    for (let c = 2; c < width; c++) {
      const pos = c + rowOffset;
      if (pos % SPACING === 0 && c < width - 2 && r < height - 2) {
        const jitter = Math.random() < 0.3 ? 1 : 0;
        const cc = Math.min(c + jitter, width - 2);
        if (grid[r][cc] !== "#") {
          grid[r][cc] = "#";
        }
      }
    }
  }

  // Cleanup: remove orphan clue cells that don't define any word.
  // A clue cell is useful only if it has a run of 3+ letter cells
  // going right or going down from it.
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (grid[r][c] !== "#") continue;

      let hasRight = false;
      let hasDown = false;

      // Check right run
      if (c + 1 < width && grid[r][c + 1] === ".") {
        let len = 0;
        let cc = c + 1;
        while (cc < width && grid[r][cc] === ".") { len++; cc++; }
        if (len >= 3) hasRight = true;
      }

      // Check down run
      if (r + 1 < height && grid[r + 1][c] === ".") {
        let len = 0;
        let rr = r + 1;
        while (rr < height && grid[rr][c] === ".") { len++; rr++; }
        if (len >= 3) hasDown = true;
      }

      // If this clue cell defines no word, convert to letter cell
      if (!hasRight && !hasDown) {
        grid[r][c] = ".";
      }
    }
  }

  return grid.map((row) => row.join(""));
}

/**
 * Extract all word slots from a pattern.
 */
function extractSlots(pattern: string[]): Slot[] {
  const h = pattern.length;
  const w = pattern[0].length;
  const slots: Slot[] = [];

  // Horizontal slots
  for (let r = 0; r < h; r++) {
    let c = 0;
    while (c < w) {
      if (pattern[r][c] === "#") { c++; continue; }
      let end = c;
      while (end < w && pattern[r][end] === ".") end++;
      if (end - c >= 3) {
        slots.push({ row: r, col: c, direction: "right", length: end - c, crossings: [] });
      }
      c = end;
    }
  }

  // Vertical slots
  for (let c = 0; c < w; c++) {
    let r = 0;
    while (r < h) {
      if (pattern[r][c] === "#") { r++; continue; }
      let end = r;
      while (end < h && pattern[end][c] === ".") end++;
      if (end - r >= 3) {
        slots.push({ row: r, col: c, direction: "down", length: end - r, crossings: [] });
      }
      r = end;
    }
  }

  // Build crossing graph
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (a.direction === b.direction) continue;

      const horiz = a.direction === "right" ? a : b;
      const vert = a.direction === "right" ? b : a;

      if (
        vert.col >= horiz.col &&
        vert.col < horiz.col + horiz.length &&
        horiz.row >= vert.row &&
        horiz.row < vert.row + vert.length
      ) {
        const hp = vert.col - horiz.col;
        const vp = horiz.row - vert.row;
        const hi = a.direction === "right" ? i : j;
        const vi = a.direction === "right" ? j : i;
        slots[hi].crossings.push({ slotIdx: vi, thisPos: hp, otherPos: vp });
        slots[vi].crossings.push({ slotIdx: hi, thisPos: vp, otherPos: hp });
      }
    }
  }

  return slots;
}

/**
 * Fill all slots using constraint satisfaction + backtracking.
 */
function fillAllSlots(
  slots: Slot[],
  pattern: string[],
  wordList: WordList
): Map<number, string> | null {
  const h = pattern.length;
  const w = pattern[0].length;
  const grid: (string | null)[][] = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => null)
  );
  const placed = new Map<number, string>();
  const usedWords = new Set<string>();
  const order = slots.map((_, i) => i);
  let backtracks = 0;
  const MAX_BT = 500_000;

  function getCandidates(si: number): string[] {
    const slot = slots[si];
    const constraints: { pos: number; letter: string }[] = [];

    for (let i = 0; i < slot.length; i++) {
      const r = slot.direction === "right" ? slot.row : slot.row + i;
      const c = slot.direction === "right" ? slot.col + i : slot.col;
      const letter = grid[r][c];
      if (letter) constraints.push({ pos: i, letter });
    }

    let words: string[];
    if (constraints.length === 0) {
      words = wordList.getByLength(slot.length).map((e) => e.word);
    } else {
      words = wordList.getByConstraint(slot.length, constraints[0].pos, constraints[0].letter);
      for (let i = 1; i < constraints.length; i++) {
        words = words.filter((w2) => w2[constraints[i].pos] === constraints[i].letter);
      }
    }

    return words.filter((w2) => !usedWords.has(w2));
  }

  function solve(idx: number): boolean {
    if (idx >= order.length) return true;
    if (backtracks > MAX_BT) return false;

    // MRV: pick most constrained slot
    let bestIdx = idx;
    let bestCount = Infinity;
    for (let i = idx; i < order.length; i++) {
      const count = getCandidates(order[i]).length;
      if (count < bestCount) { bestCount = count; bestIdx = i; }
      if (count === 0) break;
    }
    if (bestCount === 0) { backtracks++; return false; }

    [order[idx], order[bestIdx]] = [order[bestIdx], order[idx]];

    const si = order[idx];
    const slot = slots[si];
    const cands = getCandidates(si);

    // Shuffle with quality bias for variety
    const shuffled = cands
      .map((w2) => ({
        w: w2,
        s: (wordList.getByLength(w2.length).find((e) => e.word === w2)?.score ?? 50) + Math.random() * 30,
      }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 100)
      .map((x) => x.w);

    for (const word of shuffled) {
      // Save grid state
      const saved: { r: number; c: number; v: string | null }[] = [];
      for (let i = 0; i < slot.length; i++) {
        const r = slot.direction === "right" ? slot.row : slot.row + i;
        const c = slot.direction === "right" ? slot.col + i : slot.col;
        saved.push({ r, c, v: grid[r][c] });
        grid[r][c] = word[i];
      }
      usedWords.add(word);
      placed.set(si, word);

      // Forward check: crossing slots must still have candidates
      let valid = true;
      for (const cr of slot.crossings) {
        if (placed.has(cr.slotIdx)) continue;
        if (getCandidates(cr.slotIdx).length === 0) { valid = false; break; }
      }

      if (valid && solve(idx + 1)) return true;

      // Undo
      backtracks++;
      usedWords.delete(word);
      placed.delete(si);
      for (const s of saved) grid[s.r][s.c] = s.v;
    }

    [order[idx], order[bestIdx]] = [order[bestIdx], order[idx]];
    return false;
  }

  return solve(0) ? placed : null;
}

function pickClue(word: string, clueDb: Map<string, string[]>): string {
  const dbClues = clueDb.get(word);
  if (dbClues && dbClues.length > 0) {
    const short = dbClues.filter((c) => c.length <= 35);
    const pool = short.length > 0 ? short : dbClues;
    let clue = pool[Math.floor(Math.random() * pool.length)];
    if (clue.length > 40) clue = clue.slice(0, 37) + "...";
    return clue;
  }
  // No scraped clue: show the word in uppercase as a clear placeholder
  return word;
}

/**
 * Find the clue cell for a slot (the '#' cell immediately before the word).
 */
function findClueCell(
  slot: Slot,
  pattern: string[]
): { row: number; col: number } | null {
  if (slot.direction === "right") {
    const c = slot.col - 1;
    if (c >= 0 && pattern[slot.row][c] === "#") {
      return { row: slot.row, col: c };
    }
  } else {
    const r = slot.row - 1;
    if (r >= 0 && pattern[r][slot.col] === "#") {
      return { row: r, col: slot.col };
    }
  }
  return null;
}

/**
 * Main entry point.
 */
export function generateFleche(
  params: FlecheGenerationParams,
  wordList: WordList,
  clueDatabase: Map<string, string[]>
): FlecheGrid {
  const { width, height } = params;

  // Try multiple random patterns until one fills successfully
  let placed: Map<number, string> | null = null;
  let pattern: string[] = [];
  let slots: Slot[] = [];

  for (let attempt = 0; attempt < 10; attempt++) {
    pattern = generatePattern(width, height);
    slots = extractSlots(pattern);
    if (slots.length < 5) continue;

    placed = fillAllSlots(slots, pattern, wordList);
    if (placed && placed.size === slots.length) break;
    placed = null;
  }

  if (!placed) {
    return {
      width, height,
      cells: Array.from({ length: height }, () =>
        Array.from({ length: width }, () => ({ type: "empty" as const }))
      ),
      words: [],
    };
  }

  // Build cell grid
  const cells: FlecheCell[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      if (pattern[r][c] === "#") {
        return { type: "clue" as const, clues: [] as ClueInCell[] };
      }
      // Find the letter at this position from placed words
      let letter = "?";
      for (const [si, word] of placed!) {
        const slot = slots[si];
        for (let i = 0; i < slot.length; i++) {
          const wr = slot.direction === "right" ? slot.row : slot.row + i;
          const wc = slot.direction === "right" ? slot.col + i : slot.col;
          if (wr === r && wc === c) { letter = word[i]; break; }
        }
        if (letter !== "?") break;
      }
      return { type: "letter" as const, letter };
    })
  );

  // Assign clues to clue cells
  const flecheWords: FlecheWord[] = [];

  for (const [si, word] of placed) {
    const slot = slots[si];
    const clueText = pickClue(word, clueDatabase);
    const clueCell = findClueCell(slot, pattern);

    if (clueCell) {
      const cell = cells[clueCell.row][clueCell.col];
      if (cell.type === "clue" && cell.clues) {
        cell.clues.push({
          text: clueText,
          direction: slot.direction,
          answerLength: word.length,
          answer: word,
        });
      }
    }

    flecheWords.push({
      answer: word,
      clue: clueText,
      direction: slot.direction,
      clueRow: clueCell?.row ?? 0,
      clueCol: clueCell?.col ?? 0,
      startRow: slot.row,
      startCol: slot.col,
      length: word.length,
      isCustom: false,
    });
  }

  return { width, height, cells, words: flecheWords };
}
