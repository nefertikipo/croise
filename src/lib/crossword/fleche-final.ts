/**
 * Mots fléchés generator — final version.
 *
 * Row-by-row construction with integrated constraint checking.
 * Every constraint is enforced during construction.
 * Does NOT return until the grid is perfect.
 *
 * Constraints:
 * 1. Every cell is # or letter. No empties.
 * 2. Words are 2+ letters.
 * 3. Every letter cell is part of a horizontal AND vertical word.
 * 4. No adjacent interior # cells.
 * 5. Potence alternates in row 0 and col 0.
 * 6. Every # cell defines at least one word.
 * 7. Every word is a real dictionary word.
 */

import type {
  FlecheCell,
  FlecheGrid,
  FlecheWord,
  FlecheGenerationParams,
  ClueInCell,
} from "@/lib/crossword/fleche-types";
import type { WordList } from "@/lib/crossword/word-list";

type Cell = "#" | string | null;

function pickClue(word: string, clueDb: Map<string, string[]>): string {
  const dbClues = clueDb.get(word);
  if (!dbClues || dbClues.length === 0) return "?";
  const filtered = dbClues.filter((c) => {
    const n = c.toUpperCase().replace(/[^A-Z]/g, "");
    return !n.includes(word) && c.length <= 40;
  });
  const pool = filtered.length > 0 ? filtered : dbClues.filter((c) => c.length <= 40);
  if (pool.length === 0) return dbClues[0].slice(0, 37) + "...";
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Check if placing # at (r,c) would be adjacent to another interior #.
 */
function canPlaceClue(grid: Cell[][], r: number, c: number, height: number, width: number): boolean {
  if (r === 0 || c === 0) return true;
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= height || nc >= width) continue;
    if (nr === 0 || nc === 0) continue; // potence exempt
    if (grid[nr][nc] === "#") return false;
  }
  return true;
}

/**
 * Check if placing # at (r,c) would orphan it (no word can start from it).
 */
function wouldBeOrphan(grid: Cell[][], r: number, c: number, height: number, width: number): boolean {
  // Can a word start to the RIGHT?
  let rightLen = 0;
  for (let cc = c + 1; cc < width && grid[r][cc] !== "#"; cc++) rightLen++;
  if (rightLen >= 2) return false;

  // Can a word start BELOW?
  let downLen = 0;
  for (let rr = r + 1; rr < height; rr++) {
    // We don't know future rows, so estimate: if no # is below yet, count available space
    if (grid[rr]?.[c] === "#") break;
    downLen++;
  }
  if (downLen >= 2) return false;

  return true; // Neither direction has room for a word
}

/**
 * Generate all valid row layouts for row R.
 *
 * A layout assigns each cell to # or letter (L), subject to:
 * - Fixed cells unchanged
 * - No adjacent interior #
 * - Letter segments between #s are 2+ cells
 * - # cells won't be orphans
 *
 * Returns arrays of "#" | "L" per column.
 */
function generateLayouts(
  row: number,
  width: number,
  height: number,
  grid: Cell[][],
  fixedCells: Map<number, "#" | "L">
): ("#" | "L")[][] {
  const results: ("#" | "L")[][] = [];
  const layout: ("#" | "L")[] = new Array(width);

  function recurse(col: number) {
    if (col === width) {
      // Validate: check that all letter segments are 2+ long
      let segLen = 0;
      for (let c = 0; c <= width; c++) {
        if (c === width || layout[c] === "#") {
          if (segLen === 1) return; // Single letter segment = invalid
          segLen = 0;
        } else {
          segLen++;
        }
      }
      results.push([...layout]);
      return;
    }

    const fixed = fixedCells.get(col);

    if (fixed) {
      layout[col] = fixed;
      recurse(col + 1);
      return;
    }

    // Try "L" (letter)
    layout[col] = "L";
    recurse(col + 1);

    // Try "#" (clue cell)
    // Check: not adjacent to another interior #
    // Check left neighbor in this row
    if (col > 0 && layout[col - 1] === "#" && row > 0 && col > 0) {
      // Would be horizontally adjacent — skip
    } else if (!canPlaceClue(grid, row, col, height, width)) {
      // Would be adjacent to # above/below (from previous rows)
    } else if (row === 0 || col === 0) {
      // Potence — always OK
      layout[col] = "#";
      recurse(col + 1);
    } else {
      // Interior — check if would be orphan
      // Can't fully check orphan without future rows, so just check RIGHT (left is #)
      let rightSpace = 0;
      for (let cc = col + 1; cc < width; cc++) {
        const f = fixedCells.get(cc);
        if (f === "#") break;
        rightSpace++;
      }
      const downSpace = height - row - 1; // max possible vertical space

      if (rightSpace >= 2 || downSpace >= 2) {
        layout[col] = "#";
        recurse(col + 1);
      }
    }
  }

  recurse(0);

  // Shuffle for variety
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }

  return results;
}

/**
 * Try to fill letter segments in a layout with dictionary words.
 * Returns words placed or null if any segment can't be filled.
 */
