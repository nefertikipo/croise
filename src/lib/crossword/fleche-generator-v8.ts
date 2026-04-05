/**
 * Mots fléchés generator v8 — Word-Chain Grid Builder.
 *
 * Builds the grid word-by-word. No pre-made pattern.
 * Clue cells appear WHERE words end. The pattern emerges from the words.
 *
 * 1. Potence (row 0 + col 0 alternating)
 * 2. Vertical seeds from top potence
 * 3. Scan rows for horizontal slots, fill with words
 * 4. Extend verticals from new clue cells
 * 5. Repeat until no unknown cells
 * 6. Validate
 */

import type {
  FlecheCell,
  FlecheGrid,
  FlecheWord,
  FlecheGenerationParams,
  ClueInCell,
} from "@/lib/crossword/fleche-types";
import type { WordList } from "@/lib/crossword/word-list";

type Cell = "#" | string | null; // "#" = clue, string = letter, null = unknown

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

function canPlaceClue(grid: Cell[][], r: number, c: number, height: number, width: number): boolean {
  if (r === 0 || c === 0) return true; // potence exempt
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nc >= 0 && nr < height && nc < width) {
      if (nr === 0 || nc === 0) continue; // potence exempt
      if (grid[nr][nc] === "#") return false;
    }
  }
  return true;
}

/**
 * Find a word matching length and letter constraints.
 */
function findWord(
  wordList: WordList,
  length: number,
  constraints: { pos: number; letter: string }[],
  usedWords: Set<string>,
  limit: number = 20
): string | null {
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
  if (candidates.length === 0) return null;

  // Shuffle and pick
  const idx = Math.floor(Math.random() * Math.min(candidates.length, limit));
  return candidates[idx];
}

/**
 * Get letter constraints from the grid for a slot.
 */
function getConstraints(
  grid: Cell[][],
  row: number,
  col: number,
  direction: "right" | "down",
  length: number
): { pos: number; letter: string }[] {
  const constraints: { pos: number; letter: string }[] = [];
  for (let i = 0; i < length; i++) {
    const r = direction === "right" ? row : row + i;
    const c = direction === "right" ? col + i : col;
    const cell = grid[r]?.[c];
    if (typeof cell === "string" && cell !== "#") {
      constraints.push({ pos: i, letter: cell });
    }
  }
  return constraints;
}

interface PlacedWord {
  word: string;
  row: number;
  col: number;
  direction: "right" | "down";
  isCustom: boolean;
}

