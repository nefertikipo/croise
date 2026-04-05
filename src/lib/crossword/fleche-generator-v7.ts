/**
 * Mots fléchés generator v7 - v6 patterns + v4 CSP solver.
 *
 * 1. Generate a valid pattern using row partitions (from v6)
 * 2. Extract ALL slots (horizontal + vertical) from the pattern
 * 3. Fill ALL slots simultaneously using CSP backtracking (from v4)
 * 4. Every horizontal AND vertical word is a real dictionary word
 */

import type {
  FlecheCell,
  FlecheGrid,
  FlecheWord,
  FlecheGenerationParams,
  ClueInCell,
} from "@/lib/crossword/fleche-types";
import type { WordList } from "@/lib/crossword/word-list";

type CellType = "#" | ".";

interface Slot {
  row: number;
  col: number;
  direction: "right" | "down";
  length: number;
  crossings: { slotIdx: number; thisPos: number; otherPos: number }[];
}

function pickClue(word: string, clueDb: Map<string, string[]>): string {
  const dbClues = clueDb.get(word);
  if (!dbClues || dbClues.length === 0) return "?";
  // Filter out clues that contain the answer word
  const filtered = dbClues.filter((c) => {
    const normalized = c.toUpperCase().replace(/[^A-Z]/g, "");
    return !normalized.includes(word) && c.length <= 40;
  });
  const pool = filtered.length > 0 ? filtered : dbClues.filter((c) => c.length <= 40);
  if (pool.length === 0) return dbClues[0].slice(0, 37) + "...";
  return pool[Math.floor(Math.random() * pool.length)];
}

// --- PATTERN GENERATION (from v6) ---

function generatePartitions(cols: number, min = 3, max = 10): number[][] {
  const results: number[][] = [];
  function recurse(remaining: number, current: number[]) {
    if (remaining === 0) { results.push([...current]); return; }
    if (remaining < min) return;
    for (let len = min; len <= Math.min(max, remaining); len++) {
      current.push(len);
      const after = remaining - len;
      if (after === 0) results.push([...current]);
      else if (after >= min + 1) recurse(after - 1, current);
      current.pop();
    }
  }
  recurse(cols, []);
  return results;
}

function isPartitionSafe(
  row: number, startCol: number, partition: number[],
  pattern: CellType[][], height: number, width: number
): boolean {
  let col = startCol;
  for (let seg = 0; seg < partition.length; seg++) {
    col += partition[seg];
    if (seg < partition.length - 1) {
      if (col >= width) return false;
      // Block all adjacent clue cells (except potence)
      for (const [nr, nc] of [[row-1,col],[row+1,col],[row,col-1],[row,col+1]]) {
        if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
        if (nr === 0 || nc === 0) continue; // potence exempt
        if (pattern[nr][nc] === "#") return false;
      }
      col++;
    }
  }
  return true;
}

function generatePattern(width: number, height: number): CellType[][] | null {
  const pattern: CellType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => "." as CellType)
  );

  // Potence
  for (let c = 0; c < width; c++) pattern[0][c] = c % 2 === 0 ? "#" : ".";
  for (let r = 0; r < height; r++) pattern[r][0] = r % 2 === 0 ? "#" : ".";

  // Fill each row with a partition
  // Also allow single-word rows (no interior clue cells) as partition [width]
  const oddParts = generatePartitions(width);
  const evenParts = generatePartitions(width - 1);

  for (let r = 1; r < height; r++) {
    const startCol = r % 2 === 0 ? 1 : 0;
    const availCols = width - startCol;
    // Add single-word partitions (no clue cells) as fallback
    const parts = [
      ...(r % 2 === 0 ? evenParts : oddParts),
    ].sort(() => Math.random() - 0.5);

    let filled = false;
    for (const p of parts) {
      if (!isPartitionSafe(r, startCol, p, pattern, height, width)) continue;

      let col = startCol;
      for (let seg = 0; seg < p.length; seg++) {
        col += p[seg];
        if (seg < p.length - 1 && col < width) {
          pattern[r][col] = "#";
          col++;
        }
      }
      filled = true;
      break;
    }

    if (!filled) {
      // Row stays all "." - one big word
    }
  }

  // Vertical pass: break long vertical runs by adding clue cells
  for (let c = 1; c < width; c++) {
    let runStart = -1;
    for (let r = 0; r <= height; r++) {
      const isEnd = r === height || pattern[r][c] === "#";
      if (!isEnd && runStart === -1) runStart = r;
      if (isEnd && runStart >= 0) {
        const runLen = r - runStart;
        if (runLen > 8) {
          // Break this run: place a clue cell roughly in the middle
          const mid = runStart + 3 + Math.floor(Math.random() * Math.min(3, runLen - 6));
          pattern[mid][c] = "#";
        }
        runStart = -1;
      }
    }
  }

  return pattern;
}

// --- SLOT EXTRACTION ---

