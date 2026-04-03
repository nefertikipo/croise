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

  // Potence: alternating clue/letter in top row and left column.
  // Clue cells on even positions, letter cells on odd.
  grid[0][0] = "#";
  for (let c = 1; c < width; c++) {
    grid[0][c] = c % 2 === 0 ? "#" : ".";
  }
  for (let r = 1; r < height; r++) {
    grid[r][0] = r % 2 === 0 ? "#" : ".";
  }

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

      // Check right run (same row)
      if (c + 1 < width && grid[r][c + 1] === ".") {
        let len = 0;
        let cc = c + 1;
        while (cc < width && grid[r][cc] === ".") { len++; cc++; }
        if (len >= 3) hasRight = true;
      }

      // Check right run on NEXT row (potence: left column clue defines next row's word)
      if (c === 0 && r + 1 < height) {
        let len = 0;
        let cc = 1;
        while (cc < width && grid[r + 1][cc] === ".") { len++; cc++; }
        if (len >= 3) hasRight = true;
      }

      // Check down run (same column)
      if (r + 1 < height && grid[r + 1][c] === ".") {
        let len = 0;
        let rr = r + 1;
        while (rr < height && grid[rr][c] === ".") { len++; rr++; }
        if (len >= 3) hasDown = true;
      }

      // Check down run in NEXT column (potence: top row clue defines next col's word)
      if (r === 0 && c + 1 < width) {
        let len = 0;
        let rr = 0;
        while (rr < height && grid[rr][c + 1] === ".") { len++; rr++; }
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

  // Horizontal slots: where a '#' cell is immediately to the left
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (pattern[r][c] !== "#") continue;
      const start = c + 1;
      let end = start;
      while (end < w && pattern[r][end] === ".") end++;
      if (end - start >= 3) {
        slots.push({ row: r, col: start, direction: "right", length: end - start, crossings: [] });
      }
    }
  }

  // Left column potence: '#' cells also define right words on the NEXT row
  for (let r = 0; r < h; r++) {
    if (pattern[r][0] !== "#") continue;
    if (r + 1 >= h) continue;
    // Right word on row r+1, starting at col 1
    let end = 1;
    while (end < w && pattern[r + 1][end] === ".") end++;
    if (end - 1 >= 3) {
      slots.push({ row: r + 1, col: 1, direction: "right", length: end - 1, crossings: [] });
    }
  }

  // Vertical slots: where a '#' cell is immediately above
  for (let c = 0; c < w; c++) {
    for (let r = 0; r < h; r++) {
      if (pattern[r][c] !== "#") continue;
      const start = r + 1;
      let end = start;
      while (end < h && pattern[end][c] === ".") end++;
      if (end - start >= 3) {
        slots.push({ row: start, col: c, direction: "down", length: end - start, crossings: [] });
      }
    }
  }

  // Top row potence: '#' cells also define down words in the NEXT column
  for (let c = 0; c < w; c++) {
    if (pattern[0][c] !== "#") continue;
    if (c + 1 >= w) continue;
    // Down word in col c+1, starting at row 1 (or row 0 if letter)
    const startR = pattern[0][c + 1] === "." ? 0 : 1;
    let end = startR;
    while (end < h && pattern[end][c + 1] === ".") end++;
    if (end - startR >= 3) {
      slots.push({ row: startR, col: c + 1, direction: "down", length: end - startR, crossings: [] });
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
 * Find the best clue cell for a word.
 *
 * Search order:
 * 1. '#' cell immediately before the word (standard: left for →, above for ↓)
 * 2. '#' cell that's one row up and same column (for dual → cells in left potence)
 * 3. '#' cell that's same row and one column left (for dual ↓ cells in top potence)
 * 4. Any nearby '#' cell with room (< 2 clues)
 */
function findClueCell(
  slot: Slot,
  pattern: string[],
  cells: FlecheCell[][],
  height: number,
  width: number
): { row: number; col: number } | null {
  const candidates: { row: number; col: number; priority: number }[] = [];

  if (slot.direction === "right") {
    // Primary: '#' immediately to the left
    const c = slot.col - 1;
    if (c >= 0 && pattern[slot.row][c] === "#") {
      candidates.push({ row: slot.row, col: c, priority: 0 });
    }
    // Secondary: '#' one row up, same start column -1 (dual → in potence)
    if (c >= 0 && slot.row > 0 && pattern[slot.row - 1][c] === "#") {
      candidates.push({ row: slot.row - 1, col: c, priority: 1 });
    }
    // Tertiary: '#' two cols to the left on same row
    if (slot.col - 2 >= 0 && pattern[slot.row][slot.col - 2] === "#") {
      candidates.push({ row: slot.row, col: slot.col - 2, priority: 2 });
    }
  } else {
    // Primary: '#' immediately above
    const r = slot.row - 1;
    if (r >= 0 && pattern[r][slot.col] === "#") {
      candidates.push({ row: r, col: slot.col, priority: 0 });
    }
    // Secondary: '#' same row, one col to the left (dual ↓ in top row)
    if (r >= 0 && slot.col > 0 && pattern[r][slot.col - 1] === "#") {
      candidates.push({ row: r, col: slot.col - 1, priority: 1 });
    }
    // Tertiary: '#' two rows up on same col
    if (slot.row - 2 >= 0 && pattern[slot.row - 2][slot.col] === "#") {
      candidates.push({ row: slot.row - 2, col: slot.col, priority: 2 });
    }
  }

  // Pick the best candidate that has room (< 2 clues)
  candidates.sort((a, b) => a.priority - b.priority);
  for (const c of candidates) {
    const cell = cells[c.row]?.[c.col];
    if (cell?.type === "clue" && (cell.clues?.length ?? 0) < 2) {
      return { row: c.row, col: c.col };
    }
  }

  // If all primary candidates are full, find any nearby '#' with room
  for (let dr = -2; dr <= 0; dr++) {
    for (let dc = -2; dc <= 0; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = slot.row + dr;
      const c = slot.col + dc;
      if (r >= 0 && c >= 0 && r < height && c < width && pattern[r][c] === "#") {
        const cell = cells[r][c];
        if (cell?.type === "clue" && (cell.clues?.length ?? 0) < 2) {
          return { row: r, col: c };
        }
      }
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

  // Build letter map for fast lookup
  const letterMap = new Map<string, string>();
  for (const [si, word] of placed) {
    const slot = slots[si];
    for (let i = 0; i < slot.length; i++) {
      const r = slot.direction === "right" ? slot.row : slot.row + i;
      const c = slot.direction === "right" ? slot.col + i : slot.col;
      letterMap.set(`${r},${c}`, word[i]);
    }
  }

  // Build cell grid
  const cells: FlecheCell[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      if (pattern[r][c] === "#") {
        return { type: "clue" as const, clues: [] as ClueInCell[] };
      }
      const letter = letterMap.get(`${r},${c}`) ?? "?";
      return { type: "letter" as const, letter };
    })
  );

  // Convert unfilled letter cells to clue cells
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c].type === "letter" && cells[r][c].letter === "?") {
        cells[r][c] = { type: "clue", clues: [] };
      }
    }
  }

  // Assign clues to clue cells (smart packing)
  const flecheWords: FlecheWord[] = [];

  // Sort: words with a direct clue cell first, orphans last
  const sortedEntries = [...placed.entries()].sort((a, b) => {
    const slotA = slots[a[0]];
    const slotB = slots[b[0]];
    const hasDirectA = slotA.direction === "right"
      ? (slotA.col > 0 && pattern[slotA.row][slotA.col - 1] === "#")
      : (slotA.row > 0 && pattern[slotA.row - 1][slotA.col] === "#");
    const hasDirectB = slotB.direction === "right"
      ? (slotB.col > 0 && pattern[slotB.row][slotB.col - 1] === "#")
      : (slotB.row > 0 && pattern[slotB.row - 1][slotB.col] === "#");
    return (hasDirectA ? 0 : 1) - (hasDirectB ? 0 : 1);
  });

  for (const [si, word] of sortedEntries) {
    const slot = slots[si];
    const clueText = pickClue(word, clueDatabase);
    const clueCell = findClueCell(slot, pattern, cells, height, width);

    if (clueCell) {
      const cell = cells[clueCell.row][clueCell.col];
      if (cell.type === "clue" && cell.clues) {
        cell.clues.push({
          text: clueText,
          direction: slot.direction,
          answerRow: slot.row,
          answerCol: slot.col,
          answerLength: word.length,
          answer: word,
        });
      }
    }

    flecheWords.push({
      answer: word,
      clue: clueText,
      direction: slot.direction,
      clueRow: clueCell?.row ?? -1,
      clueCol: clueCell?.col ?? -1,
      startRow: slot.row,
      startCol: slot.col,
      length: word.length,
      isCustom: false,
    });
  }

  return { width, height, cells, words: flecheWords };
}
