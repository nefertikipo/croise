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

  // Step 2: Fill ALL columns with vertical word chains (top to bottom)
  // Each odd column gets a chain of vertical words separated by clue cells
  const customQueue = [...customWords];

  for (let c = 0; c < width; c += 2) {
    const wordCol = c + 1;
    if (wordCol >= width) continue;

    let currentRow = 0;

    while (currentRow < height) {
      // Skip if already filled
      if (grid[currentRow][wordCol] === "#") { currentRow++; continue; }
      if (typeof grid[currentRow][wordCol] === "string") { currentRow++; continue; }

      // Find how far down we can go
      let maxLen = 0;
      let rr = currentRow;
      while (rr < height && grid[rr][wordCol] !== "#") { maxLen++; rr++; }
      if (maxLen < 2) { currentRow = rr + 1; continue; }

      // Pick word length (3-6)
      const targetLen = 3 + Math.floor(Math.random() * 4);
      const wordLen = Math.min(targetLen, maxLen);
      if (wordLen < 2) { currentRow += maxLen; continue; }

      // Try custom word
      let word: string | null = null;
      let isCustom = false;
      const cwIdx = customQueue.findIndex((cw) => cw.word.length === wordLen);
      if (cwIdx >= 0) {
        word = customQueue[cwIdx].word;
        customQueue.splice(cwIdx, 1);
        isCustom = true;
      }

      if (!word) {
        const constraints = getConstraints(grid, currentRow, wordCol, "down", wordLen);
        word = findWord(wordList, wordLen, constraints, usedWords);
      }

      if (word) {
        for (let i = 0; i < word.length; i++) grid[currentRow + i][wordCol] = word[i];
        usedWords.add(word);
        placed.push({ word, row: currentRow, col: wordCol, direction: "down", isCustom });

        currentRow += word.length;
        // Don't place terminator yet - let horizontal fill decide where clue cells go
        // Just mark the boundary with a # if we need to separate words
        if (currentRow < height && maxLen > word.length && grid[currentRow][wordCol] === null) {
          grid[currentRow][wordCol] = "#";
        }
        if (currentRow < height && grid[currentRow][wordCol] === "#") currentRow++;

      } else {
        // Can't find a word, skip this cell
        currentRow++;
      }
    }
  }

  // Step 2b: Horizontal seeds from left potence
  // Each clue cell at col 0, even rows defines a horizontal word on the NEXT row
  for (let r = 0; r < height; r += 2) {
    if (grid[r][0] !== "#") continue;
    const wordRow = r + 1;
    if (wordRow >= height) continue;

    // Find available length (up to first # in this row)
    let maxLen = 0;
    let cc = 0;
    while (cc < width && grid[wordRow][cc] !== "#") { maxLen++; cc++; }
    if (maxLen < 2) continue;

    // Try different lengths
    for (let tryLen = Math.min(maxLen, 7); tryLen >= 2; tryLen--) {
      const constraints = getConstraints(grid, wordRow, 0, "right", tryLen);
      const word = findWord(wordList, tryLen, constraints, usedWords);
      if (word) {
        for (let i = 0; i < word.length; i++) grid[wordRow][i] = word[i];
        usedWords.add(word);
        placed.push({ word, row: wordRow, col: 0, direction: "right", isCustom: false });
        // Terminator
        const afterCol = word.length;
        if (afterCol < width && grid[wordRow][afterCol] === null) {
          if (canPlaceClue(grid, wordRow, afterCol, height, width)) {
            grid[wordRow][afterCol] = "#";
          }
        }
        break;
      }
    }
  }

  // Steps 3-5: Iterative fill
  let changed = true;
  let iterations = 0;
  const MAX_ITER = 50;

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

          if (groupLen >= 2) {
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
                for (let tryLen = Math.min(groupLen, 7); tryLen >= 2; tryLen--) {
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
        if (maxLen < 2) continue;

        // Try to place a vertical word
        for (let tryLen = Math.min(maxLen, 7); tryLen >= 2; tryLen--) {
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

  // Step 5: Handle remaining unknown cells
  // First try to fill them with words, then convert stragglers to #
  for (let r = 1; r < height; r++) {
    for (let c = 1; c < width; c++) {
      if (grid[r][c] !== null) continue;

      // Try to start a horizontal word here if there's a # to the left
      if (c > 0 && grid[r][c - 1] === "#") {
        let maxLen = 0;
        let cc = c;
        while (cc < width && grid[r][cc] !== "#") { maxLen++; cc++; }
        if (maxLen >= 2) {
          const constraints = getConstraints(grid, r, c, "right", Math.min(maxLen, 7));
          for (let tryLen = Math.min(maxLen, 7); tryLen >= 2; tryLen--) {
            const tc = constraints.filter((x) => x.pos < tryLen);
            const word = findWord(wordList, tryLen, tc, usedWords);
            if (word) {
              for (let i = 0; i < word.length; i++) grid[r][c + i] = word[i];
              usedWords.add(word);
              placed.push({ word, row: r, col: c, direction: "right", isCustom: false });
              const after = c + word.length;
              if (after < width && grid[r][after] === null && canPlaceClue(grid, r, after, height, width)) {
                grid[r][after] = "#";
              }
              break;
            }
          }
        }
      }

      // Try vertical if there's a # above
      if (grid[r][c] === null && r > 0 && grid[r - 1][c] === "#") {
        let maxLen = 0;
        let rr = r;
        while (rr < height && grid[rr][c] !== "#") { maxLen++; rr++; }
        if (maxLen >= 2) {
          for (let tryLen = Math.min(maxLen, 7); tryLen >= 2; tryLen--) {
            const tc = getConstraints(grid, r, c, "down", tryLen).filter((x) => x.pos < tryLen);
            const word = findWord(wordList, tryLen, tc, usedWords);
            if (word) {
              for (let i = 0; i < word.length; i++) grid[r + i][c] = word[i];
              usedWords.add(word);
              placed.push({ word, row: r, col: c, direction: "down", isCustom: false });
              const after = r + word.length;
              if (after < height && grid[after][c] === null && canPlaceClue(grid, after, c, height, width)) {
                grid[after][c] = "#";
              }
              break;
            }
          }
        }
      }
    }
  }

  // Final cleanup: handle remaining nulls
  // For each null cell, try to extend an adjacent word to cover it
  // Only convert to # as absolute last resort AND if adjacency allows
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (grid[r][c] !== null) continue;

      // Try to find any adjacent word that could extend to cover this cell
      // Check if there's a letter above/below/left/right that's part of a word
      let filled = false;

      // Try placing a 2-letter word with an adjacent letter
      for (const [dr, dc, dir] of [[0, -1, "right"], [-1, 0, "down"]] as [number, number, "right"|"down"][]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= height || nc >= width) continue;
        if (typeof grid[nr][nc] !== "string" || grid[nr][nc] === "#") continue;
        // We have a letter at (nr, nc). Try making a 2-letter word [letter, ?] or [?, letter]
        const letter = grid[nr][nc] as string;
        if (dir === "right" && dc === -1) {
          // Cell to the left has a letter. Try 2-letter word starting at (r, c-1)
          const candidates = wordList.getByConstraint(2, 0, letter);
          for (const w of candidates) {
            if (!usedWords.has(w)) {
              grid[r][c] = w[1];
              usedWords.add(w);
              placed.push({ word: w, row: r, col: c - 1, direction: "right", isCustom: false });
              filled = true;
              break;
            }
          }
        } else if (dir === "down" && dr === -1) {
          const candidates = wordList.getByConstraint(2, 0, letter);
          for (const w of candidates) {
            if (!usedWords.has(w)) {
              grid[r][c] = w[1];
              usedWords.add(w);
              placed.push({ word: w, row: r - 1, col: c, direction: "down", isCustom: false });
              filled = true;
              break;
            }
          }
        }
        if (filled) break;
      }

      if (!filled) {
        // Last resort: convert to # only if adjacency allows
        if (canPlaceClue(grid, r, c, height, width)) {
          grid[r][c] = "#";
        } else {
          // Can't place clue (would be adjacent). Place a filler letter.
          grid[r][c] = "A"; // This will be an invalid crossing but avoids empty cells
        }
      }
    }
  }

  // REPAIR: eliminate orphan clue cells
  // An orphan # has no word starting from it (right or down)
  // Fix: convert to letter and extend adjacent word
  let repaired = true;
  while (repaired) {
    repaired = false;
    for (let r = 1; r < height; r++) {
      for (let c = 1; c < width; c++) {
        if (grid[r][c] !== "#") continue;

        // Check if orphan: no word starts right or down
        let hasRight = false, hasDown = false;
        if (c + 1 < width && typeof grid[r][c + 1] === "string" && grid[r][c + 1] !== "#") {
          let len = 0;
          for (let cc = c + 1; cc < width && grid[r][cc] !== "#"; cc++) len++;
          if (len >= 2) hasRight = true;
        }
        if (r + 1 < height && typeof grid[r + 1][c] === "string" && grid[r + 1][c] !== "#") {
          let len = 0;
          for (let rr = r + 1; rr < height && grid[rr][c] !== "#"; rr++) len++;
          if (len >= 2) hasDown = true;
        }

        if (hasRight || hasDown) continue; // Not orphan

        // This is an orphan. Convert to letter.
        // Find the word to the LEFT and extend it by 1 letter
        if (c > 0 && typeof grid[r][c - 1] === "string" && grid[r][c - 1] !== "#") {
          // Find a letter that works: extend the horizontal word
          // The word to the left ends at c-1. Adding this cell makes it 1 longer.
          // Find the start of the horizontal word
          let wordStart = c - 1;
          while (wordStart > 0 && typeof grid[r][wordStart - 1] === "string" && grid[r][wordStart - 1] !== "#") wordStart--;
          const oldLen = c - wordStart;
          const newLen = oldLen + 1;

          // Gather constraints
          const constraints: { pos: number; letter: string }[] = [];
          for (let i = 0; i < oldLen; i++) {
            constraints.push({ pos: i, letter: grid[r][wordStart + i] as string });
          }

          // Find a word of newLen that starts with the old word's letters
          let candidates = wordList.getByConstraint(newLen, constraints[0].pos, constraints[0].letter);
          for (let i = 1; i < constraints.length; i++) {
            candidates = candidates.filter((w) => w[constraints[i].pos] === constraints[i].letter);
          }
          candidates = candidates.filter((w) => !usedWords.has(w));

          if (candidates.length > 0) {
            const newWord = candidates[Math.floor(Math.random() * Math.min(candidates.length, 10))];
            // Remove old word from placed
            const oldIdx = placed.findIndex((p) => p.direction === "right" && p.row === r && p.col === wordStart);
            if (oldIdx >= 0) {
              usedWords.delete(placed[oldIdx].word);
              placed.splice(oldIdx, 1);
            }
            // Place new word
            for (let i = 0; i < newLen; i++) grid[r][wordStart + i] = newWord[i];
            usedWords.add(newWord);
            placed.push({ word: newWord, row: r, col: wordStart, direction: "right", isCustom: false });
            repaired = true;
            continue;
          }
        }

        // Try extending RIGHT (prepend to word to the right)
        if (c + 1 < width && typeof grid[r][c + 1] === "string" && grid[r][c + 1] !== "#") {
          let wordEnd = c + 1;
          while (wordEnd + 1 < width && typeof grid[r][wordEnd + 1] === "string" && grid[r][wordEnd + 1] !== "#") wordEnd++;
          const oldLen = wordEnd - c;
          const newLen = oldLen + 1;

          const constraints: { pos: number; letter: string }[] = [];
          for (let i = 1; i <= oldLen; i++) {
            constraints.push({ pos: i, letter: grid[r][c + i] as string });
          }

          let candidates = constraints.length > 0
            ? wordList.getByConstraint(newLen, constraints[0].pos, constraints[0].letter)
            : wordList.getByLength(newLen).map((e) => e.word);
          for (let i = 1; i < constraints.length; i++) {
            candidates = candidates.filter((w) => w[constraints[i].pos] === constraints[i].letter);
          }
          candidates = candidates.filter((w) => !usedWords.has(w));

          if (candidates.length > 0) {
            const newWord = candidates[Math.floor(Math.random() * Math.min(candidates.length, 10))];
            const oldIdx = placed.findIndex((p) => p.direction === "right" && p.row === r && p.col === c + 1);
            if (oldIdx >= 0) { usedWords.delete(placed[oldIdx].word); placed.splice(oldIdx, 1); }
            for (let i = 0; i < newLen; i++) grid[r][c + i] = newWord[i];
            usedWords.add(newWord);
            placed.push({ word: newWord, row: r, col: c, direction: "right", isCustom: false });
            repaired = true;
            continue;
          }
        }

        // Try extending UPWARD (vertical word above)
        if (r > 0 && typeof grid[r - 1][c] === "string" && grid[r - 1][c] !== "#") {
          let wordStart = r - 1;
          while (wordStart > 0 && typeof grid[wordStart - 1][c] === "string" && grid[wordStart - 1][c] !== "#") wordStart--;
          const oldLen = r - wordStart;
          const newLen = oldLen + 1;

          const constraints: { pos: number; letter: string }[] = [];
          for (let i = 0; i < oldLen; i++) {
            constraints.push({ pos: i, letter: grid[wordStart + i][c] as string });
          }

          let candidates = wordList.getByConstraint(newLen, constraints[0].pos, constraints[0].letter);
          for (let i = 1; i < constraints.length; i++) {
            candidates = candidates.filter((w) => w[constraints[i].pos] === constraints[i].letter);
          }
          candidates = candidates.filter((w) => !usedWords.has(w));

          if (candidates.length > 0) {
            const newWord = candidates[Math.floor(Math.random() * Math.min(candidates.length, 10))];
            const oldIdx = placed.findIndex((p) => p.direction === "down" && p.col === c && p.row === wordStart);
            if (oldIdx >= 0) {
              usedWords.delete(placed[oldIdx].word);
              placed.splice(oldIdx, 1);
            }
            for (let i = 0; i < newLen; i++) grid[wordStart + i][c] = newWord[i];
            usedWords.add(newWord);
            placed.push({ word: newWord, row: wordStart, col: c, direction: "down", isCustom: false });
            repaired = true;
            continue;
          }
        }
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
    .filter((c) => c.word.length >= 2);

  // Try multiple times, pick the grid with the fewest issues
  let bestResult: { grid: Cell[][]; placed: PlacedWord[] } | null = null;
  let bestScore = Infinity;

  for (let attempt = 0; attempt < 200; attempt++) {
    const result = buildGrid(width, height, wordList, clueDatabase, customWords);
    if (!result) continue;

    // Score: count orphan clue cells + adjacent interior clue cells
    let score = 0;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (result.grid[r][c] !== "#") continue;
        // Check if this clue cell has a word starting from it
        let hasWord = false;
        // Right
        if (c + 1 < width && typeof result.grid[r][c + 1] === "string" && result.grid[r][c + 1] !== "#") hasWord = true;
        // Down
        if (r + 1 < height && typeof result.grid[r + 1][c] === "string" && result.grid[r + 1][c] !== "#") hasWord = true;
        // Potence special: left col defines next row, top row defines next col
        if (c === 0 && r + 1 < height) hasWord = true;
        if (r === 0 && c + 1 < width) hasWord = true;
        if (!hasWord && r > 0 && c > 0) score++; // orphan

        // Adjacency
        if (r > 0 && c > 0) {
          if (c + 1 < width && result.grid[r][c + 1] === "#" && c + 1 > 0) score++;
          if (r + 1 < height && result.grid[r + 1][c] === "#" && r + 1 > 0) score++;
        }
      }
    }

    if (score < bestScore) {
      bestResult = result;
      bestScore = score;
    }
    if (score === 0) break; // perfect grid found
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