function buildGrid(
  width: number,
  height: number,
  wordList: WordList,
  clueDb: Map<string, string[]>,
  customWords: { word: string; clue: string }[]
): { grid: Cell[][]; placed: PlacedWord[] } | null {
  const grid: Cell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );
  const usedWords = new Set<string>();
  const placed: PlacedWord[] = [];

  // Step 1: Potence
  for (let c = 0; c < width; c++) grid[0][c] = c % 2 === 0 ? "#" : null;
  for (let r = 0; r < height; r++) grid[r][0] = r % 2 === 0 ? "#" : null;

  // Step 2: Vertical seeds from top potence
  const customQueue = [...customWords];

  for (let c = 0; c < width; c += 2) {
    const wordCol = c + 1;
    if (wordCol >= width) continue;

    // Pick seed length (3-6, capped by grid height)
    const seedLen = 3 + Math.floor(Math.random() * 4); // 3-6
    const maxLen = Math.min(seedLen, height - 1); // leave room for terminator
    if (maxLen < 3) continue;

    // Try custom word first
    let word: string | null = null;
    let isCustom = false;
    const cwIdx = customQueue.findIndex((cw) => cw.word.length === maxLen);
    if (cwIdx >= 0) {
      word = customQueue[cwIdx].word;
      customQueue.splice(cwIdx, 1);
      isCustom = true;
    }

    if (!word) {
      // Pick random word from word list
      const constraints = getConstraints(grid, 0, wordCol, "down", maxLen);
      word = findWord(wordList, maxLen, constraints, usedWords);
    }

    if (!word) continue;

    // Place vertical word
    for (let i = 0; i < word.length; i++) {
      grid[i][wordCol] = word[i];
    }
    usedWords.add(word);
    placed.push({ word, row: 0, col: wordCol, direction: "down", isCustom });

    // Place terminator clue cell
    const termRow = word.length;
    if (termRow < height) {
      grid[termRow][wordCol] = "#";
    }
  }

  // Steps 3-5: Iterative fill
  let changed = true;
  let iterations = 0;
  const MAX_ITER = 30;

  while (changed && iterations < MAX_ITER) {
    changed = false;
    iterations++;

    // Step 3: Fill horizontal slots in every row
    for (let r = 1; r < height; r++) {
      // Find groups of consecutive non-# cells
      let groupStart = -1;
      for (let c = 0; c <= width; c++) {
        const isEnd = c === width || grid[r][c] === "#";
        const cell = c < width ? grid[r][c] : "#";

        if (!isEnd && groupStart === -1) {
          groupStart = c;
        }

        if (isEnd && groupStart >= 0) {
          const groupLen = c - groupStart;

          if (groupLen >= 3) {
            // Check if this group already has a word placed
            const alreadyFilled = placed.some(
              (p) => p.direction === "right" && p.row === r &&
                p.col >= groupStart && p.col < c
            );

            if (!alreadyFilled) {
              // Check if all cells are filled with letters (from vertical crossings)
              const allFilled = Array.from({ length: groupLen }, (_, i) =>
                typeof grid[r][groupStart + i] === "string" && grid[r][groupStart + i] !== "#"
              ).every(Boolean);

              if (allFilled) {
                // All letters placed by verticals; extract the word
                const existingWord = Array.from({ length: groupLen }, (_, i) =>
                  grid[r][groupStart + i]
                ).join("");

                if (wordList.has(existingWord) && !usedWords.has(existingWord)) {
                  usedWords.add(existingWord);
                  placed.push({ word: existingWord, row: r, col: groupStart, direction: "right", isCustom: false });
                  changed = true;
                }
              } else {
                // Try to find a word that fits
                // Try different lengths (prefer shorter to create more clue cells)
                for (let tryLen = Math.min(groupLen, 7); tryLen >= 3; tryLen--) {
                  const constraints = getConstraints(grid, r, groupStart, "right", tryLen);

                  // Try custom word
                  let word: string | null = null;
                  let isCustom = false;
                  const cwIdx = customQueue.findIndex((cw) => cw.word.length === tryLen);
                  if (cwIdx >= 0) {
                    // Check constraints match
                    const cw = customQueue[cwIdx];
                    let matches = true;
                    for (const con of constraints) {
                      if (cw.word[con.pos] !== con.letter) { matches = false; break; }
                    }
                    if (matches) {
                      word = cw.word;
                      customQueue.splice(cwIdx, 1);
                      isCustom = true;
                    }
                  }

                  if (!word) {
                    word = findWord(wordList, tryLen, constraints, usedWords);
                  }

                  if (word) {
                    // Place the word
                    for (let i = 0; i < word.length; i++) {
                      grid[r][groupStart + i] = word[i];
                    }
                    usedWords.add(word);
                    placed.push({ word, row: r, col: groupStart, direction: "right", isCustom });

                    // Place clue cell after word (if not at group end / grid edge)
                    const afterCol = groupStart + word.length;
                    if (afterCol < c && afterCol < width) {
                      if (canPlaceClue(grid, r, afterCol, height, width)) {
                        grid[r][afterCol] = "#";
                      }
                    }

                    changed = true;
                    break;
                  }
                }
              }
            }
          } else if (groupLen === 1 || groupLen === 2) {
            // Too short for a word — convert to clue cells if possible
            for (let cc = groupStart; cc < c; cc++) {
              if (grid[r][cc] === null) {
                if (canPlaceClue(grid, r, cc, height, width)) {
                  grid[r][cc] = "#";
                  changed = true;
                }
              }
            }
          }

          groupStart = -1;
        }
      }
    }

    // Step 4: Extend verticals from interior clue cells
    for (let r = 0; r < height; r++) {
      for (let c = 1; c < width; c++) {
        if (grid[r][c] !== "#") continue;

        // Look downward for unknown cells
        if (r + 1 >= height) continue;
        if (grid[r + 1][c] === "#") continue;

        // Check if a vertical word already starts here
        const alreadyPlaced = placed.some(
          (p) => p.direction === "down" && p.col === c &&
            p.row === r + 1
        );
        if (alreadyPlaced) continue;

        // Find max vertical run below this clue cell
        let maxLen = 0;
        let rr = r + 1;
        while (rr < height && grid[rr][c] !== "#") { maxLen++; rr++; }
        if (maxLen < 3) continue;

        // Try to place a vertical word
        for (let tryLen = Math.min(maxLen, 7); tryLen >= 3; tryLen--) {
          const constraints = getConstraints(grid, r + 1, c, "down", tryLen);
          const word = findWord(wordList, tryLen, constraints, usedWords);

          if (word) {
            for (let i = 0; i < word.length; i++) {
              grid[r + 1 + i][c] = word[i];
            }
            usedWords.add(word);
            placed.push({ word, row: r + 1, col: c, direction: "down", isCustom: false });

            // Place terminator
            const termRow = r + 1 + word.length;
            if (termRow < height && grid[termRow][c] === null) {
              if (canPlaceClue(grid, termRow, c, height, width)) {
                grid[termRow][c] = "#";
              }
            }

            changed = true;
            break;
          }
        }
      }
    }
  }

  // Step 5: Convert remaining unknown cells to clue cells
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (grid[r][c] === null) {
        grid[r][c] = "#";
      }
    }
  }

  return { grid, placed };
}

