import clg from "crossword-layout-generator";
import type { WordList } from "@/lib/crossword/word-list";
import type { CustomClue } from "@/types";
import { getPatterns } from "@/lib/crossword/patterns";

export interface GeneratorResult {
  success: boolean;
  grid: string[];
  width: number;
  height: number;
  words: {
    answer: string;
    clue: string;
    direction: "across" | "down";
    number: number;
    startRow: number;
    startCol: number;
    length: number;
    isCustom: boolean;
  }[];
  error?: string;
}

// -------------------------------------------------------------------
// Dense grid generator (traditional crossword with black/white pattern)
// -------------------------------------------------------------------

interface Slot {
  row: number;
  col: number;
  direction: "across" | "down";
  length: number;
  crossings: { slotIdx: number; thisPos: number; otherPos: number }[];
}

function extractSlots(pattern: string[]): Slot[] {
  const h = pattern.length;
  const w = pattern[0].length;
  const slots: Slot[] = [];

  for (let r = 0; r < h; r++) {
    let c = 0;
    while (c < w) {
      if (pattern[r][c] === "#") { c++; continue; }
      let end = c;
      while (end < w && pattern[r][end] !== "#") end++;
      if (end - c >= 3) slots.push({ row: r, col: c, direction: "across", length: end - c, crossings: [] });
      c = end;
    }
  }
  for (let c = 0; c < w; c++) {
    let r = 0;
    while (r < h) {
      if (pattern[r][c] === "#") { r++; continue; }
      let end = r;
      while (end < h && pattern[end][c] !== "#") end++;
      if (end - r >= 3) slots.push({ row: r, col: c, direction: "down", length: end - r, crossings: [] });
      r = end;
    }
  }

  // Build crossings
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (a.direction === b.direction) continue;
      const across = a.direction === "across" ? a : b;
      const down = a.direction === "across" ? b : a;
      if (
        down.col >= across.col &&
        down.col < across.col + across.length &&
        across.row >= down.row &&
        across.row < down.row + down.length
      ) {
        const ap = down.col - across.col;
        const dp = across.row - down.row;
        const ai = a.direction === "across" ? i : j;
        const bi = a.direction === "across" ? j : i;
        slots[ai].crossings.push({ slotIdx: bi, thisPos: ap, otherPos: dp });
        slots[bi].crossings.push({ slotIdx: ai, thisPos: dp, otherPos: ap });
      }
    }
  }

  return slots;
}

function assignNumbers(slots: Slot[]): number[] {
  const nums: number[] = new Array(slots.length).fill(0);
  const cellMap = new Map<string, number>();
  let num = 1;

  const sorted = slots
    .map((s, i) => ({ i, row: s.row, col: s.col }))
    .sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);

  for (const { i, row, col } of sorted) {
    const key = `${row},${col}`;
    if (!cellMap.has(key)) {
      cellMap.set(key, num++);
    }
    nums[i] = cellMap.get(key)!;
  }
  return nums;
}

