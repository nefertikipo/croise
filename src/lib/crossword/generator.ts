import type { Slot, Crossing, PlacedEntry, GeneratorResult } from "@/lib/crossword/types";
import type { WordList } from "@/lib/crossword/word-list";
import type { CustomClue } from "@/types";
import { getPatterns } from "@/lib/crossword/patterns";

const MAX_BACKTRACKS = 50_000;

/**
 * Extract slots (word positions) from a grid pattern.
 */
function extractSlots(pattern: string[]): Slot[] {
  const height = pattern.length;
  const width = pattern[0].length;
  const slots: Slot[] = [];
  let id = 0;

  // Across slots
  for (let r = 0; r < height; r++) {
    let col = 0;
    while (col < width) {
      if (pattern[r][col] === "#") {
        col++;
        continue;
      }
      let end = col;
      while (end < width && pattern[r][end] !== "#") end++;
      const len = end - col;
      if (len >= 3) {
        slots.push({ id: id++, row: r, col, direction: "across", length: len, crossings: [] });
      }
      col = end;
    }
  }

  // Down slots
  for (let c = 0; c < width; c++) {
    let row = 0;
    while (row < height) {
      if (pattern[row][c] === "#") {
        row++;
        continue;
      }
      let end = row;
      while (end < height && pattern[end][c] !== "#") end++;
      const len = end - row;
      if (len >= 3) {
        slots.push({ id: id++, row, col: c, direction: "down", length: len, crossings: [] });
      }
      row = end;
    }
  }

  // Build crossing relationships
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (a.direction === b.direction) continue;

      const across = a.direction === "across" ? a : b;
      const down = a.direction === "across" ? b : a;

      // Check if they cross
      if (
        down.col >= across.col &&
        down.col < across.col + across.length &&
        across.row >= down.row &&
        across.row < down.row + down.length
      ) {
        const acrossPos = down.col - across.col;
        const downPos = across.row - down.row;

        if (a.direction === "across") {
          a.crossings.push({ slotId: b.id, thisPos: acrossPos, otherPos: downPos });
          b.crossings.push({ slotId: a.id, thisPos: downPos, otherPos: acrossPos });
        } else {
          a.crossings.push({ slotId: b.id, thisPos: downPos, otherPos: acrossPos });
          b.crossings.push({ slotId: a.id, thisPos: acrossPos, otherPos: downPos });
        }
      }
    }
  }

  return slots;
}

/**
 * Assign clue numbers to slots (standard crossword numbering).
 */
function assignNumbers(slots: Slot[], width: number, height: number): Map<number, number> {
  const numberMap = new Map<number, number>();
  const cellStarts = new Map<string, number>();
  let num = 1;

  // Collect all slot start positions and sort by position (top-left to bottom-right)
  const starts: { row: number; col: number; slotId: number }[] = [];
  for (const slot of slots) {
    starts.push({ row: slot.row, col: slot.col, slotId: slot.id });
  }

  // Group by cell position
  const cellToSlots = new Map<string, number[]>();
  for (const s of starts) {
    const key = `${s.row},${s.col}`;
    if (!cellToSlots.has(key)) cellToSlots.set(key, []);
    cellToSlots.get(key)!.push(s.slotId);
  }

  // Sort cells top-to-bottom, left-to-right
  const sortedCells = [...cellToSlots.entries()].sort((a, b) => {
    const [ar, ac] = a[0].split(",").map(Number);
    const [br, bc] = b[0].split(",").map(Number);
    return ar !== br ? ar - br : ac - bc;
  });

  for (const [, slotIds] of sortedCells) {
    for (const sid of slotIds) {
      numberMap.set(sid, num);
    }
    num++;
  }

  return numberMap;
}

/**
 * Filter candidates for a slot given current grid state.
 */
function getCandidates(
  slot: Slot,
  grid: (string | null)[][],
  wordList: WordList,
  usedWords: Set<string>
): string[] {
  // Get initial candidates by length
  let candidates = wordList.getByLength(slot.length).map((e) => e.word);

  // Filter by already-placed letters in the grid
  const constraints: { pos: number; letter: string }[] = [];
  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === "across" ? slot.row : slot.row + i;
    const c = slot.direction === "across" ? slot.col + i : slot.col;
    const letter = grid[r][c];
    if (letter) {
      constraints.push({ pos: i, letter });
    }
  }

  if (constraints.length > 0) {
    // Use index for the first constraint, then filter the rest
    const first = constraints[0];
    candidates = wordList.getByConstraint(slot.length, first.pos, first.letter);
    for (let i = 1; i < constraints.length; i++) {
      const { pos, letter } = constraints[i];
      candidates = candidates.filter((w) => w[pos] === letter);
    }
  }

  // Remove already-used words
  return candidates.filter((w) => !usedWords.has(w));
}

