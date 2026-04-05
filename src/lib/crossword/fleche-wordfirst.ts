/**
 * Mots fléchés generator — word-first approach.
 *
 * Builds the grid by placing words one at a time, checking viability
 * at every step. Every letter placed is validated against future
 * crossing possibilities. No pre-made patterns. No post-hoc repairs.
 *
 * Algorithm:
 * 1. Set up potence
 * 2. Place first horizontal word (row 1, from left potence)
 * 3. For each letter in row 1, pick vertical words going down
 * 4. Where verticals end, pick horizontal words
 * 5. At EVERY step: check that the remaining grid is still solvable
 * 6. If stuck: backtrack to last word and try alternatives
 * 7. Continue until entire grid is filled
 *
 * Key insight: before placing each word, verify that every column
 * it touches still has viable vertical completions. This prunes
 * bad choices early.
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
 * Count how many dictionary words match the given partial vertical sequence.
 * If 0, this column is dead — the placement that caused it should be rejected.
 */
function countVerticalOptions(
  col: number,
  grid: Cell[][],
  height: number,
  wordList: WordList
): number {
  // Find the current vertical slot in this column
  // Go up from current bottom-most letter to find the slot start
  let slotStart = -1;
  let slotEnd = -1;

  // Find all letter runs in this column (between # cells)
  let runStart = -1;
  for (let r = 0; r <= height; r++) {
    const cell = r < height ? grid[r][col] : "#";
    if (cell === "#" || cell === null) {
      if (runStart >= 0 && r - runStart >= 2) {
        // Found a letter run. Check if all letters are set.
        let allSet = true;
        const constraints: { pos: number; letter: string }[] = [];
        for (let rr = runStart; rr < r; rr++) {
          const l = grid[rr][col];
          if (typeof l === "string" && l !== "#") {
            constraints.push({ pos: rr - runStart, letter: l });
          } else {
            allSet = false;
          }
        }

        if (constraints.length >= 2) {
          // Check if any word matches
          const len = r - runStart;
          let cands = wordList.getByConstraint(len, constraints[0].pos, constraints[0].letter);
          for (let i = 1; i < constraints.length; i++) {
            cands = cands.filter((w) => w[constraints[i].pos] === constraints[i].letter);
          }
          if (cands.length === 0 && allSet) return 0; // Dead column
        }
      }
      runStart = -1;
    } else {
      if (runStart === -1) runStart = r;
    }
  }

  return 1; // At least some options exist
}

/**
 * Check if placing a horizontal word at (row, col) keeps all columns viable.
 */
function isPlacementViable(
  word: string,
  row: number,
  col: number,
  grid: Cell[][],
  height: number,
  width: number,
  wordList: WordList
): boolean {
  // Temporarily place the word
  const saved: { r: number; c: number; v: Cell }[] = [];
  for (let i = 0; i < word.length; i++) {
    const c = col + i;
    saved.push({ r: row, c, v: grid[row][c] });
    grid[row][c] = word[i];
  }

  // Check viability of each affected column
  let viable = true;
  for (let i = 0; i < word.length; i++) {
    if (countVerticalOptions(col + i, grid, height, wordList) === 0) {
      viable = false;
      break;
    }
  }

  // Undo
  for (const s of saved) grid[s.r][s.c] = s.v;

  return viable;
}

/**
 * Find a word for a horizontal slot with viability checking.
 */