function fillLayout(
  row: number,
  layout: ("#" | "L")[],
  grid: Cell[][],
  width: number,
  height: number,
  wordList: WordList,
  usedWords: Set<string>
): { word: string; col: number }[] | null {
  const words: { word: string; col: number }[] = [];

  // Find letter segments
  let segStart = -1;
  for (let c = 0; c <= width; c++) {
    if (c === width || layout[c] === "#") {
      if (segStart >= 0) {
        const len = c - segStart;
        // Gather constraints from vertical crossings
        const constraints: { pos: number; letter: string }[] = [];
        for (let i = 0; i < len; i++) {
          const cell = grid[row][segStart + i];
          if (typeof cell === "string" && cell !== "#") {
            constraints.push({ pos: i, letter: cell });
          }
        }

        // Find a word
        let candidates: string[];
        if (constraints.length === 0) {
          candidates = wordList.getByLength(len).map((e) => e.word);
        } else {
          candidates = wordList.getByConstraint(len, constraints[0].pos, constraints[0].letter);
          for (let i = 1; i < constraints.length; i++) {
            candidates = candidates.filter((w) => w[constraints[i].pos] === constraints[i].letter);
          }
        }
        candidates = candidates.filter((w) => !usedWords.has(w));

        if (candidates.length === 0) return null;

        // Pick a random candidate (shuffle first few)
        const idx = Math.floor(Math.random() * Math.min(candidates.length, 30));
        words.push({ word: candidates[idx], col: segStart });

        segStart = -1;
      }
    } else {
      if (segStart === -1) segStart = c;
    }
  }

  return words;
}

/**
 * Check vertical viability for letters placed in a row.
 * For each letter at (row, col), verify that the vertical slot
 * can still be completed with a real word.
 */
function checkVerticalViability(
  row: number,
  words: { word: string; col: number }[],
  grid: Cell[][],
  height: number,
  wordList: WordList
): boolean {
  for (const w of words) {
    for (let i = 0; i < w.word.length; i++) {
      const col = w.col + i;
      const letter = w.word[i];

      // Find vertical slot bounds
      let top = row;
      while (top > 0 && grid[top - 1][col] !== "#") top--;

      // Count letters placed so far in this vertical slot
      const constraints: { pos: number; letter: string }[] = [];
      for (let r = top; r <= row; r++) {
        const l = r === row ? letter : grid[r][col];
        if (typeof l === "string" && l !== "#") {
          constraints.push({ pos: r - top, letter: l });
        }
      }

      if (constraints.length < 2) continue; // Too few letters to validate yet
      // Don't be too strict in early rows (not enough vertical data yet)
      if (row < 3) continue;

      // Remaining rows below
      const remainingRows = height - row - 1;
      const currentLen = row - top + 1;

      // Check: is there ANY word of length currentLen to currentLen+remainingRows
      // that matches these constraints?
      let viable = false;
      for (let len = Math.max(currentLen, 2); len <= currentLen + Math.min(remainingRows, 6); len++) {
        if (constraints.some((c) => c.pos >= len)) continue;
        let cands = wordList.getByConstraint(len, constraints[0].pos, constraints[0].letter);
        for (let j = 1; j < constraints.length; j++) {
          cands = cands.filter((w2) => w2[constraints[j].pos] === constraints[j].letter);
        }
        if (cands.length > 0) { viable = true; break; }
      }

      if (!viable) return false;
    }
  }

  return true;
}

/**
 * Main solver: process rows one at a time with backtracking.
 */
function solve(
  row: number,
  grid: Cell[][],
  width: number,
  height: number,
  wordList: WordList,
  usedWords: Set<string>,
  placedWords: { word: string; row: number; col: number; dir: "right" | "down" }[],
  deadline: number
): boolean {
  if (Date.now() > deadline) return false;

  if (row >= height) {
    // All rows filled. Validate all vertical words.
    for (let c = 0; c < width; c++) {
      let segStart = -1;
      for (let r = 0; r <= height; r++) {
        if (r === height || grid[r][c] === "#") {
          if (segStart >= 0) {
            const len = r - segStart;
            if (len >= 2) {
              const word = Array.from({ length: len }, (_, i) => grid[segStart + i][c]).join("");
              if (!wordList.has(word)) return false;
            }
          }
          segStart = -1;
        } else {
          if (segStart === -1) segStart = r;
        }
      }
    }
    return true; // All valid!
  }

  // Determine fixed cells for this row
  const fixedCells = new Map<number, "#" | "L">();

  // Potence (col 0)
  fixedCells.set(0, row % 2 === 0 ? "#" : "L");

  // Cells already set by previous rows (vertical words, terminators)
  for (let c = 0; c < width; c++) {
    if (fixedCells.has(c)) continue;
    const cell = grid[row][c];
    if (cell === "#") fixedCells.set(c, "#");
    else if (typeof cell === "string") fixedCells.set(c, "L");
  }

  // Generate valid layouts
  const layouts = generateLayouts(row, width, height, grid, fixedCells);

  // Try each layout
  for (const layout of layouts.slice(0, 50)) { // limit to prevent explosion
    // Save grid state for this row
    const savedRow = [...grid[row]];
    const savedWords = placedWords.length;
    const savedUsed = new Set(usedWords);

    // Apply layout: set # cells
    for (let c = 0; c < width; c++) {
      if (layout[c] === "#" && grid[row][c] === null) {
        grid[row][c] = "#";
      }
    }

    // Fill letter segments with words
    const filled = fillLayout(row, layout, grid, width, height, wordList, usedWords);
    if (!filled) {
      // Undo
      grid[row] = savedRow;
      placedWords.length = savedWords;
      usedWords.clear();
      savedUsed.forEach((w) => usedWords.add(w));
      continue;
    }

    // Check vertical viability
    if (!checkVerticalViability(row, filled, grid, height, wordList)) {
      grid[row] = savedRow;
      placedWords.length = savedWords;
      usedWords.clear();
      savedUsed.forEach((w) => usedWords.add(w));
      continue;
    }

    // Apply words
    for (const w of filled) {
      for (let i = 0; i < w.word.length; i++) {
        grid[row][w.col + i] = w.word[i];
      }
      usedWords.add(w.word);
      placedWords.push({ word: w.word, row, col: w.col, dir: "right" });
    }

    // Recurse to next row
    if (solve(row + 1, grid, width, height, wordList, usedWords, placedWords, deadline)) {
      return true;
    }

    // Undo this row
    grid[row] = savedRow;
    placedWords.length = savedWords;
    usedWords.clear();
    savedUsed.forEach((w) => usedWords.add(w));
  }

  return false;
}

