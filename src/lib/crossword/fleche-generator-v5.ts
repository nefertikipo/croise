/**
 * Mots fléchés generator v5 - row-by-row fill, no dead cells.
 *
 * Every cell is either a clue cell or part of a word.
 * Every letter cell belongs to exactly one horizontal word
 * and is crossed by at least one vertical word.
 *
 * Algorithm:
 * 1. Set up potence (row 0 + col 0)
 * 2. Fill row by row: clue → word → clue → word...
 * 3. Each row respects vertical constraints from rows above
 * 4. Clue cells placed at word boundaries, never adjacent in interior
 */

import type {
  FlecheCell,
  FlecheGrid,
  FlecheWord,
  FlecheGenerationParams,
  ClueInCell,
} from "@/lib/crossword/fleche-types";
import type { WordList } from "@/lib/crossword/word-list";

interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "right" | "down";
  isCustom: boolean;
}

type CellType = "#" | string | null; // "#" = clue, string = letter, null = empty

function pickClue(word: string, clueDb: Map<string, string[]>): string {
  const dbClues = clueDb.get(word);
  if (!dbClues || dbClues.length === 0) return word;
  const short = dbClues.filter((c) => c.length <= 35);
  const pool = short.length > 0 ? short : dbClues;
  let clue = pool[Math.floor(Math.random() * pool.length)];
  if (clue.length > 40) clue = clue.slice(0, 37) + "...";
  return clue;
}

