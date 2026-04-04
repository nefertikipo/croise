/**
 * Mots fléchés generator v5 - word-first, no pre-made pattern.
 *
 * Algorithm:
 * 1. Set up potence (row 0 + col 0 alternating clue/letter)
 * 2. For each potence clue cell, pick a word from the database
 * 3. Fill inward: placed letters constrain crossing words
 * 4. Place clue cells at word boundaries dynamically
 * 5. Repeat until grid is full
 *
 * Every word is guaranteed to exist (picked from DB).
 * Custom words are placed first in the potence.
 */

import type {
  FlecheCell,
  FlecheGrid,
  FlecheWord,
  FlecheGenerationParams,
  ClueInCell,
} from "@/lib/crossword/fleche-types";
import type { WordList } from "@/lib/crossword/word-list";

type CellState = "empty" | "letter" | "clue";

interface GridState {
  width: number;
  height: number;
  cells: CellState[][];
  letters: (string | null)[][];
  words: PlacedWord[];
  usedWords: Set<string>;
}

interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "right" | "down";
  isCustom: boolean;
}

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
 * Find words from the word list matching length and letter constraints.
 */
function findMatchingWords(
  wordList: WordList,
  length: number,
  constraints: { pos: number; letter: string }[],
  usedWords: Set<string>,
  limit: number = 50
): string[] {
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

  // Shuffle with some randomness
  return candidates
    .map((w) => ({ w, s: Math.random() }))
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map((x) => x.w);
}

/**
 * Get letter constraints at a position range from the grid.
 */
function getConstraints(
  grid: GridState,
  row: number,
  col: number,
  direction: "right" | "down",
  length: number
): { pos: number; letter: string }[] {
  const constraints: { pos: number; letter: string }[] = [];
  for (let i = 0; i < length; i++) {
    const r = direction === "right" ? row : row + i;
    const c = direction === "right" ? col + i : col;
    if (r >= grid.height || c >= grid.width) return [];
    if (grid.cells[r][c] === "clue") return []; // blocked by clue cell
    const letter = grid.letters[r][c];
    if (letter) constraints.push({ pos: i, letter });
  }
  return constraints;
}

/**
 * Check how far we can go in a direction before hitting edge or clue cell.
 */
function maxRunLength(
  grid: GridState,
  row: number,
  col: number,
  direction: "right" | "down"
): number {
  let len = 0;
  let r = row;
  let c = col;
  while (r < grid.height && c < grid.width && grid.cells[r][c] !== "clue") {
    len++;
    if (direction === "right") c++;
    else r++;
  }
  return len;
}

/**
 * Place a word on the grid.
 */
function placeWord(
  grid: GridState,
  word: string,
  clue: string,
  row: number,
  col: number,
  direction: "right" | "down",
  isCustom: boolean
): boolean {
  // Verify placement is valid
  for (let i = 0; i < word.length; i++) {
    const r = direction === "right" ? row : row + i;
    const c = direction === "right" ? col + i : col;
    if (r >= grid.height || c >= grid.width) return false;
    if (grid.cells[r][c] === "clue") return false;
    const existing = grid.letters[r][c];
    if (existing && existing !== word[i]) return false;
  }

  // Place it
  for (let i = 0; i < word.length; i++) {
    const r = direction === "right" ? row : row + i;
    const c = direction === "right" ? col + i : col;
    grid.cells[r][c] = "letter";
    grid.letters[r][c] = word[i];
  }

  grid.usedWords.add(word);
  grid.words.push({ word, clue, row, col, direction, isCustom });
  return true;
}

/**
 * Place a clue cell, marking it in the grid.
 * Interior clue cells must not be adjacent to other clue cells
 * (except in the potence: row 0 or col 0).
 */
function placeClue(grid: GridState, row: number, col: number): boolean {
  if (row < 0 || row >= grid.height || col < 0 || col >= grid.width) return false;
  if (grid.cells[row][col] === "letter") return false; // don't overwrite letters

  // In the potence (row 0 or col 0), always allow
  const inPotence = row === 0 || col === 0;

  if (!inPotence) {
    // Check no adjacent clue cells (up, down, left, right)
    const neighbors = [
      [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr >= grid.height || nc < 0 || nc >= grid.width) continue;
      // Allow adjacency with potence cells
      if (nr === 0 || nc === 0) continue;
      if (grid.cells[nr][nc] === "clue") return false;
    }
  }

  grid.cells[row][col] = "clue";
  grid.letters[row][col] = null;
  return true;
}

/**
 * Try to fill a horizontal slot starting at (row, col) going right.
 * Returns true if a word was placed.
 */