/**
 * Place a word into the grid.
 */
function placeWord(
  slot: Slot,
  word: string,
  grid: (string | null)[][]
) {
  for (let i = 0; i < word.length; i++) {
    const r = slot.direction === "across" ? slot.row : slot.row + i;
    const c = slot.direction === "across" ? slot.col + i : slot.col;
    grid[r][c] = word[i];
  }
}

/**
 * Remove a word from the grid (only clear cells not used by other placed words).
 */
function removeWord(
  slot: Slot,
  grid: (string | null)[][],
  occupiedBy: Map<string, Set<number>>
) {
  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === "across" ? slot.row : slot.row + i;
    const c = slot.direction === "across" ? slot.col + i : slot.col;
    const key = `${r},${c}`;
    const owners = occupiedBy.get(key);
    if (owners) {
      owners.delete(slot.id);
      if (owners.size === 0) {
        grid[r][c] = null;
        occupiedBy.delete(key);
      }
    }
  }
}

function markOccupied(slot: Slot, occupiedBy: Map<string, Set<number>>) {
  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === "across" ? slot.row : slot.row + i;
    const c = slot.direction === "across" ? slot.col + i : slot.col;
    const key = `${r},${c}`;
    if (!occupiedBy.has(key)) occupiedBy.set(key, new Set());
    occupiedBy.get(key)!.add(slot.id);
  }
}

/**
 * Main crossword generation using constraint satisfaction + backtracking.
 */