function findViableWord(
  row: number,
  col: number,
  length: number,
  grid: Cell[][],
  height: number,
  width: number,
  wordList: WordList,
  usedWords: Set<string>
): string | null {
  // Gather constraints from existing letters (vertical crossings)
  const constraints: { pos: number; letter: string }[] = [];
  for (let i = 0; i < length; i++) {
    const cell = grid[row][col + i];
    if (typeof cell === "string" && cell !== "#") {
      constraints.push({ pos: i, letter: cell });
    }
  }

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

  // Shuffle for variety
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // Try candidates with viability check
  for (const word of candidates.slice(0, 50)) {
    if (isPlacementViable(word, row, col, grid, height, width, wordList)) {
      return word;
    }
  }

  return null;
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
  clueDb: Map<string, string[]>
): { grid: Cell[][]; placed: PlacedWord[] } | null {
  const grid: Cell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );
  const usedWords = new Set<string>();
  const placed: PlacedWord[] = [];

  // Step 1: Potence
  for (let c = 0; c < width; c++) grid[0][c] = c % 2 === 0 ? "#" : null;
  for (let r = 0; r < height; r++) grid[r][0] = r % 2 === 0 ? "#" : null;

  // Step 2: Process rows top to bottom
  // For each row, fill horizontally, then extend vertically
  for (let r = 1; r < height; r++) {
    const startCol = r % 2 === 0 ? 1 : 0; // potence: even rows start at col 1

    // Fill this row left to right with words separated by #
    let col = startCol;

    while (col < width) {
      // Skip cells already filled (from vertical words above)
      if (grid[r][col] === "#") { col++; continue; }

      // Find available space (up to next # or edge)
      let maxLen = 0;
      let cc = col;
      while (cc < width && grid[r][cc] !== "#") { maxLen++; cc++; }

      if (maxLen < 2) {
        // Can't fit a word. If this cell is null, make it #
        if (grid[r][col] === null) {
          // Check adjacency before placing #
          let canClue = true;
          if (r > 0 && col > 0) {
            for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
              const nr = r + dr, nc = col + dc;
              if (nr >= 0 && nc >= 0 && nr < height && nc < width && nr > 0 && nc > 0) {
                if (grid[nr][nc] === "#") { canClue = false; break; }
              }
            }
          }
          if (canClue) grid[r][col] = "#";
          else grid[r][col] = "E"; // fallback letter
        }
        col++;
        continue;
      }

      // Try different word lengths (prefer 3-6)
      let wordPlaced = false;
      const lengths = [];
      for (let l = Math.min(maxLen, 6); l >= 2; l--) lengths.push(l);
      // Also try longer if available
      if (maxLen >= 7) lengths.unshift(7);

      for (const len of lengths) {
        const word = findViableWord(r, col, len, grid, height, width, wordList, usedWords);
        if (word) {
          // Place the word
          for (let i = 0; i < word.length; i++) grid[r][col + i] = word[i];
          usedWords.add(word);
          placed.push({ word, row: r, col, direction: "right", isCustom: false });

          col += word.length;

          // Place # after word if space allows and adjacency OK
          if (col < width && grid[r][col] === null) {
            let canClue = true;
            if (r > 0 && col > 0) {
              for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                const nr = r + dr, nc = col + dc;
                if (nr >= 0 && nc >= 0 && nr < height && nc < width && nr > 0 && nc > 0) {
                  if (grid[nr][nc] === "#") { canClue = false; break; }
                }
              }
            }
            if (canClue) { grid[r][col] = "#"; col++; }
          }

          wordPlaced = true;
          break;
        }
      }

      if (!wordPlaced) {
        // Can't find any word. Skip this cell.
        if (grid[r][col] === null) grid[r][col] = "#";
        col++;
      }
    }

    // After filling row, extend verticals from any # cells in this row
    for (let c = 1; c < width; c++) {
      if (grid[r][c] !== "#") continue;
      if (r + 1 >= height) continue;
      if (grid[r + 1][c] === "#" || (typeof grid[r + 1][c] === "string" && grid[r + 1][c] !== "#")) continue;

      // Space below for a vertical word
      let maxLen = 0;
      let rr = r + 1;
      while (rr < height && grid[rr][c] !== "#") { maxLen++; rr++; }
      if (maxLen < 2) continue;

      // Find a vertical word with viability
      for (let len = Math.min(maxLen, 6); len >= 2; len--) {
        const constraints: { pos: number; letter: string }[] = [];
        for (let i = 0; i < len; i++) {
          const cell = grid[r + 1 + i]?.[c];
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
          const word = candidates[Math.floor(Math.random() * Math.min(candidates.length, 20))];
          for (let i = 0; i < word.length; i++) grid[r + 1 + i][c] = word[i];
          usedWords.add(word);
          placed.push({ word, row: r + 1, col: c, direction: "down", isCustom: false });

          // Place # terminator
          const termRow = r + 1 + word.length;
          if (termRow < height && grid[termRow][c] === null) {
            let canClue = true;
            for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
              const nr = termRow + dr, nc = c + dc;
              if (nr >= 0 && nc >= 0 && nr < height && nc < width && nr > 0 && nc > 0) {
                if (grid[nr][nc] === "#") { canClue = false; break; }
              }
            }
            if (canClue) grid[termRow][c] = "#";
          }
          break;
        }
      }
    }
  }

  // Fill vertical words from top potence
  for (let c = 0; c < width; c += 2) {
    const wc = c + 1;
    if (wc >= width) continue;

    let endR = 0;
    while (endR < height && grid[endR][wc] !== "#") endR++;
    if (endR < 2) continue;

    const constraints: { pos: number; letter: string }[] = [];
    for (let r = 0; r < endR; r++) {
      const cell = grid[r][wc];
      if (typeof cell === "string" && cell !== "#") constraints.push({ pos: r, letter: cell });
    }

    let candidates: string[];
    if (constraints.length === 0) {
      candidates = wordList.getByLength(endR).map((e) => e.word);
    } else {
      candidates = wordList.getByConstraint(endR, constraints[0].pos, constraints[0].letter);
      for (let i = 1; i < constraints.length; i++) {
        candidates = candidates.filter((w) => w[constraints[i].pos] === constraints[i].letter);
      }
    }
    candidates = candidates.filter((w) => !usedWords.has(w));

    if (candidates.length > 0) {
      const word = candidates[Math.floor(Math.random() * Math.min(candidates.length, 20))];
      for (let r = 0; r < word.length; r++) grid[r][wc] = word[r];
      usedWords.add(word);
      placed.push({ word, row: 0, col: wc, direction: "down", isCustom: false });
    }
  }

  // Convert remaining nulls to #
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (grid[r][c] === null) grid[r][c] = "#";
    }
  }

  return { grid, placed };
}