function fillHorizontal(
  grid: GridState,
  row: number,
  col: number,
  wordList: WordList,
  clueDb: Map<string, string[]>,
  preferredLengths?: number[]
): boolean {
  const maxLen = maxRunLength(grid, row, col, "right");
  if (maxLen < 3) return false;

  // Try different lengths, preferring variety
  const lengths = preferredLengths
    ?? [3, 4, 5, 6, 7].filter((l) => l <= maxLen).sort(() => Math.random() - 0.5);

  for (const len of lengths) {
    if (len > maxLen) continue;

    const constraints = getConstraints(grid, row, col, "right", len);
    if (constraints.length < 0) continue; // blocked

    const words = findMatchingWords(wordList, len, constraints, grid.usedWords, 20);
    if (words.length === 0) continue;

    const word = words[0];
    const clue = pickClue(word, clueDb);

    if (placeWord(grid, word, clue, row, col, "right", false)) {
      // Place clue cell at the end of the word (if not at grid edge)
      const endCol = col + len;
      if (endCol < grid.width && grid.cells[row][endCol] === "empty") {
        placeClue(grid, row, endCol);
      }
      return true;
    }
  }
  return false;
}

/**
 * Try to fill a vertical slot starting at (row, col) going down.
 */
function fillVertical(
  grid: GridState,
  row: number,
  col: number,
  wordList: WordList,
  clueDb: Map<string, string[]>,
  preferredLengths?: number[]
): boolean {
  const maxLen = maxRunLength(grid, row, col, "down");
  if (maxLen < 3) return false;

  const lengths = preferredLengths
    ?? [3, 4, 5, 6, 7].filter((l) => l <= maxLen).sort(() => Math.random() - 0.5);

  for (const len of lengths) {
    if (len > maxLen) continue;

    const constraints = getConstraints(grid, row, col, "down", len);
    if (constraints.length < 0) continue;

    const words = findMatchingWords(wordList, len, constraints, grid.usedWords, 20);
    if (words.length === 0) continue;

    const word = words[0];
    const clue = pickClue(word, clueDb);

    if (placeWord(grid, word, clue, row, col, "down", false)) {
      const endRow = row + len;
      if (endRow < grid.height && grid.cells[endRow][col] === "empty") {
        placeClue(grid, endRow, col);
      }
      return true;
    }
  }
  return false;
}