export function generateCrossword(
  patternRows: string[],
  wordList: WordList,
  customClues: CustomClue[] = []
): GeneratorResult {
  const height = patternRows.length;
  const width = patternRows[0].length;

  // Initialize grid
  const grid: (string | null)[][] = [];
  for (let r = 0; r < height; r++) {
    grid.push([]);
    for (let c = 0; c < width; c++) {
      grid[r].push(patternRows[r][c] === "#" ? null : null);
    }
  }

  const slots = extractSlots(patternRows);
  const numberMap = assignNumbers(slots, width, height);
  const usedWords = new Set<string>();
  const occupiedBy = new Map<string, Set<number>>();
  const placed: PlacedEntry[] = [];

  // Phase 1: Place custom words first (longest first for best fit)
  const sortedCustom = [...customClues]
    .map((c) => ({ ...c, answer: c.answer.toUpperCase().replace(/[^A-Z]/g, "") }))
    .filter((c) => c.answer.length >= 3)
    .sort((a, b) => b.answer.length - a.answer.length);

  const customPlaced = new Set<number>();

  for (const custom of sortedCustom) {
    let placed_ok = false;
    for (const slot of slots) {
      if (slot.length !== custom.answer.length) continue;
      if (customPlaced.has(slot.id)) continue;

      // Check if this slot is compatible with current grid state
      let compatible = true;
      for (let i = 0; i < custom.answer.length; i++) {
        const r = slot.direction === "across" ? slot.row : slot.row + i;
        const c = slot.direction === "across" ? slot.col + i : slot.col;
        if (grid[r][c] !== null && grid[r][c] !== custom.answer[i]) {
          compatible = false;
          break;
        }
      }

      if (compatible) {
        placeWord(slot, custom.answer, grid);
        markOccupied(slot, occupiedBy);
        usedWords.add(custom.answer);
        customPlaced.add(slot.id);
        placed.push({
          slot,
          word: custom.answer,
          clue: custom.clue,
          isCustom: true,
        });
        placed_ok = true;
        break;
      }
    }

    if (!placed_ok) {
      // Custom word couldn't be placed; continue with others
    }
  }

  // Phase 2: Fill remaining slots with backtracking
  const remainingSlots = slots.filter((s) => !customPlaced.has(s.id));

  // Sort by most constrained first (MRV heuristic)
  let backtracks = 0;

  function solve(idx: number): boolean {
    if (idx >= remainingSlots.length) return true;
    if (backtracks > MAX_BACKTRACKS) return false;

    // Re-sort remaining slots by number of candidates (MRV)
    // Only do this for the current choice to avoid excessive sorting
    let bestIdx = idx;
    let bestCount = Infinity;
    for (let i = idx; i < remainingSlots.length; i++) {
      const candidates = getCandidates(remainingSlots[i], grid, wordList, usedWords);
      if (candidates.length < bestCount) {
        bestCount = candidates.length;
        bestIdx = i;
      }
      if (bestCount === 0) break;
    }

    // Swap to put most constrained slot at current index
    [remainingSlots[idx], remainingSlots[bestIdx]] = [remainingSlots[bestIdx], remainingSlots[idx]];

    const slot = remainingSlots[idx];
    const candidates = getCandidates(slot, grid, wordList, usedWords);

    // Sort candidates by word quality score (prefer common crossword words)
    const scored = candidates.map((w) => {
      const entry = wordList.getByLength(w.length).find((e) => e.word === w);
      return { word: w, score: entry?.score ?? 50 };
    });
    scored.sort((a, b) => b.score - a.score);

    // Try a limited number of top candidates to keep it fast
    const limit = Math.min(scored.length, 50);

    for (let i = 0; i < limit; i++) {
      const word = scored[i].word;

      // Save grid state
      const savedCells: { r: number; c: number; val: string | null }[] = [];
      for (let j = 0; j < slot.length; j++) {
        const r = slot.direction === "across" ? slot.row : slot.row + j;
        const c = slot.direction === "across" ? slot.col + j : slot.col;
        savedCells.push({ r, c, val: grid[r][c] });
      }

      placeWord(slot, word, grid);
      markOccupied(slot, occupiedBy);
      usedWords.add(word);

      // Check if crossing slots still have valid candidates
      let valid = true;
      for (const crossing of slot.crossings) {
        const crossSlot = slots.find((s) => s.id === crossing.slotId);
        if (!crossSlot || customPlaced.has(crossSlot.id)) continue;
        const crossCandidates = getCandidates(crossSlot, grid, wordList, usedWords);
        if (crossCandidates.length === 0) {
          valid = false;
          break;
        }
      }

      if (valid && solve(idx + 1)) {
        placed.push({ slot, word, isCustom: false });
        return true;
      }

      // Backtrack
      backtracks++;
      usedWords.delete(word);
      removeWord(slot, grid, occupiedBy);
      for (const cell of savedCells) {
        grid[cell.r][cell.c] = cell.val;
      }
    }

    // Swap back
    [remainingSlots[idx], remainingSlots[bestIdx]] = [remainingSlots[bestIdx], remainingSlots[idx]];
    return false;
  }

  const success = solve(0);

  // Build flat grid strings
  const patternStr = patternRows.join("");
  let solutionStr = "";
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (patternRows[r][c] === "#") {
        solutionStr += "#";
      } else {
        solutionStr += grid[r][c] ?? ".";
      }
    }
  }

  // Assign clue numbers to placed entries
  for (const entry of placed) {
    const num = numberMap.get(entry.slot.id);
    if (num !== undefined) {
      entry.slot = { ...entry.slot }; // don't mutate
    }
  }

  return {
    success,
    grid: patternRows.map((_, r) =>
      Array.from({ length: width }, (_, c) =>
        patternRows[r][c] === "#" ? "#" : (grid[r][c] ?? ".")
      ).join("")
    ),
    placed: placed.map((p) => ({
      ...p,
      slot: { ...p.slot },
    })),
    error: success ? undefined : "Could not fill all slots within backtrack limit",
  };
}

/**
 * High-level generation: tries multiple patterns until one succeeds.
 */
export function generateWithFallback(
  size: number,
  wordList: WordList,
  customClues: CustomClue[] = []
): GeneratorResult {
  const patterns = getPatterns(size);

  for (const pattern of patterns) {
    const result = generateCrossword(pattern, wordList, customClues);
    if (result.success) return result;
  }

  // If all patterns fail, return the last attempt's result
  return generateCrossword(patterns[0], wordList, customClues);
}

/**
 * Get the clue number for a slot based on standard numbering.
 */
export function getSlotNumber(
  slot: Slot,
  allSlots: Slot[]
): number {
  const numberMap = new Map<string, number>();
  let num = 1;

  const starts = allSlots
    .map((s) => ({ key: `${s.row},${s.col}`, slotId: s.id, row: s.row, col: s.col }))
    .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col));

  const seen = new Set<string>();
  for (const s of starts) {
    if (!seen.has(s.key)) {
      seen.add(s.key);
      numberMap.set(`${s.slotId}`, num++);
    } else {
      // Same cell, same number
      const existing = starts.find((x) => x.key === s.key && seen.has(x.key));
      if (existing) {
        numberMap.set(`${s.slotId}`, numberMap.get(`${existing.slotId}`) ?? num);
      }
    }
  }

  return numberMap.get(`${slot.id}`) ?? 0;
}