function extractSlots(pattern: CellType[][], height: number, width: number): Slot[] {
  const slots: Slot[] = [];

  // Horizontal: after each "#" cell, run of "." cells
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (pattern[r][c] !== "#") continue;
      let end = c + 1;
      while (end < width && pattern[r][end] === ".") end++;
      if (end - c - 1 >= 3) {
        slots.push({ row: r, col: c + 1, direction: "right", length: end - c - 1, crossings: [] });
      }
    }
  }

  // Left potence: clue at row R → horizontal word on row R+1 starting at col 0
  for (let r = 0; r < height; r += 2) {
    if (pattern[r][0] !== "#") continue;
    const wordRow = r + 1;
    if (wordRow >= height) continue;
    let end = 0;
    while (end < width && pattern[wordRow][end] !== "#") end++;
    if (end >= 3) {
      slots.push({ row: wordRow, col: 0, direction: "right", length: end, crossings: [] });
    }
  }

  // Vertical: after each "#" cell going down
  for (let c = 0; c < width; c++) {
    for (let r = 0; r < height; r++) {
      if (pattern[r][c] !== "#") continue;
      let end = r + 1;
      while (end < height && pattern[end][c] === ".") end++;
      if (end - r - 1 >= 3) {
        slots.push({ row: r + 1, col: c, direction: "down", length: end - r - 1, crossings: [] });
      }
    }
  }

  // Top potence: clue at col C → vertical word in col C+1 starting at row 0
  for (let c = 0; c < width; c += 2) {
    if (pattern[0][c] !== "#") continue;
    const wordCol = c + 1;
    if (wordCol >= width) continue;
    let end = 0;
    while (end < height && pattern[end][wordCol] !== "#") end++;
    if (end >= 3) {
      slots.push({ row: 0, col: wordCol, direction: "down", length: end, crossings: [] });
    }
  }

  // Deduplicate slots (same row, col, direction, length)
  const seen = new Set<string>();
  const unique: Slot[] = [];
  for (const s of slots) {
    const key = `${s.row},${s.col},${s.direction},${s.length}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }

  // Build crossing graph
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const a = unique[i], b = unique[j];
      if (a.direction === b.direction) continue;
      const h = a.direction === "right" ? a : b;
      const v = a.direction === "right" ? b : a;
      if (v.col >= h.col && v.col < h.col + h.length &&
          h.row >= v.row && h.row < v.row + v.length) {
        const hp = v.col - h.col;
        const vp = h.row - v.row;
        const hi = a.direction === "right" ? i : j;
        const vi = a.direction === "right" ? j : i;
        unique[hi].crossings.push({ slotIdx: vi, thisPos: hp, otherPos: vp });
        unique[vi].crossings.push({ slotIdx: hi, thisPos: vp, otherPos: hp });
      }
    }
  }

  return unique;
}

// --- CSP SOLVER (from v4) ---

function fillAllSlots(
  slots: Slot[], pattern: CellType[][], height: number, width: number, wordList: WordList
): Map<number, string> | null {
  const grid: (string | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );
  const placed = new Map<number, string>();
  const usedWords = new Set<string>();
  const order = slots.map((_, i) => i);
  let backtracks = 0;
  const MAX_BT = 1_000_000;

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
        words = words.filter((w) => w[constraints[i].pos] === constraints[i].letter);
      }
    }
    return words.filter((w) => !usedWords.has(w));
  }

  function solve(idx: number): boolean {
    if (idx >= order.length) return true;
    if (backtracks > MAX_BT) return false;

    // MRV
    let bestIdx = idx, bestCount = Infinity;
    for (let i = idx; i < order.length; i++) {
      const count = getCandidates(order[i]).length;
      if (count < bestCount) { bestCount = count; bestIdx = i; }
      if (count === 0) break;
    }
    if (bestCount === 0) { backtracks++; return false; }

    [order[idx], order[bestIdx]] = [order[bestIdx], order[idx]];
    const si = order[idx];
    const slot = slots[si];
    const cands = getCandidates(si)
      .map((w) => ({ w, s: Math.random() * 30 + (wordList.getByLength(w.length).find((e) => e.word === w)?.score ?? 50) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 100)
      .map((x) => x.w);

    for (const word of cands) {
      const saved: { r: number; c: number; v: string | null }[] = [];
      for (let i = 0; i < slot.length; i++) {
        const r = slot.direction === "right" ? slot.row : slot.row + i;
        const c = slot.direction === "right" ? slot.col + i : slot.col;
        saved.push({ r, c, v: grid[r][c] });
        grid[r][c] = word[i];
      }
      usedWords.add(word);
      placed.set(si, word);

      let valid = true;
      for (const cr of slot.crossings) {
        if (placed.has(cr.slotIdx)) continue;
        if (getCandidates(cr.slotIdx).length === 0) { valid = false; break; }
      }

      if (valid && solve(idx + 1)) return true;

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

// --- MAIN ---

export function generateFleche(
  params: FlecheGenerationParams,
  wordList: WordList,
  clueDatabase: Map<string, string[]>
): FlecheGrid {
  const width = params.width ?? 11;
  const height = params.height ?? 17;
  const needsTranspose = false;

  // Try multiple patterns until CSP solver succeeds
  let placed: Map<number, string> | null = null;
  let pattern: CellType[][] | null = null;
  let slots: Slot[] = [];

  for (let attempt = 0; attempt < 20; attempt++) {
    pattern = generatePattern(width, height);
    if (!pattern) continue;

    slots = extractSlots(pattern, height, width);
    if (slots.length < 5) continue;

    // Validate: every "." cell must be covered by at least one slot
    const covered = new Set<string>();
    for (const slot of slots) {
      for (let i = 0; i < slot.length; i++) {
        const r = slot.direction === "right" ? slot.row : slot.row + i;
        const c = slot.direction === "right" ? slot.col + i : slot.col;
        covered.add(`${r},${c}`);
      }
    }
    let allCovered = true;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (pattern[r][c] === "." && !covered.has(`${r},${c}`)) {
          allCovered = false;
          // Convert orphan letter cell to clue cell
          pattern[r][c] = "#";
        }
      }
    }
    // Re-extract if we changed the pattern
    if (!allCovered) {
      slots = extractSlots(pattern, height, width);
      if (slots.length < 5) continue;
    }

    placed = fillAllSlots(slots, pattern, height, width, wordList);
    if (placed && placed.size === slots.length) break;
    placed = null;
  }

  if (!placed || !pattern) {
    return {
      width, height,
      cells: Array.from({ length: height }, () =>
        Array.from({ length: width }, () => ({ type: "empty" as const }))
      ),
      words: [],
    };
  }

  // Build letter grid from placed words
  const letterGrid: (string | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );
  for (const [si, word] of placed) {
    const slot = slots[si];
    for (let i = 0; i < slot.length; i++) {
      const r = slot.direction === "right" ? slot.row : slot.row + i;
      const c = slot.direction === "right" ? slot.col + i : slot.col;
      letterGrid[r][c] = word[i];
    }
  }

  // Build output cells
  const outputCells: FlecheCell[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      if (pattern![r][c] === "#") {
        return { type: "clue" as const, clues: [] as ClueInCell[] };
      }
      return { type: "letter" as const, letter: letterGrid[r][c] ?? "?" };
    })
  );

  // Assign clues
  const flecheWords: FlecheWord[] = [];

  for (const [si, word] of placed) {
    const slot = slots[si];
    const clueText = pickClue(word, clueDatabase);

    let clueRow = -1, clueCol = -1;

    if (slot.direction === "right") {
      // Clue cell to the left
      if (slot.col > 0 && pattern![slot.row][slot.col - 1] === "#") {
        clueRow = slot.row; clueCol = slot.col - 1;
      }
      // Potence: left column clue one row above
      else if (slot.col === 0 && slot.row > 0 && pattern![slot.row - 1][0] === "#") {
        clueRow = slot.row - 1; clueCol = 0;
      }
    } else {
      // Clue cell above
      if (slot.row > 0 && pattern![slot.row - 1][slot.col] === "#") {
        clueRow = slot.row - 1; clueCol = slot.col;
      }
      // Potence: top row clue one col to the left
      else if (slot.row === 0 && slot.col > 0 && pattern![0][slot.col - 1] === "#") {
        clueRow = 0; clueCol = slot.col - 1;
      }
    }

    // Try to assign (max 2 per cell)
    if (clueRow >= 0 && clueCol >= 0) {
      const cell = outputCells[clueRow][clueCol];
      if (cell.type === "clue" && (cell.clues?.length ?? 0) < 2) {
        cell.clues!.push({
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
      clueRow, clueCol,
      startRow: slot.row,
      startCol: slot.col,
      length: word.length,
      isCustom: false,
    });
  }

  if (!needsTranspose) {
    return { width, height, cells: outputCells, words: flecheWords };
  }

  // Transpose: swap rows/cols so landscape becomes portrait
  const tCells: FlecheCell[][] = Array.from({ length: width }, (_, r) =>
    Array.from({ length: height }, (_, c) => {
      const cell = outputCells[c][r];
      if (cell.type === "clue" && cell.clues) {
        // Swap arrow directions
        return {
          ...cell,
          clues: cell.clues.map((cl) => ({
            ...cl,
            direction: (cl.direction === "right" ? "down" : "right") as "right" | "down",
            answerRow: cl.answerCol,
            answerCol: cl.answerRow,
          })),
        };
      }
      return cell;
    })
  );

  const tWords = flecheWords.map((w) => ({
    ...w,
    direction: (w.direction === "right" ? "down" : "right") as "right" | "down",
    startRow: w.startCol,
    startCol: w.startRow,
    clueRow: w.clueCol,
    clueCol: w.clueRow,
  }));

  return { width: height, height: width, cells: tCells, words: tWords };
}