/**
 * Main generation function.
 */
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

  // Initialize grid
  const grid: GridState = {
    width,
    height,
    cells: Array.from({ length: height }, () =>
      Array.from({ length: width }, () => "empty" as CellState)
    ),
    letters: Array.from({ length: height }, () =>
      Array.from({ length: width }, () => null as string | null)
    ),
    words: [],
    usedWords: new Set<string>(),
  };

  // Step 1: Set up potence
  // Row 0: alternating clue/letter
  for (let c = 0; c < width; c++) {
    grid.cells[0][c] = c % 2 === 0 ? "clue" : "empty";
  }
  // Col 0: alternating clue/letter
  for (let r = 0; r < height; r++) {
    grid.cells[r][0] = r % 2 === 0 ? "clue" : "empty";
  }

  // Step 2: Place custom words first
  // Try to fit them as potence entry words
  const customQueue = [...customWords];

  // Place custom words as horizontal entries from left column clue cells
  // Clue at row R → word on row R+1 starting at col 0
  for (let r = 0; r < height && customQueue.length > 0; r += 2) {
    if (grid.cells[r][0] !== "clue") continue;
    const wordRow = r + 1;
    if (wordRow >= height) continue;

    const cw = customQueue.find((c) => c.word.length <= width);
    if (!cw) continue;
    if (cw.word.length > width) continue;

    if (placeWord(grid, cw.word, cw.clue, wordRow, 0, "right", true)) {
      customQueue.splice(customQueue.indexOf(cw), 1);
      const endCol = cw.word.length;
      if (endCol < width && grid.cells[wordRow][endCol] === "empty") {
        placeClue(grid, wordRow, endCol);
      }
    }
  }

  // Step 3: Fill potence entry words
  // Left column: each clue cell at row R defines a horizontal word on row R+1
  // The word starts at col 0 (the letter cell in the potence)
  for (let r = 0; r < height; r += 2) {
    if (grid.cells[r][0] !== "clue") continue;
    const wordRow = r + 1;
    if (wordRow >= height) continue;

    // Skip if already filled (custom word)
    if (grid.cells[wordRow][0] === "letter") continue;

    fillHorizontal(grid, wordRow, 0, wordList, clueDatabase);
  }

  // Top row: each clue cell at col C defines a vertical word in col C+1
  // The word starts at row 0 (the letter cell in the potence)
  for (let c = 0; c < width; c += 2) {
    if (grid.cells[0][c] !== "clue") continue;
    const wordCol = c + 1;
    if (wordCol >= width) continue;

    if (grid.cells[0][wordCol] === "clue") continue;

    fillVertical(grid, 0, wordCol, wordList, clueDatabase);
  }

  // Step 4: Fill the interior
  // Scan for unfilled regions and place words + clue cells
  let passes = 0;
  const MAX_PASSES = 20;

  while (passes < MAX_PASSES) {
    passes++;
    let placed = false;

    // Find clue cells that can spawn new words
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (grid.cells[r][c] !== "clue") continue;

        // Try right
        if (c + 1 < width && grid.cells[r][c + 1] !== "clue") {
          const hasWord = grid.words.some(
            (w) => w.direction === "right" && w.row === r && w.col === c + 1
          );
          if (!hasWord) {
            if (fillHorizontal(grid, r, c + 1, wordList, clueDatabase)) {
              placed = true;
            }
          }
        }

        // Try down
        if (r + 1 < height && grid.cells[r + 1][c] !== "clue") {
          const hasWord = grid.words.some(
            (w) => w.direction === "down" && w.row === r + 1 && w.col === c
          );
          if (!hasWord) {
            if (fillVertical(grid, r + 1, c, wordList, clueDatabase)) {
              placed = true;
            }
          }
        }
      }
    }

    // Also scan for empty cells that could start new word regions
    for (let r = 1; r < height; r++) {
      for (let c = 1; c < width; c++) {
        if (grid.cells[r][c] !== "empty") continue;

        // Check if this empty cell has a letter neighbor (can be crossed)
        const hasLetterAbove = r > 0 && grid.cells[r - 1][c] === "letter";
        const hasLetterLeft = c > 0 && grid.cells[r][c - 1] === "letter";

        if (hasLetterAbove || hasLetterLeft) {
          // Try to place a clue cell here and start a word
          // Place clue cell, then fill from it
          if (grid.cells[r][c] === "empty") {
            placeClue(grid, r, c);

            let ok = false;
            if (c + 1 < width && grid.cells[r][c + 1] !== "clue") {
              ok = fillHorizontal(grid, r, c + 1, wordList, clueDatabase) || ok;
            }
            if (r + 1 < height && grid.cells[r + 1][c] !== "clue") {
              ok = fillVertical(grid, r + 1, c, wordList, clueDatabase) || ok;
            }

            if (ok) {
              placed = true;
            } else {
              // Undo: convert back to empty (no word could start here)
              grid.cells[r][c] = "empty";
            }
          }
        }
      }
    }

    if (!placed) break;
  }

  // Step 5: Convert remaining empty cells
  // Try to place as clue cells (respecting no-adjacent rule)
  // If can't, leave as letter with "?" (will need fixing)
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (grid.cells[r][c] === "empty") {
        if (!placeClue(grid, r, c)) {
          // Can't place clue here (would be adjacent to another)
          // Mark as letter - will show as unfilled
          grid.cells[r][c] = "letter";
          grid.letters[r][c] = "?";
        }
      }
    }
  }

  // Step 6: Build output
  const outputCells: FlecheCell[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      if (grid.cells[r][c] === "clue") {
        return { type: "clue" as const, clues: [] as ClueInCell[] };
      }
      return { type: "letter" as const, letter: grid.letters[r][c] ?? "?" };
    })
  );

  const flecheWords: FlecheWord[] = [];

  for (const pw of grid.words) {
    // Find the clue cell for this word
    let clueRow = -1;
    let clueCol = -1;

    if (pw.direction === "right") {
      // Look left for a clue cell
      if (pw.col > 0 && grid.cells[pw.row][pw.col - 1] === "clue") {
        clueRow = pw.row;
        clueCol = pw.col - 1;
      } else if (pw.row > 0 && grid.cells[pw.row - 1][pw.col - 1] === "clue") {
        clueRow = pw.row - 1;
        clueCol = pw.col - 1;
      }
    } else {
      // Look above for a clue cell
      if (pw.row > 0 && grid.cells[pw.row - 1][pw.col] === "clue") {
        clueRow = pw.row - 1;
        clueCol = pw.col;
      } else if (pw.col > 0 && grid.cells[pw.row - 1]?.[pw.col - 1] === "clue") {
        clueRow = pw.row - 1;
        clueCol = pw.col - 1;
      }
    }

    // Assign to clue cell (max 2 per cell)
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