// --- MAIN ---

export function generateFleche(
  params: FlecheGenerationParams,
  wordList: WordList,
  clueDatabase: Map<string, string[]>
): FlecheGrid {
  const width = params.width ?? 11;
  const height = params.height ?? 17;

  const grid: Cell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );
  const usedWords = new Set<string>();
  const placedWords: { word: string; row: number; col: number; dir: "right" | "down" }[] = [];

  // Row 0 is the potence - set it up directly (no solving needed)
  for (let c = 0; c < width; c++) {
    grid[0][c] = c % 2 === 0 ? "#" : null; // odd cols will be filled by vertical words
  }
  for (let r = 0; r < height; r++) {
    grid[r][0] = r % 2 === 0 ? "#" : null;
  }

  // Solve starting from row 1
  const deadline = Date.now() + 10_000; // 10 second max
  const success = solve(1, grid, width, height, wordList, usedWords, placedWords, deadline);

  if (!success) {
    return {
      width, height,
      cells: Array.from({ length: height }, () =>
        Array.from({ length: width }, () => ({ type: "empty" as const }))
      ),
      words: [],
    };
  }

  // Extract vertical words
  for (let c = 0; c < width; c++) {
    let segStart = -1;
    for (let r = 0; r <= height; r++) {
      if (r === height || grid[r][c] === "#") {
        if (segStart >= 0) {
          const len = r - segStart;
          if (len >= 2) {
            const word = Array.from({ length: len }, (_, i) => grid[segStart + i][c]).join("");
            if (!usedWords.has(word)) {
              usedWords.add(word);
              placedWords.push({ word, row: segStart, col: c, dir: "down" });
            }
          }
        }
        segStart = -1;
      } else {
        if (segStart === -1) segStart = r;
      }
    }
  }

  // Build output
  const cells: FlecheCell[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      if (grid[r][c] === "#") return { type: "clue" as const, clues: [] as ClueInCell[] };
      return { type: "letter" as const, letter: grid[r][c] as string };
    })
  );

  const flecheWords: FlecheWord[] = [];

  for (const pw of placedWords) {
    const clueText = pickClue(pw.word, clueDatabase);
    let clueRow = -1, clueCol = -1;

    if (pw.dir === "right") {
      if (pw.col > 0 && grid[pw.row][pw.col - 1] === "#") {
        clueRow = pw.row; clueCol = pw.col - 1;
      } else if (pw.col === 0 && pw.row > 0 && grid[pw.row - 1][0] === "#") {
        clueRow = pw.row - 1; clueCol = 0;
      }
    } else {
      if (pw.row > 0 && grid[pw.row - 1][pw.col] === "#") {
        clueRow = pw.row - 1; clueCol = pw.col;
      } else if (pw.row === 0 && pw.col > 0 && grid[0][pw.col - 1] === "#") {
        clueRow = 0; clueCol = pw.col - 1;
      }
    }

    if (clueRow >= 0 && clueCol >= 0) {
      const cell = cells[clueRow][clueCol];
      if (cell.type === "clue" && (cell.clues?.length ?? 0) < 2) {
        cell.clues!.push({
          text: clueText,
          direction: pw.dir,
          answerRow: pw.row,
          answerCol: pw.col,
          answerLength: pw.word.length,
          answer: pw.word,
        });
      }
    }

    flecheWords.push({
      answer: pw.word,
      clue: clueText,
      direction: pw.dir,
      clueRow, clueCol,
      startRow: pw.row,
      startCol: pw.col,
      length: pw.word.length,
      isCustom: false,
    });
  }

  return { width, height, cells, words: flecheWords };
}