export function generateFleche(
  params: FlecheGenerationParams,
  wordList: WordList,
  clueDatabase: Map<string, string[]>
): FlecheGrid {
  const width = params.width ?? 11;
  const height = params.height ?? 17;

  const customWords = (params.customClues ?? [])
    .map((c) => ({
      word: c.answer.toUpperCase().replace(/[^A-Z]/g, ""),
      clue: c.clue,
    }))
    .filter((c) => c.word.length >= 3);

  // Try up to 5 times with different random seeds
  let bestResult: { grid: Cell[][]; placed: PlacedWord[] } | null = null;
  let bestWordCount = 0;

  for (let attempt = 0; attempt < 5; attempt++) {
    const result = buildGrid(width, height, wordList, clueDatabase, customWords);
    if (result && result.placed.length > bestWordCount) {
      bestResult = result;
      bestWordCount = result.placed.length;
    }
  }

  if (!bestResult) {
    return {
      width, height,
      cells: Array.from({ length: height }, () =>
        Array.from({ length: width }, () => ({ type: "empty" as const }))
      ),
      words: [],
    };
  }

  const { grid, placed } = bestResult;

  // Build output cells
  const cells: FlecheCell[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      if (grid[r][c] === "#") {
        return { type: "clue" as const, clues: [] as ClueInCell[] };
      }
      return { type: "letter" as const, letter: grid[r][c] as string };
    })
  );

  // Assign clues
  const customClueMap = new Map(
    customWords.map((cw) => [cw.word, cw.clue])
  );

  const flecheWords: FlecheWord[] = [];

  for (const pw of placed) {
    const clueText = pw.isCustom
      ? (customClueMap.get(pw.word) ?? pickClue(pw.word, clueDatabase))
      : pickClue(pw.word, clueDatabase);

    // Find clue cell
    let clueRow = -1;
    let clueCol = -1;

    if (pw.direction === "right") {
      if (pw.col > 0 && grid[pw.row][pw.col - 1] === "#") {
        clueRow = pw.row;
        clueCol = pw.col - 1;
      } else if (pw.col === 0 && pw.row > 0 && grid[pw.row - 1][0] === "#") {
        clueRow = pw.row - 1;
        clueCol = 0;
      }
    } else {
      if (pw.row > 0 && grid[pw.row - 1][pw.col] === "#") {
        clueRow = pw.row - 1;
        clueCol = pw.col;
      } else if (pw.row === 0 && pw.col > 0 && grid[0][pw.col - 1] === "#") {
        clueRow = 0;
        clueCol = pw.col - 1;
      }
    }

    if (clueRow >= 0 && clueCol >= 0) {
      const cell = cells[clueRow][clueCol];
      if (cell.type === "clue" && (cell.clues?.length ?? 0) < 2) {
        cell.clues!.push({
          text: clueText,
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
      clue: clueText,
      direction: pw.direction,
      clueRow,
      clueCol,
      startRow: pw.row,
      startCol: pw.col,
      length: pw.word.length,
      isCustom: pw.isCustom,
    });
  }

  return { width, height, cells, words: flecheWords };
}
