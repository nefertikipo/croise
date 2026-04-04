/**
 * Mots fléchés generator v6 - Row-by-row with vertical viability scoring.
 *
 * Algorithm:
 * 0. Fixed potence (alternating clue/letter in row 0 and col 0)
 * 1. Generate row partitions: [word][clue][word][clue]... that exactly fill width
 * 2. Fill each row top-to-bottom, scoring candidates by vertical viability
 * 3. Backtrack by row if stuck
 * 4. Verify all verticals are valid dictionary words
 * 5. Assign clues from database
 */

import type {
  FlecheCell,
  FlecheGrid,
  FlecheWord,
  FlecheGenerationParams,
  ClueInCell,
} from "@/lib/crossword/fleche-types";
import type { WordList } from "@/lib/crossword/word-list";

type CellType = "#" | string | null;

function pickClue(word: string, clueDb: Map<string, string[]>): string {
  const dbClues = clueDb.get(word);
  if (!dbClues || dbClues.length === 0) return word;
  const short = dbClues.filter((c) => c.length <= 35);
  const pool = short.length > 0 ? short : dbClues;
  let clue = pool[Math.floor(Math.random() * pool.length)];
  if (clue.length > 40) clue = clue.slice(0, 37) + "...";
  return clue;
}

/**
 * Generate all valid partitions of `cols` columns into word lengths (3-7)
 * separated by single clue cells.
 *
 * Returns arrays of word lengths. e.g. [5, 4, 5] means:
 * 5 letters, 1 clue, 4 letters, 1 clue, 5 letters = 16 cols
 */
function generatePartitions(cols: number, minWord: number = 3, maxWord: number = 7): number[][] {
  const results: number[][] = [];

  function recurse(remaining: number, current: number[]) {
    if (remaining === 0) {
      results.push([...current]);
      return;
    }
    if (remaining < minWord) return; // can't fit another word

    for (let len = minWord; len <= Math.min(maxWord, remaining); len++) {
      current.push(len);
      const afterWord = remaining - len;

      if (afterWord === 0) {
        // Exactly fills remaining space
        results.push([...current]);
      } else if (afterWord >= minWord + 1) {
        // Room for a clue cell + another word
        recurse(afterWord - 1, current); // -1 for the clue cell
      }
      // else: afterWord is 1-3 (too small for clue+word), skip

      current.pop();
    }
  }

  recurse(cols, []);
  return results;
}

/**
 * Compute vertical viability for placing a letter at (row, col).
 * Returns the number of dictionary words that could still complete
 * the vertical slot containing this position.
 */
function verticalViability(
  row: number,
  col: number,
  letter: string,
  grid: CellType[][],
  height: number,
  wordList: WordList
): number {
  // Find the vertical slot bounds (from last clue cell above to next clue cell below)
  let slotStart = row;
  while (slotStart > 0 && grid[slotStart - 1][col] !== "#") slotStart--;

  // Estimate slot end (we don't know future clue cells, so use height or next clue)
  let slotEnd = row;
  while (slotEnd < height - 1 && grid[slotEnd + 1][col] !== "#") slotEnd++;

  const slotLen = slotEnd - slotStart + 1;
  if (slotLen < 3) return 1000; // too short to be a word, don't constrain
  if (slotLen > 8) return 1000; // too long, will be split later

  // Gather existing constraints in this vertical slot
  const constraints: { pos: number; letter: string }[] = [];
  for (let r = slotStart; r <= slotEnd; r++) {
    const cell = grid[r][col];
    if (r === row) {
      constraints.push({ pos: r - slotStart, letter });
    } else if (typeof cell === "string" && cell !== "#") {
      constraints.push({ pos: r - slotStart, letter: cell });
    }
  }

  // Count matching words
  if (constraints.length === 0) return 1000;

  let candidates = wordList.getByConstraint(slotLen, constraints[0].pos, constraints[0].letter);
  for (let i = 1; i < constraints.length; i++) {
    candidates = candidates.filter((w) => w[constraints[i].pos] === constraints[i].letter);
  }

  return candidates.length;
}