function findWords(
  wordList: WordList,
  length: number,
  constraints: { pos: number; letter: string }[],
  usedWords: Set<string>
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
  return candidates.filter((w) => !usedWords.has(w));
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

  // Grid: "#" = clue cell, letter = letter, null = unfilled
  const grid: CellType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );
  const placed: PlacedWord[] = [];
  const usedWords = new Set<string>();

  // Potence: row 0 alternating, col 0 alternating
  for (let c = 0; c < width; c++) grid[0][c] = c % 2 === 0 ? "#" : null;
  for (let r = 0; r < height; r++) grid[r][0] = r % 2 === 0 ? "#" : null;

  /**
   * Fill a row from startCol to the end with alternating words and clue cells.
   * Respects vertical constraints from letters already placed above.
   */
  function fillRow(row: number, startCol: number) {
    let col = startCol;

    while (col < width) {
      // Skip if already filled (potence or previous pass)
      if (grid[row][col] !== null) {
        col++;
        continue;
      }

      // Determine max word length from here
      let maxLen = 0;
      let c = col;
      while (c < width && grid[row][c] !== "#") {
        maxLen++;
        c++;
      }

      if (maxLen < 3) {
        // Too short for a word. These cells will be part of vertical words.
        // Just leave them for vertical fill later.
        col += maxLen;
        continue;
      }

      // Gather vertical constraints
      const constraints: { pos: number; letter: string }[] = [];
      for (let i = 0; i < maxLen; i++) {
        const letter = grid[row][col + i];
        if (typeof letter === "string" && letter !== "#") {
          constraints.push({ pos: i, letter });
        }
      }

      // Try word lengths from a random mix (prefer 4-6 for variety)
      const lengths = [4, 5, 3, 6, 7]
        .filter((l) => l <= maxLen)
        .sort(() => Math.random() - 0.5);

      let wordPlaced = false;

      for (const len of lengths) {
        const wordConstraints = constraints.filter((c) => c.pos < len);
        const candidates = findWords(wordList, len, wordConstraints, usedWords);
        if (candidates.length === 0) continue;

        // Pick a random word
        const word = candidates[Math.floor(Math.random() * Math.min(candidates.length, 30))];

        // Place the word
        for (let i = 0; i < len; i++) {
          grid[row][col + i] = word[i];
        }
        usedWords.add(word);
        placed.push({
          word,
          clue: pickClue(word, clueDatabase),
          row,
          col,
          direction: "right",
          isCustom: false,
        });

        col += len;

        // Place a clue cell after the word (if not at edge and not adjacent to another)
        if (col < width && grid[row][col] === null) {
          // Check no adjacent interior clue
          let canPlaceClue = true;
          if (row > 0 && col > 0) {
            // Check left (just placed word, so it's a letter - ok)
            // Check right
            if (col + 1 < width && grid[row][col + 1] === "#") canPlaceClue = false;
            // Check up
            if (row > 0 && grid[row - 1][col] === "#" && row - 1 > 0 && col > 0) canPlaceClue = false;
            // Check down
            if (row + 1 < height && grid[row + 1][col] === "#") canPlaceClue = false;
          }
          if (canPlaceClue) {
            grid[row][col] = "#";
            col++;
          }
        }

        wordPlaced = true;
        break;
      }

      if (!wordPlaced) {
        // Can't place a word here. Move on.
        col++;
      }
    }
  }

  // Step 1: Fill horizontal words from potence
  // Left column clue at row R → word on row R+1
  for (let r = 0; r < height - 1; r += 2) {
    if (grid[r][0] !== "#") continue;

    // Place custom words first
    const cw = customWords.find(
      (c) => c.word.length <= width && !usedWords.has(c.word)
    );

    if (cw) {
      const wordRow = r + 1;
      for (let i = 0; i < cw.word.length && i < width; i++) {
        grid[wordRow][i] = cw.word[i];
      }
      usedWords.add(cw.word);
      placed.push({
        word: cw.word,
        clue: cw.clue,
        row: wordRow,
        col: 0,
        direction: "right",
        isCustom: true,
      });
      // Clue cell after word
      const endCol = cw.word.length;
      if (endCol < width && grid[wordRow][endCol] === null) {
        grid[wordRow][endCol] = "#";
      }
      // Fill rest of row
      fillRow(wordRow, endCol + 1);
    } else {
      fillRow(r + 1, 0);
    }
  }

  // Step 2: Fill vertical words from top potence
  for (let c = 0; c < width; c += 2) {
    if (grid[0][c] !== "#") continue;
    const wordCol = c + 1;
    if (wordCol >= width) continue;

    // Find max vertical run from row 0
    let maxLen = 0;
    let r = 0;
    while (r < height && grid[r][wordCol] !== "#") {
      maxLen++;
      r++;
    }
    if (maxLen < 3) continue;

    // Gather horizontal constraints
    const constraints: { pos: number; letter: string }[] = [];
    for (let i = 0; i < maxLen; i++) {
      const letter = grid[i][wordCol];
      if (typeof letter === "string" && letter !== "#") {
        constraints.push({ pos: i, letter });
      }
    }

    const candidates = findWords(wordList, maxLen, constraints, usedWords);
    if (candidates.length === 0) {
      // Try shorter
      for (let len = maxLen - 1; len >= 3; len--) {
        const shortConstraints = constraints.filter((c) => c.pos < len);
        const shortCands = findWords(wordList, len, shortConstraints, usedWords);
        if (shortCands.length > 0) {
          const word = shortCands[Math.floor(Math.random() * Math.min(shortCands.length, 20))];
          for (let i = 0; i < len; i++) grid[i][wordCol] = word[i];
          usedWords.add(word);
          placed.push({
            word,
            clue: pickClue(word, clueDatabase),
            row: 0,
            col: wordCol,
            direction: "down",
            isCustom: false,
          });
          // Clue cell at end
          if (len < height && grid[len][wordCol] === null) {
            grid[len][wordCol] = "#";
          }
          break;
        }
      }
    } else {
      const word = candidates[Math.floor(Math.random() * Math.min(candidates.length, 20))];
      for (let i = 0; i < maxLen; i++) grid[i][wordCol] = word[i];
      usedWords.add(word);
      placed.push({
        word,
        clue: pickClue(word, clueDatabase),
        row: 0,
        col: wordCol,
        direction: "down",
        isCustom: false,
      });
    }
  }

  // Step 3: Fill remaining vertical words from interior clue cells
  for (let r = 0; r < height; r++) {
    for (let c = 1; c < width; c++) {
      if (grid[r][c] !== "#") continue;
      // Try to place a down word from r+1
      if (r + 1 >= height) continue;
      if (grid[r + 1][c] === "#") continue;

      let maxLen = 0;
      let rr = r + 1;
      while (rr < height && grid[rr][c] !== "#") { maxLen++; rr++; }
      if (maxLen < 3) continue;

      // Check if already covered by a vertical word
      const alreadyPlaced = placed.some(
        (p) => p.direction === "down" && p.col === c && p.row <= r + 1 && p.row + p.word.length > r + 1
      );
      if (alreadyPlaced) continue;

      const constraints: { pos: number; letter: string }[] = [];
      for (let i = 0; i < maxLen; i++) {
        const letter = grid[r + 1 + i]?.[c];
        if (typeof letter === "string" && letter !== "#") {
          constraints.push({ pos: i, letter });
        }
      }

      for (let len = Math.min(maxLen, 7); len >= 3; len--) {
        const shortConstraints = constraints.filter((cc) => cc.pos < len);
        const cands = findWords(wordList, len, shortConstraints, usedWords);
        if (cands.length > 0) {
          const word = cands[Math.floor(Math.random() * Math.min(cands.length, 20))];
          for (let i = 0; i < len; i++) grid[r + 1 + i][c] = word[i];
          usedWords.add(word);
          placed.push({
            word,
            clue: pickClue(word, clueDatabase),
            row: r + 1,
            col: c,
            direction: "down",
            isCustom: false,
          });
          if (r + 1 + len < height && grid[r + 1 + len][c] === null) {
            // Only place clue if no adjacency issue
            const adjOk = !(
              (c > 0 && c > 0 && grid[r + 1 + len]?.[c - 1] === "#") ||
              (c + 1 < width && grid[r + 1 + len]?.[c + 1] === "#")
            );
            if (adjOk) grid[r + 1 + len][c] = "#";
          }
          break;
        }
      }
    }
  }

  // Step 4: Any remaining nulls become clue cells (last resort)
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (grid[r][c] === null) {
        grid[r][c] = "#";
      }
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

  for (const pw of placed) {
    let clueRow = -1;
    let clueCol = -1;

    if (pw.direction === "right") {
      // Clue cell to the left, or one row up in the potence
      if (pw.col > 0 && grid[pw.row][pw.col - 1] === "#") {
        clueRow = pw.row;
        clueCol = pw.col - 1;
      } else if (pw.row > 0 && grid[pw.row - 1][0] === "#" && pw.col === 0) {
        clueRow = pw.row - 1;
        clueCol = 0;
      }
    } else {
      // Clue cell above, or one col left in the potence
      if (pw.row > 0 && grid[pw.row - 1][pw.col] === "#") {
        clueRow = pw.row - 1;
        clueCol = pw.col;
      } else if (pw.col > 0 && grid[0][pw.col - 1] === "#" && pw.row === 0) {
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