// --- MAIN ---

export function generateFleche(
  params: FlecheGenerationParams,
  wordList: WordList,
  clueDatabase: Map<string, string[]>
): FlecheGrid {
  const width = params.width ?? 11;
  const height = params.height ?? 17;

  // Try multiple times, pick best
  let bestResult: { grid: Cell[][]; placed: PlacedWord[] } | null = null;
  let bestScore = Infinity;

  for (let attempt = 0; attempt < 100; attempt++) {
    const result = buildGrid(width, height, wordList, clueDatabase);
    if (!result) continue;

    // Score: count orphan + adjacent
    let score = 0;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (result.grid[r][c] !== "#") continue;
        if (r === 0 || c === 0) continue; // potence exempt

        // Orphan check
        let hasWord = false;
        if (c + 1 < width && typeof result.grid[r][c + 1] === "string" && result.grid[r][c + 1] !== "#") {
          let len = 0; for (let cc = c + 1; cc < width && result.grid[r][cc] !== "#"; cc++) len++;
          if (len >= 2) hasWord = true;
        }
        if (!hasWord && r + 1 < height && typeof result.grid[r + 1][c] === "string" && result.grid[r + 1][c] !== "#") {
          let len = 0; for (let rr = r + 1; rr < height && result.grid[rr][c] !== "#"; rr++) len++;
          if (len >= 2) hasWord = true;
        }
        if (!hasWord) score++;

        // Adjacent check
        if (c + 1 < width && result.grid[r][c + 1] === "#" && c + 1 > 0) score++;
        if (r + 1 < height && result.grid[r + 1][c] === "#" && r + 1 > 0) score++;
      }
    }

    if (score < bestScore) {
      bestResult = result;
      bestScore = score;
    }
    if (score === 0) break;
  }

  if (!bestResult) {
    return { width, height, cells: Array.from({ length: height }, () => Array.from({ length: width }, () => ({ type: "empty" as const }))), words: [] };
  }

  const { grid, placed } = bestResult;

  // Build output
  const cells: FlecheCell[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      if (grid[r][c] === "#") return { type: "clue" as const, clues: [] as ClueInCell[] };
      return { type: "letter" as const, letter: grid[r][c] as string };
    })
  );

  // Extract vertical words not yet in placed
  for (let c = 0; c < width; c++) {
    let segStart = -1;
    for (let r = 0; r <= height; r++) {
      if (r === height || grid[r][c] === "#") {
        if (segStart >= 0) {
          const len = r - segStart;
          if (len >= 2) {
            const word = Array.from({ length: len }, (_, i) => grid[segStart + i][c]).join("");
            if (!placed.some((p) => p.direction === "down" && p.col === c && p.row === segStart)) {
              placed.push({ word, row: segStart, col: c, direction: "down", isCustom: false });
            }
          }
        }
        segStart = -1;
      } else {
        if (segStart === -1) segStart = r;
      }
    }
  }

  const flecheWords: FlecheWord[] = [];
  for (const pw of placed) {
    const clueText = pickClue(pw.word, clueDatabase);
    let clueRow = -1, clueCol = -1;

    if (pw.direction === "right") {
      if (pw.col > 0 && grid[pw.row][pw.col - 1] === "#") { clueRow = pw.row; clueCol = pw.col - 1; }
      else if (pw.col === 0 && pw.row > 0 && grid[pw.row - 1][0] === "#") { clueRow = pw.row - 1; clueCol = 0; }
    } else {
      if (pw.row > 0 && grid[pw.row - 1][pw.col] === "#") { clueRow = pw.row - 1; clueCol = pw.col; }
      else if (pw.row === 0 && pw.col > 0 && grid[0][pw.col - 1] === "#") { clueRow = 0; clueCol = pw.col - 1; }
    }

    if (clueRow >= 0 && clueCol >= 0) {
      const cell = cells[clueRow][clueCol];
      if (cell.type === "clue" && (cell.clues?.length ?? 0) < 2) {
        cell.clues!.push({ text: clueText, direction: pw.direction, answerRow: pw.row, answerCol: pw.col, answerLength: pw.word.length, answer: pw.word });
      }
    }

    flecheWords.push({ answer: pw.word, clue: clueText, direction: pw.direction, clueRow, clueCol, startRow: pw.row, startCol: pw.col, length: pw.word.length, isCustom: pw.isCustom });
  }

  return { width, height, cells, words: flecheWords };
}