/**
 * Find words matching length and constraints, scored by vertical viability.
 */
function findScoredWords(
  wordList: WordList,
  length: number,
  row: number,
  startCol: number,
  grid: CellType[][],
  height: number,
  usedWords: Set<string>,
  limit: number = 30
): { word: string; score: number }[] {
  // Gather horizontal constraints from the grid
  const constraints: { pos: number; letter: string }[] = [];
  for (let i = 0; i < length; i++) {
    const cell = grid[row][startCol + i];
    if (typeof cell === "string" && cell !== "#") {
      constraints.push({ pos: i, letter: cell });
    }
  }

  // Find matching words
  let candidates: string[];
  if (constraints.length === 0) {
    candidates = wordList.getByLength(length).map((e) => e.word);
  } else {
    candidates = wordList.getByConstraint(length, constraints[0].pos, constraints[0].letter);
    for (let i = 1; i < constraints.length; i++) {
      candidates = candidates.filter((w) => w[constraints[i].pos] === constraints[i].letter);
    }
  }

  candidates = candidates.filter((w) => !usedWords.has(w));
  if (candidates.length === 0) return [];

  // Score by vertical viability
  const scored: { word: string; score: number }[] = [];

  // Sample a subset for performance
  const sample = candidates.length > 200
    ? candidates.sort(() => Math.random() - 0.5).slice(0, 200)
    : candidates;

  for (const word of sample) {
    let minViability = Infinity;
    let totalViability = 0;
    let blocked = false;

    for (let i = 0; i < length; i++) {
      const col = startCol + i;
      const viability = verticalViability(row, col, word[i], grid, height, wordList);
      if (viability === 0) { blocked = true; break; }
      minViability = Math.min(minViability, viability);
      totalViability += viability;
    }

    if (!blocked) {
      scored.push({
        word,
        score: minViability * 1000 + totalViability + Math.random() * 10,
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Check if a partition would create adjacent clue cells with existing grid.
 * Returns true if the partition is SAFE (no adjacencies).
 */
function isPartitionSafe(
  row: number,
  startCol: number,
  partition: number[],
  grid: CellType[][],
  height: number,
  width: number
): boolean {
  // Calculate where clue cells would go
  let col = startCol;
  for (let seg = 0; seg < partition.length; seg++) {
    col += partition[seg];
    if (seg < partition.length - 1) {
      // Clue cell at (row, col)
      if (col >= width) return false;

      // Check neighbors (skip potence: row 0, col 0)
      const neighbors = [
        [row - 1, col], [row + 1, col],
        [row, col - 1], [row, col + 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
        if (nr === 0 || nc === 0) continue; // potence is exempt
        if (grid[nr][nc] === "#") return false;
      }

      col++; // move past the clue cell
    }
  }
  return true;
}

/**
 * Try to fill a single row given a partition.
 * Returns placed words or null if failed.
 */
function tryFillRow(
  row: number,
  startCol: number,
  partition: number[],
  grid: CellType[][],
  height: number,
  width: number,
  wordList: WordList,
  usedWords: Set<string>
): { word: string; col: number }[] | null {
  const words: { word: string; col: number }[] = [];
  let col = startCol;

  for (let seg = 0; seg < partition.length; seg++) {
    const len = partition[seg];

    const candidates = findScoredWords(wordList, len, row, col, grid, height, usedWords, 20);
    if (candidates.length === 0) return null;

    const chosen = candidates[0];
    words.push({ word: chosen.word, col });

    // Place letters temporarily
    for (let i = 0; i < len; i++) {
      grid[row][col + i] = chosen.word[i];
    }
    usedWords.add(chosen.word);

    col += len;

    // Place clue cell between words (not after last word)
    if (seg < partition.length - 1) {
      grid[row][col] = "#";
      col++;
    }
  }

  return words;
}

/**
 * Undo a row fill.
 */
function undoRow(
  row: number,
  startCol: number,
  partition: number[],
  words: { word: string; col: number }[],
  grid: CellType[][],
  width: number,
  usedWords: Set<string>
) {
  // Clear the entire row from startCol
  for (let c = startCol; c < width; c++) {
    grid[row][c] = null;
  }
  for (const w of words) {
    usedWords.delete(w.word);
  }
}

export function generateFleche(
  params: FlecheGenerationParams,
  wordList: WordList,
  clueDatabase: Map<string, string[]>
): FlecheGrid {
  const width = params.width ?? 17;
  const height = params.height ?? 11;

  const customWords = (params.customClues ?? [])
    .map((c) => ({
      word: c.answer.toUpperCase().replace(/[^A-Z]/g, ""),
      clue: c.clue,
    }))
    .filter((c) => c.word.length >= 3);

  const grid: CellType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );
  const usedWords = new Set<string>();
  const placedWords: { word: string; clue: string; row: number; col: number; direction: "right" | "down"; isCustom: boolean }[] = [];

  // Step 0: Potence
  for (let c = 0; c < width; c++) grid[0][c] = c % 2 === 0 ? "#" : null;
  for (let r = 0; r < height; r++) grid[r][0] = r % 2 === 0 ? "#" : null;

  // Step 1: Pre-compute partitions for each row type
  // Odd rows (1,3,5,7,9): start at col 0, full width available
  // Even rows (2,4,6,8,10): col 0 is clue, start at col 1, width-1 available
  const oddPartitions = generatePartitions(width).sort(() => Math.random() - 0.5);
  const evenPartitions = generatePartitions(width - 1).sort(() => Math.random() - 0.5);

  // Step 2: Place custom words as forced horizontal entries
  const customPlacements = new Map<number, { word: string; clue: string }>(); // row -> custom word

  for (const cw of customWords) {
    // Find a row where this word fits a partition segment
    for (let r = 1; r < height; r++) {
      if (customPlacements.has(r)) continue;
      const startCol = r % 2 === 0 ? 1 : 0;
      const availCols = width - startCol;
      const partitions = r % 2 === 0 ? evenPartitions : oddPartitions;

      // Find a partition that has a segment matching the custom word length
      for (const p of partitions) {
        if (p.includes(cw.word.length)) {
          customPlacements.set(r, { word: cw.word, clue: cw.clue });
          break;
        }
      }
      if (customPlacements.has(r)) break;
    }
  }

  // Step 3: Fill vertical words from potence top row FIRST
  // This fills the letter cells in row 0 (odd columns) before horizontal fill
  for (let c = 0; c < width; c += 2) {
    const wordCol = c + 1;
    if (wordCol >= width) continue;
    if (grid[0][wordCol] === "#") continue;

    // Vertical word from row 0 downward, but NOT full height.
    // Pick a random length 3-6 so horizontal rows can place clue cells.
    const targetLen = 3 + Math.floor(Math.random() * 4); // 3-6
    const maxLen = Math.min(targetLen, height);
    if (maxLen < 3) continue;

    const candidates = wordList.getByLength(maxLen).map((e) => e.word).filter((w) => !usedWords.has(w));
    if (candidates.length === 0) continue;

    const word = candidates[Math.floor(Math.random() * Math.min(candidates.length, 20))];
    for (let r = 0; r < maxLen; r++) grid[r][wordCol] = word[r];
    // Place clue cell at the end of the vertical word
    if (maxLen < height) grid[maxLen][wordCol] = "#";
    usedWords.add(word);
    placedWords.push({
      word,
      clue: pickClue(word, clueDatabase),
      row: 0,
      col: wordCol,
      direction: "down",
      isCustom: false,
    });
  }

  // Step 4: Fill horizontal rows top to bottom
  const rowState: { partition: number[]; words: { word: string; col: number }[]; partIdx: number }[] = [];

  for (let r = 1; r < height; r++) {
    const startCol = r % 2 === 0 ? 1 : 0;
    const availCols = width - startCol;
    const allPartitions = [...(r % 2 === 0 ? evenPartitions : oddPartitions)];

    // If this row has a custom word, filter partitions to those containing its length
    const custom = customPlacements.get(r);
    let partitions = allPartitions;
    if (custom) {
      partitions = allPartitions.filter((p) => p.includes(custom.word.length));
    }

    // Shuffle for variety
    partitions.sort(() => Math.random() - 0.5);

    let success = false;

    for (let pIdx = 0; pIdx < Math.min(partitions.length, 30); pIdx++) {
      const partition = partitions[pIdx];

      // Check: would this partition's clue cells be adjacent to existing ones?
      if (!isPartitionSafe(r, startCol, partition, grid, height, width)) continue;

      // If custom word, force it into the matching segment
      if (custom) {
        const segIdx = partition.indexOf(custom.word.length);
        if (segIdx >= 0) {
          // Calculate where this segment starts
          let col = startCol;
          for (let s = 0; s < segIdx; s++) {
            col += partition[s] + 1; // +1 for clue cell
          }
          // Place custom word letters
          for (let i = 0; i < custom.word.length; i++) {
            grid[r][col + i] = custom.word[i];
          }
          usedWords.add(custom.word);
        }
      }

      const result = tryFillRow(r, startCol, partition, grid, height, width, wordList, usedWords);

      if (result) {
        // Success! Record the placement
        let col = startCol;
        for (let seg = 0; seg < partition.length; seg++) {
          const w = result[seg];
          const isCustom = custom?.word === w.word;
          placedWords.push({
            word: w.word,
            clue: isCustom ? custom!.clue : pickClue(w.word, clueDatabase),
            row: r,
            col: w.col,
            direction: "right",
            isCustom,
          });
          col += partition[seg];
          if (seg < partition.length - 1) col++; // clue cell
        }

        rowState.push({ partition, words: result, partIdx: pIdx });
        success = true;
        break;
      }

      // Undo custom placement if fill failed
      if (custom) {
        let col = startCol;
        const segIdx = partition.indexOf(custom.word.length);
        for (let s = 0; s < segIdx; s++) col += partition[s] + 1;
        for (let i = 0; i < custom.word.length; i++) {
          grid[r][col + i] = null;
        }
        usedWords.delete(custom.word);
      }

      // Undo the failed row fill
      for (let c = startCol; c < width; c++) {
        if (grid[r][c] !== null && grid[r][c] !== "#") {
          const letter = grid[r][c] as string;
          // Only clear if we placed it (not from potence)
          grid[r][c] = null;
        }
      }
      // Also clear any clue cells we placed in this row
      for (let c = startCol; c < width; c++) {
        if (grid[r][c] === "#" && c > 0) { // don't clear potence
          grid[r][c] = null;
        }
      }
    }

    if (!success) {
      // Fill remaining with a simple fallback
      for (let c = startCol; c < width; c++) {
        if (grid[r][c] === null) grid[r][c] = "#";
      }
    }
  }

  // Step 4: Fill vertical words from potence top row
  // Top row: clue at even col C → vertical word in col C+1 starting at row 0
  for (let c = 0; c < width; c += 2) {
    const wordCol = c + 1;
    if (wordCol >= width) continue;

    // Make sure the cell is available (not already a clue)
    if (grid[0][wordCol] === "#") continue;

    // Find vertical run from row 0
    let endRow = 0;
    while (endRow < height && grid[endRow][wordCol] !== "#") endRow++;
    const len = endRow;
    if (len < 3) continue;
    const cc = wordCol; // rename for clarity below

    // Gather constraints
    const constraints: { pos: number; letter: string }[] = [];
    for (let r = 0; r < len; r++) {
      const cell = grid[r][wordCol];
      if (typeof cell === "string" && cell !== "#") {
        constraints.push({ pos: r, letter: cell });
      }
    }

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

    if (candidates.length > 0) {
      const word = candidates[Math.floor(Math.random() * Math.min(candidates.length, 10))];
      for (let r = 0; r < len; r++) grid[r][wordCol] = word[r];
      usedWords.add(word);
      placedWords.push({
        word,
        clue: pickClue(word, clueDatabase),
        row: 0,
        col: wordCol,
        direction: "down",
        isCustom: false,
      });
    }
  }

  // Step 5: Fill remaining vertical words from interior clue cells
  for (let r = 0; r < height; r++) {
    for (let c = 1; c < width; c++) {
      if (grid[r][c] !== "#") continue;
      if (r + 1 >= height || grid[r + 1][c] === "#") continue;

      // Already has a vertical word?
      const hasDown = placedWords.some(
        (p) => p.direction === "down" && p.col === c && p.row <= r + 1 && p.row + p.word.length > r + 1
      );
      if (hasDown) continue;

      let endRow = r + 1;
      while (endRow < height && grid[endRow][c] !== "#") endRow++;
      const len = endRow - (r + 1);
      if (len < 3) continue;

      const constraints: { pos: number; letter: string }[] = [];
      for (let i = 0; i < len; i++) {
        const cell = grid[r + 1 + i][c];
        if (typeof cell === "string" && cell !== "#") {
          constraints.push({ pos: i, letter: cell });
        }
      }

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

      if (candidates.length > 0) {
        const word = candidates[Math.floor(Math.random() * Math.min(candidates.length, 10))];
        for (let i = 0; i < len; i++) grid[r + 1 + i][c] = word[i];
        usedWords.add(word);
        placedWords.push({
          word,
          clue: pickClue(word, clueDatabase),
          row: r + 1,
          col: c,
          direction: "down",
          isCustom: false,
        });
      }
    }
  }

  // Step 6: Fill any remaining null cells
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (grid[r][c] === null) grid[r][c] = "#";
    }
  }

  // Build output
  const outputCells: FlecheCell[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      if (grid[r][c] === "#") {
        return { type: "clue" as const, clues: [] as ClueInCell[] };
      }
      return { type: "letter" as const, letter: grid[r][c] as string };
    })
  );

  // Assign clues to cells
  const flecheWords: FlecheWord[] = [];

  for (const pw of placedWords) {
    let clueRow = -1;
    let clueCol = -1;

    if (pw.direction === "right") {
      // Look for clue cell to the left
      if (pw.col > 0 && grid[pw.row][pw.col - 1] === "#") {
        clueRow = pw.row;
        clueCol = pw.col - 1;
      }
      // Potence: clue at (row-1, 0) for words starting at col 0
      else if (pw.col === 0 && pw.row > 0 && grid[pw.row - 1][0] === "#") {
        clueRow = pw.row - 1;
        clueCol = 0;
      }
    } else {
      // Look for clue cell above
      if (pw.row > 0 && grid[pw.row - 1][pw.col] === "#") {
        clueRow = pw.row - 1;
        clueCol = pw.col;
      }
      // Potence: clue at (0, col-1) for words starting at row 0
      else if (pw.row === 0 && pw.col > 0 && grid[0][pw.col - 1] === "#") {
        clueRow = 0;
        clueCol = pw.col - 1;
      }
    }

    if (clueRow >= 0 && clueCol >= 0) {
      const cell = outputCells[clueRow][clueCol];
      if (cell.type === "clue" && (cell.clues?.length ?? 0) < 2) {
        cell.clues!.push({
          text: pw.clue,
          direction: pw.direction,
          answerRow: pw.row,
          answerCol: pw.col,
          answerLength: pw.word.length,
          answer: pw.word,
        });
      }
    }

    flecheWords.push({
      answer: pw.word,
      clue: pw.clue,
      direction: pw.direction,
      clueRow,
      clueCol,
      startRow: pw.row,
      startCol: pw.col,
      length: pw.word.length,
      isCustom: pw.isCustom,
    });
  }

  return { width, height, cells: outputCells, words: flecheWords };
}