function generateDense(
  pattern: string[],
  wordList: WordList,
  customClues: CustomClue[]
): GeneratorResult {
  const height = pattern.length;
  const width = pattern[0].length;
  const slots = extractSlots(pattern);
  const numbers = assignNumbers(slots);

  // Grid: null means unfilled white cell
  const grid: (string | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );

  const placed: (string | null)[] = new Array(slots.length).fill(null);
  const usedWords = new Set<string>();

  // Place custom words first
  const customs = customClues
    .map((c) => ({ answer: c.answer.toUpperCase().replace(/[^A-Z]/g, ""), clue: c.clue }))
    .filter((c) => c.answer.length >= 3);

  const customSlotIdx = new Set<number>();
  const customMap = new Map<number, string>(); // slotIdx -> clue

  for (const cw of customs.sort((a, b) => b.answer.length - a.answer.length)) {
    for (let si = 0; si < slots.length; si++) {
      if (customSlotIdx.has(si)) continue;
      if (slots[si].length !== cw.answer.length) continue;
      // Check compatibility
      let ok = true;
      for (let p = 0; p < cw.answer.length; p++) {
        const r = slots[si].direction === "across" ? slots[si].row : slots[si].row + p;
        const c = slots[si].direction === "across" ? slots[si].col + p : slots[si].col;
        if (grid[r][c] !== null && grid[r][c] !== cw.answer[p]) { ok = false; break; }
      }
      if (ok) {
        for (let p = 0; p < cw.answer.length; p++) {
          const r = slots[si].direction === "across" ? slots[si].row : slots[si].row + p;
          const c = slots[si].direction === "across" ? slots[si].col + p : slots[si].col;
          grid[r][c] = cw.answer[p];
        }
        placed[si] = cw.answer;
        usedWords.add(cw.answer);
        customSlotIdx.add(si);
        customMap.set(si, cw.clue);
        break;
      }
    }
  }

  // Helper to get cell
  function getCell(slot: Slot, pos: number): { r: number; c: number } {
    return slot.direction === "across"
      ? { r: slot.row, c: slot.col + pos }
      : { r: slot.row + pos, c: slot.col };
  }

  // Get candidates for a slot given current grid
  function candidates(si: number): string[] {
    const slot = slots[si];

    // Collect all constraints from the grid
    const constraints: { pos: number; letter: string }[] = [];
    for (let p = 0; p < slot.length; p++) {
      const { r, c } = getCell(slot, p);
      const letter = grid[r][c];
      if (letter !== null) {
        constraints.push({ pos: p, letter });
      }
    }

    let words: string[];
    if (constraints.length === 0) {
      words = wordList.getByLength(slot.length).map((e) => e.word);
    } else {
      // Use index for the first constraint, filter the rest
      words = wordList.getByConstraint(slot.length, constraints[0].pos, constraints[0].letter);
      for (let i = 1; i < constraints.length; i++) {
        const { pos, letter } = constraints[i];
        words = words.filter((w) => w[pos] === letter);
      }
    }

    return words.filter((w) => !usedWords.has(w));
  }

  // Fill remaining with backtracking
  const unfilled = slots.map((_, i) => i).filter((i) => !customSlotIdx.has(i));
  let backtracks = 0;
  const MAX_BT = 500_000;

  function solve(idx: number): boolean {
    if (idx >= unfilled.length) return true;
    if (backtracks > MAX_BT) return false;

    // MRV: pick the most constrained unfilled slot
    let bestIdx = idx;
    let bestCount = Infinity;
    for (let i = idx; i < unfilled.length; i++) {
      const count = candidates(unfilled[i]).length;
      if (count < bestCount) { bestCount = count; bestIdx = i; }
      if (count === 0) break;
    }
    if (bestCount === 0) { backtracks++; return false; }

    // Swap into position
    [unfilled[idx], unfilled[bestIdx]] = [unfilled[bestIdx], unfilled[idx]];

    const si = unfilled[idx];
    const slot = slots[si];
    const cands = candidates(si);

    // Randomize heavily for variety (different puzzle each time)
    const shuffled = cands
      .map((w) => ({ w, score: (wordList.getByLength(w.length).find((e) => e.word === w)?.score ?? 50) + Math.random() * 30 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      .map((x) => x.w);

    for (const word of shuffled) {
      // Save state
      const saved: { r: number; c: number; v: string | null }[] = [];
      for (let p = 0; p < slot.length; p++) {
        const { r, c } = getCell(slot, p);
        saved.push({ r, c, v: grid[r][c] });
        grid[r][c] = word[p];
      }
      placed[si] = word;
      usedWords.add(word);

      // Forward check: do all crossing slots still have candidates?
      let valid = true;
      for (const cr of slot.crossings) {
        if (placed[cr.slotIdx] !== null) continue; // already filled
        if (candidates(cr.slotIdx).length === 0) { valid = false; break; }
      }

      if (valid && solve(idx + 1)) return true;

      // Undo
      backtracks++;
      usedWords.delete(word);
      placed[si] = null;
      for (const s of saved) grid[s.r][s.c] = s.v;
    }

    // Swap back
    [unfilled[idx], unfilled[bestIdx]] = [unfilled[bestIdx], unfilled[idx]];
    return false;
  }

  const success = solve(0);

  if (!success) {
    return { success: false, grid: [], width, height, words: [], error: "Could not fill grid" };
  }

  // Build result
  const gridRows: string[] = [];
  for (let r = 0; r < height; r++) {
    let row = "";
    for (let c = 0; c < width; c++) {
      row += pattern[r][c] === "#" ? "#" : (grid[r][c] ?? ".");
    }
    gridRows.push(row);
  }

  const words = slots.map((slot, si) => ({
    answer: placed[si]!,
    clue: customMap.get(si) ?? `Clue for ${placed[si]}`,
    direction: slot.direction,
    number: numbers[si],
    startRow: slot.row,
    startCol: slot.col,
    length: slot.length,
    isCustom: customSlotIdx.has(si),
  }));

  return { success: true, grid: gridRows, width, height, words };
}

// -------------------------------------------------------------------
// Freeform generator (words crossing on blank canvas)
// -------------------------------------------------------------------

interface LayoutWord {
  answer: string;
  clue: string;
  orientation: "across" | "down" | "none";
  startx: number;
  starty: number;
  position: number;
}

interface LayoutResult {
  table: (string | null)[][];
  rows: number;
  cols: number;
  result: LayoutWord[];
}

function generateFreeform(
  targetWordCount: number,
  wordList: WordList,
  customClues: CustomClue[]
): GeneratorResult {
  const customWords = customClues
    .map((c) => ({ answer: c.answer.toUpperCase().replace(/[^A-Z]/g, ""), clue: c.clue }))
    .filter((c) => c.answer.length >= 3);

  const usedAnswers = new Set(customWords.map((w) => w.answer));
  const fillerCount = Math.max(0, targetWordCount - customWords.length);

  const allWords = [
    ...wordList.getByLength(5),
    ...wordList.getByLength(4),
    ...wordList.getByLength(6),
    ...wordList.getByLength(3),
    ...wordList.getByLength(7),
  ];

  const shuffled = allWords
    .filter((w) => !usedAnswers.has(w.word))
    .sort((a, b) => b.score - a.score + (Math.random() - 0.5) * 30);

  const fillerWords = shuffled.slice(0, fillerCount).map((w) => ({
    answer: w.word,
    clue: `Clue for ${w.word}`,
  }));

  const inputWords = [...customWords, ...fillerWords];
  if (inputWords.length < 3) {
    return { success: false, grid: [], width: 0, height: 0, words: [], error: "Need at least 3 words" };
  }

  const layout = clg.generateLayout(inputWords) as LayoutResult;
  if (!layout.table || layout.rows === 0) {
    return { success: false, grid: [], width: 0, height: 0, words: [], error: "Layout generation failed" };
  }

  const grid: string[] = [];
  for (let r = 0; r < layout.rows; r++) {
    let row = "";
    for (let c = 0; c < layout.cols; c++) {
      const cell = layout.table[r]?.[c];
      row += (!cell || cell === " " || cell === "\0") ? "#" : cell;
    }
    grid.push(row);
  }

  const customAnswerSet = new Set(customWords.map((w) => w.answer));
  const words = layout.result
    .filter((w) => w.orientation === "across" || w.orientation === "down")
    .map((w) => ({
      answer: w.answer,
      clue: w.clue,
      direction: w.orientation as "across" | "down",
      number: w.position,
      startRow: (w.starty ?? 1) - 1,
      startCol: (w.startx ?? 1) - 1,
      length: w.answer.length,
      isCustom: customAnswerSet.has(w.answer),
    }));

  return { success: true, grid, width: layout.cols, height: layout.rows, words };
}

// -------------------------------------------------------------------
// Public API
// -------------------------------------------------------------------

const WORD_COUNTS: Record<number, number> = { 5: 8, 11: 25, 13: 35, 15: 50 };

export function generateWithFallback(
  size: number,
  wordList: WordList,
  customClues: CustomClue[] = []
): GeneratorResult {
  // Shuffle patterns so we don't always get the same layout
  const patterns = [...getPatterns(size)].sort(() => Math.random() - 0.5);

  // Try dense grid first
  for (const pattern of patterns) {
    const result = generateDense(pattern, wordList, customClues);
    if (result.success) return result;
  }

  // Fall back to freeform
  const targetWords = WORD_COUNTS[size] ?? 30;
  return generateFreeform(targetWords, wordList, customClues);
}
