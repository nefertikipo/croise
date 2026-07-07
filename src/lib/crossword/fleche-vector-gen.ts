// =============================================================================
// fleche-vector-gen.ts — Vector-based mots fléchés generator
// =============================================================================
// Phase 1: Skeleton (potence + combs)
// Phase 2: Interior blue box placement (dictionary-aware layout optimizer)
// Phase 3: Fill (backtracking CSP with MRV + arc consistency)
// Phase 4: Assembly (clue text assignment + output)
// =============================================================================

import {
  type Coord,
  type Grid,
  type Cell,
  type BlueCell,
  type WhiteCell,
  type Clue,
  type CluePlacement,
  coordKey,
  parseCoordKey,
  createSkeletonGrid,
  isInteriorPlacementValid,
  letterPosition,
  maxWordLength,
  inBounds,
  isBlue,
  isWhite,
  getCell,
  validateGrid,
  STRAIGHT_RIGHT,
  STRAIGHT_DOWN,
  OFFSET_RIGHT,
  OFFSET_DOWN,
  TOP_COMB_OFFSET,
  LEFT_COMB_OFFSET,
} from "./fleche-math";
import type { WordList } from "./word-list";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A word slot extracted from the grid topology */
interface Slot {
  /** Unique slot ID */
  id: number;
  /** Coordinates of each letter cell in order */
  cells: Coord[];
  /** The blue cell that defines this word */
  clueOrigin: Coord;
  /** Which clue index in the blue cell (0 or 1) */
  clueIndex: number;
  /** Placement vectors */
  placement: CluePlacement;
  /** Whether this is a horizontal (flow.x=1) or vertical (flow.y=1) slot */
  direction: "horizontal" | "vertical";
  /** Length of the word */
  length: number;
}

/** A crossing between two slots */
interface Crossing {
  slotA: number; // slot ID
  slotB: number; // slot ID
  posA: number; // position in slot A's word
  posB: number; // position in slot B's word
}

/** Target difficulty for clue selection. "balanced" keeps the natural mix. */
export type DifficultyMode = "facile" | "moyen" | "difficile" | "balanced";

/** Generation parameters */
export interface VectorGenParams {
  width: number;
  height: number;
  customClues?: { answer: string; clue: string }[];
  /** Which clue to pick per word when multiple exist. Default "balanced". */
  difficulty?: DifficultyMode;
}

/** Generation result */
export interface VectorGenResult {
  success: boolean;
  grid: Grid;
  slots: Slot[];
  words: { slot: Slot; word: string; clueText: string; isCustom: boolean }[];
  attempts: number;
}

// ---------------------------------------------------------------------------
// Precomputed dictionary stats for layout evaluation
// ---------------------------------------------------------------------------

interface DictStats {
  /** wordCountByLength[len] = number of words of that length */
  wordCountByLength: Map<number, number>;
  /** viableLetters[len][pos] = set of letters that appear at that position in words of that length */
  viableLetters: Map<number, Map<number, Set<string>>>;
  /** maxWordLength in dictionary */
  maxLength: number;
}

function buildDictStats(wordList: WordList): DictStats {
  const wordCountByLength = new Map<number, number>();
  const viableLetters = new Map<number, Map<number, Set<string>>>();
  let maxLen = 0;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  // Probe lengths 2..20
  for (let len = 2; len <= 20; len++) {
    const words = wordList.getByLength(len);
    const count = words.length;
    if (count === 0) continue;

    wordCountByLength.set(len, count);
    if (len > maxLen) maxLen = len;

    const posMap = new Map<number, Set<string>>();
    for (let pos = 0; pos < len; pos++) {
      const letters = new Set<string>();
      for (const ch of alphabet) {
        if (wordList.getByConstraint(len, pos, ch).length > 0) {
          letters.add(ch);
        }
      }
      posMap.set(pos, letters);
    }
    viableLetters.set(len, posMap);
  }

  return { wordCountByLength, viableLetters, maxLength: maxLen };
}

// ---------------------------------------------------------------------------
// Phase 2: Interior layout generation + optimization
// ---------------------------------------------------------------------------

/** Mutable grid representation for layout phase (just blue/white markers) */
type LayoutCell = "blue" | "white";

function createLayoutFromSkeleton(width: number, height: number): LayoutCell[][] {
  const layout: LayoutCell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: LayoutCell[] = [];
    for (let x = 0; x < width; x++) {
      // Potence + combs
      if (x === 0 && y === 0) row.push("blue");
      else if (y === 0 && x % 2 === 0) row.push("blue");
      else if (x === 0 && y % 2 === 0) row.push("blue");
      else row.push("white");
    }
    layout.push(row);
  }
  return layout;
}

/** Get all interior blue coords from a layout */
function getInteriorBlues(layout: LayoutCell[][]): Set<string> {
  const set = new Set<string>();
  const h = layout.length;
  const w = layout[0].length;
  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      if (layout[y][x] === "blue") set.add(`${x},${y}`);
    }
  }
  return set;
}

/**
 * Check if placing an interior blue at (x,y) would violate hard constraints.
 * Hard: adjacent to another interior blue.
 * The comb-blocking positions are handled via scoring penalty instead.
 */
function isInteriorBlueForbidden(
  x: number,
  y: number,
  layout: LayoutCell[][],
  w: number,
  h: number,
): boolean {
  // Bottom-right corner: can't fire right OR down, dead cell
  if (x === w - 1 && y === h - 1) return true;

  // Check adjacency with other interior blues
  const neighbors = [
    [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
  ];
  for (const [nx, ny] of neighbors) {
    if (nx > 0 && ny > 0 && nx < w && ny < h && layout[ny][nx] === "blue") {
      return true;
    }
  }
  return false;
}

/**
 * Extract horizontal and vertical white runs from a layout.
 * Returns array of { length, cells } for each contiguous run.
 */
function extractRuns(layout: LayoutCell[][], w: number, h: number): { length: number; cells: Coord[] }[] {
  const runs: { length: number; cells: Coord[] }[] = [];

  // Horizontal runs
  for (let y = 0; y < h; y++) {
    let runStart = -1;
    for (let x = 0; x <= w; x++) {
      const isWhite = x < w && layout[y][x] === "white";
      if (isWhite && runStart === -1) {
        runStart = x;
      } else if (!isWhite && runStart !== -1) {
        const cells: Coord[] = [];
        for (let rx = runStart; rx < x; rx++) cells.push({ x: rx, y });
        runs.push({ length: x - runStart, cells });
        runStart = -1;
      }
    }
  }

  // Vertical runs
  for (let x = 0; x < w; x++) {
    let runStart = -1;
    for (let y = 0; y <= h; y++) {
      const isWhite = y < h && layout[y][x] === "white";
      if (isWhite && runStart === -1) {
        runStart = y;
      } else if (!isWhite && runStart !== -1) {
        const cells: Coord[] = [];
        for (let ry = runStart; ry < y; ry++) cells.push({ x, y: ry });
        runs.push({ length: y - runStart, cells });
        runStart = -1;
      }
    }
  }

  return runs;
}

/**
 * Score a layout for fillability. Higher = better. 0 = perfect topology.
 * Negative = has violations.
 */
function scoreLayout(
  layout: LayoutCell[][],
  w: number,
  h: number,
  dictStats: DictStats,
  requiredLengths: number[] = [],
): number {
  let score = 0;

  // Check interior adjacency + comb-touching limits
  let leftCombTouching = 0; // interior blues at (1, even y) — touching left comb
  let topCombTouching = 0;  // interior blues at (even x, 1) — touching top comb

  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      if (layout[y][x] !== "blue") continue;
      if (isInteriorBlueForbidden(x, y, layout, w, h)) {
        score -= 10000; // adjacent interior blues: hard fail
      }
      if (x === 1 && y % 2 === 0) leftCombTouching++;
      if (y === 1 && x % 2 === 0) topCombTouching++;
    }
  }

  // Allow at most 1 interior blue touching the left comb, 0 touching the top comb
  if (leftCombTouching > 1) score -= 10000;
  if (topCombTouching > 0) score -= 10000;

  // Extract white runs and evaluate
  const runs = extractRuns(layout, w, h);

  // Build a set of cells that are part of any run >= 2 (in either direction)
  // so we can distinguish truly isolated 1-cells from comb border cells
  const inLongRun = new Set<string>();
  for (const run of runs) {
    if (run.length >= 2) {
      for (const c of run.cells) inLongRun.add(`${c.x},${c.y}`);
    }
  }

  for (const run of runs) {
    if (run.length === 1) {
      const key = `${run.cells[0].x},${run.cells[0].y}`;
      if (inLongRun.has(key)) {
        // Cell is part of a longer run in the other direction (e.g. comb border cells).
        // Not a problem — skip penalty.
      } else {
        // Truly isolated white cell in this direction and the other.
        score -= 500;
      }
    } else if (run.length === 2) {
      // 2-letter slots: tolerate more in small grids where they're unavoidable
      const interiorArea = (w - 1) * (h - 1);
      score -= interiorArea <= 50 ? 5 : 30;
    } else if (run.length >= 3) {
      const count = dictStats.wordCountByLength.get(run.length) ?? 0;
      if (count === 0) {
        // No words of this length exist. Dead slot.
        score -= 5000;
      } else {
        // Reward longer slots more: sweet spot is 4-8 letters
        const lengthBonus = run.length >= 4 && run.length <= 8 ? 20 : 5;
        score += Math.floor(Math.log2(count + 1) * 10) + lengthBonus;
        // Penalize over-long runs: full-width/height slots (10+) are heavily
        // cross-constrained and almost never fillable, especially once custom
        // letters are locked in. Allow up to the longest required custom word.
        const maxUseful = Math.max(9, ...requiredLengths);
        if (run.length > maxUseful) {
          score -= 300 * (run.length - maxUseful);
        }
      }
    }
  }

  // Bonus for having runs matching required custom word lengths
  if (requiredLengths.length > 0) {
    const runLengthCounts = new Map<number, number>();
    for (const run of runs) {
      runLengthCounts.set(run.length, (runLengthCounts.get(run.length) ?? 0) + 1);
    }
    const needed = new Map<number, number>();
    for (const len of requiredLengths) {
      needed.set(len, (needed.get(len) ?? 0) + 1);
    }
    let allFit = true;
    for (const [len, count] of needed) {
      const available = runLengthCounts.get(len) ?? 0;
      if (available >= count) {
        score += 500 * count; // big bonus per matched slot
      } else {
        score -= 2000 * (count - available); // penalty per missing slot
        allFit = false;
      }
    }
    if (allFit) score += 1000; // extra bonus if all custom words can fit
  }

  // Check for isolated single white cells (not part of any >=2 run in either direction)
  const inRun = new Set<string>();
  for (const run of runs) {
    if (run.length >= 2) {
      for (const c of run.cells) inRun.add(coordKey(c));
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (layout[y][x] === "white" && !inRun.has(`${x},${y}`)) {
        score -= 2000; // Totally isolated white cell
      }
    }
  }

  return score;
}

/**
 * Check crossing compatibility between intersecting slots.
 * For each white cell that is part of both a horizontal and vertical run,
 * verify that the letter sets at those positions overlap.
 */
function checkCrossingCompatibility(
  layout: LayoutCell[][],
  w: number,
  h: number,
  dictStats: DictStats,
): number {
  // Build maps: coord -> horizontal run info, coord -> vertical run info
  const hRunInfo = new Map<string, { length: number; pos: number }>();
  const vRunInfo = new Map<string, { length: number; pos: number }>();

  // Horizontal runs
  for (let y = 0; y < h; y++) {
    let runStart = -1;
    for (let x = 0; x <= w; x++) {
      const isW = x < w && layout[y][x] === "white";
      if (isW && runStart === -1) {
        runStart = x;
      } else if (!isW && runStart !== -1) {
        const len = x - runStart;
        if (len >= 2) {
          for (let rx = runStart; rx < x; rx++) {
            hRunInfo.set(`${rx},${y}`, { length: len, pos: rx - runStart });
          }
        }
        runStart = -1;
      }
    }
  }

  // Vertical runs
  for (let x = 0; x < w; x++) {
    let runStart = -1;
    for (let y = 0; y <= h; y++) {
      const isW = y < h && layout[y][x] === "white";
      if (isW && runStart === -1) {
        runStart = y;
      } else if (!isW && runStart !== -1) {
        const len = y - runStart;
        if (len >= 2) {
          for (let ry = runStart; ry < y; ry++) {
            vRunInfo.set(`${x},${ry}`, { length: len, pos: ry - runStart });
          }
        }
        runStart = -1;
      }
    }
  }

  let penalty = 0;

  // For each cell in both a horizontal and vertical run, check letter compatibility
  for (const [key, hInfo] of hRunInfo) {
    const vInfo = vRunInfo.get(key);
    if (!vInfo) continue; // Not a crossing, fine

    const hLetters = dictStats.viableLetters.get(hInfo.length)?.get(hInfo.pos);
    const vLetters = dictStats.viableLetters.get(vInfo.length)?.get(vInfo.pos);

    if (!hLetters || !vLetters) {
      // One of the runs has a length with no words at all
      penalty -= 5000;
      continue;
    }

    // Count intersection
    let common = 0;
    for (const ch of hLetters) {
      if (vLetters.has(ch)) common++;
    }

    if (common === 0) {
      // Dead crossing: no letter can satisfy both slots
      penalty -= 5000;
    } else if (common <= 2) {
      // Very tight crossing: risky
      penalty -= 100;
    }
    // Otherwise fine — common >= 3 means enough flexibility
  }

  return penalty;
}

/**
 * Generate a random interior layout by scattering blue boxes.
 * Target density is ~15-20% of interior cells.
 */
function generateRandomLayout(
  w: number,
  h: number,
  targetDensity: number,
): LayoutCell[][] {
  const layout = createLayoutFromSkeleton(w, h);
  const interiorCells: Coord[] = [];
  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      interiorCells.push({ x, y });
    }
  }

  const targetCount = Math.round(interiorCells.length * targetDensity);

  // Shuffle interior cells
  for (let i = interiorCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [interiorCells[i], interiorCells[j]] = [interiorCells[j], interiorCells[i]];
  }

  // Place blue boxes one by one, skipping if would create adjacency
  let placed = 0;
  for (const coord of interiorCells) {
    if (placed >= targetCount) break;
    if (!isInteriorBlueForbidden(coord.x, coord.y, layout, w, h)) {
      layout[coord.y][coord.x] = "blue";
      placed++;
    }
  }

  return layout;
}

/**
 * Optimize a layout by randomly moving interior blue boxes.
 * Uses hill-climbing: accept moves that improve or maintain score.
 */
function optimizeLayout(
  layout: LayoutCell[][],
  w: number,
  h: number,
  dictStats: DictStats,
  iterations: number,
  requiredLengths: number[] = [],
): { layout: LayoutCell[][]; score: number } {
  let currentScore =
    scoreLayout(layout, w, h, dictStats, requiredLengths) +
    checkCrossingCompatibility(layout, w, h, dictStats);

  for (let iter = 0; iter < iterations; iter++) {
    // Collect current interior blues and empty interiors
    const blues: Coord[] = [];
    const whites: Coord[] = [];
    for (let y = 1; y < h; y++) {
      for (let x = 1; x < w; x++) {
        if (layout[y][x] === "blue") blues.push({ x, y });
        else whites.push({ x, y });
      }
    }

    if (blues.length === 0 || whites.length === 0) break;

    // Pick random blue to remove and random white to place
    const removeIdx = Math.floor(Math.random() * blues.length);
    const addIdx = Math.floor(Math.random() * whites.length);
    const removeCoord = blues[removeIdx];
    const addCoord = whites[addIdx];

    // Try the swap
    layout[removeCoord.y][removeCoord.x] = "white";
    layout[addCoord.y][addCoord.x] = "blue";

    // Quick adjacency check on the new position
    if (isInteriorBlueForbidden(addCoord.x, addCoord.y, layout, w, h)) {
      // Revert
      layout[removeCoord.y][removeCoord.x] = "blue";
      layout[addCoord.y][addCoord.x] = "white";
      continue;
    }

    // Also check that removing the old blue didn't expose a neighbor to now be adjacent
    // (not needed since we only moved one; other blues didn't change)

    const newScore =
      scoreLayout(layout, w, h, dictStats, requiredLengths) +
      checkCrossingCompatibility(layout, w, h, dictStats);

    if (newScore >= currentScore) {
      currentScore = newScore;
    } else {
      // Revert
      layout[removeCoord.y][removeCoord.x] = "blue";
      layout[addCoord.y][addCoord.x] = "white";
    }
  }

  return { layout, score: currentScore };
}

// ---------------------------------------------------------------------------
// Phase 2 → Grid: Convert optimized layout back to a Grid with clues
// ---------------------------------------------------------------------------

/**
 * Convert a layout to a full Grid with blue cells containing clue vectors.
 * For each interior blue box, determine which clues it should hold based on
 * the white runs it can reach.
 */
function layoutToGrid(layout: LayoutCell[][], w: number, h: number): Grid {
  const skeleton = createSkeletonGrid(w, h);
  const cells = skeleton.cells;

  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      if (layout[y][x] !== "blue") continue;

      const clues: Clue[] = [];

      // Check straight right: is (x+1, y) white and starts a run of >=2?
      if (x + 1 < w && layout[y][x + 1] === "white") {
        let runLen = 0;
        for (let rx = x + 1; rx < w && layout[y][rx] === "white"; rx++) runLen++;
        if (runLen >= 2) {
          clues.push({ placement: STRAIGHT_RIGHT, answer: "", text: "" });
        }
      }

      // Check straight down: is (x, y+1) white and starts a run of >=2?
      if (y + 1 < h && layout[y + 1][x] === "white") {
        let runLen = 0;
        for (let ry = y + 1; ry < h && layout[ry][x] === "white"; ry++) runLen++;
        if (runLen >= 2) {
          clues.push({ placement: STRAIGHT_DOWN, answer: "", text: "" });
        }
      }

      // Check offset right: is (x+1, y+1) white and starts a horizontal run of >=2?
      if (clues.length < 2 && x + 1 < w && y + 1 < h && layout[y + 1][x + 1] === "white") {
        let runLen = 0;
        for (let rx = x + 1; rx < w && layout[y + 1][rx] === "white"; rx++) runLen++;
        if (runLen >= 2) {
          clues.push({ placement: OFFSET_RIGHT, answer: "", text: "" });
        }
      }

      // Check offset down: is (x+1, y+1) white and starts a vertical run of >=2?
      if (clues.length < 2 && x + 1 < w && y + 1 < h && layout[y + 1][x + 1] === "white") {
        let runLen = 0;
        for (let ry = y + 1; ry < h && layout[ry][x + 1] === "white"; ry++) runLen++;
        if (runLen >= 2) {
          clues.push({ placement: OFFSET_DOWN, answer: "", text: "" });
        }
      }

      if (clues.length === 0) {
        // Blue box with no valid clue directions — give it at least a placeholder
        // This shouldn't happen in a well-optimized layout
        clues.push({ placement: STRAIGHT_RIGHT, answer: "", text: "" });
      }

      const blueCell: BlueCell = { kind: "blue", coord: { x, y }, clues };
      cells[y][x] = blueCell;
    }
  }

  return { width: w, height: h, cells };
}

// ---------------------------------------------------------------------------
// Phase 3: Slot extraction + CSP fill
// ---------------------------------------------------------------------------

/**
 * Extract all word slots from the grid using a run-based approach.
 * Scans for all horizontal and vertical white runs of length >= 2,
 * then assigns each run to its source blue cell.
 */
function extractSlots(grid: Grid): Slot[] {
  const slots: Slot[] = [];
  let id = 0;

  // Helper: find the blue cell that "sources" a run, and which clue index
  function findSource(
    runCells: Coord[],
    direction: "horizontal" | "vertical",
  ): { origin: Coord; clueIndex: number; placement: CluePlacement } | null {
    const first = runCells[0];

    // Look for a blue cell whose clue vector points to this run's first cell
    // Check all blue cells (prioritize the one just before the run)
    const candidates: Coord[] = [];

    if (direction === "horizontal") {
      // Blue cell to the left of the run, same row
      if (first.x > 0) candidates.push({ x: first.x - 1, y: first.y });
      // Blue cell above-left (offset source)
      if (first.x > 0 && first.y > 0) candidates.push({ x: first.x - 1, y: first.y - 1 });
      // Blue cell directly above (offset right from top comb)
      if (first.y > 0) candidates.push({ x: first.x, y: first.y - 1 });
      // Left comb cells that fire via offset
      if (first.x === 0 && first.y > 0) {
        // Col-0 cells: the comb cell above fires LEFT_COMB_OFFSET
        for (let cy = first.y - 1; cy >= 0; cy--) {
          const c = grid.cells[cy][0];
          if (c.kind === "blue") {
            candidates.push({ x: 0, y: cy });
            break;
          }
        }
      }
    } else {
      // Blue cell above the run, same column
      if (first.y > 0) candidates.push({ x: first.x, y: first.y - 1 });
      // Blue cell above-left (offset source)
      if (first.x > 0 && first.y > 0) candidates.push({ x: first.x - 1, y: first.y - 1 });
      // Blue cell directly to the left (offset down from top comb)
      if (first.x > 0) candidates.push({ x: first.x - 1, y: first.y });
      // Top comb cells that fire via offset
      if (first.y === 0 && first.x > 0) {
        for (let cx = first.x - 1; cx >= 0; cx--) {
          const c = grid.cells[0][cx];
          if (c.kind === "blue") {
            candidates.push({ x: cx, y: 0 });
            break;
          }
        }
      }
    }

    // Check each candidate blue cell's clues
    for (const coord of candidates) {
      const cell = grid.cells[coord.y][coord.x];
      if (cell.kind !== "blue") continue;

      for (let ci = 0; ci < cell.clues.length; ci++) {
        const clue = cell.clues[ci];
        // Check if this clue's first letter position matches the run's first cell
        const firstLetterPos = letterPosition(coord, clue.placement, 0);
        if (firstLetterPos.x === first.x && firstLetterPos.y === first.y) {
          // Verify the flow direction matches
          const isHFlow = clue.placement.flow.x === 1 && clue.placement.flow.y === 0;
          const isVFlow = clue.placement.flow.x === 0 && clue.placement.flow.y === 1;
          if ((direction === "horizontal" && isHFlow) || (direction === "vertical" && isVFlow)) {
            return { origin: coord, clueIndex: ci, placement: clue.placement };
          }
        }
      }
    }

    return null;
  }

  // Scan all horizontal white runs
  for (let y = 0; y < grid.height; y++) {
    let runStart = -1;
    for (let x = 0; x <= grid.width; x++) {
      const isW = x < grid.width && grid.cells[y][x].kind === "white";
      if (isW && runStart === -1) {
        runStart = x;
      } else if (!isW && runStart !== -1) {
        const len = x - runStart;
        if (len >= 2) {
          const cells: Coord[] = [];
          for (let rx = runStart; rx < x; rx++) cells.push({ x: rx, y });

          const source = findSource(cells, "horizontal");
          if (source) {
            slots.push({
              id: id++,
              cells,
              clueOrigin: source.origin,
              clueIndex: source.clueIndex,
              placement: source.placement,
              direction: "horizontal",
              length: len,
            });
          }
        }
        runStart = -1;
      }
    }
  }

  // Scan all vertical white runs
  for (let x = 0; x < grid.width; x++) {
    let runStart = -1;
    for (let y = 0; y <= grid.height; y++) {
      const isW = y < grid.height && grid.cells[y][x].kind === "white";
      if (isW && runStart === -1) {
        runStart = y;
      } else if (!isW && runStart !== -1) {
        const len = y - runStart;
        if (len >= 2) {
          const cells: Coord[] = [];
          for (let ry = runStart; ry < y; ry++) cells.push({ x, y: ry });

          const source = findSource(cells, "vertical");
          if (source) {
            slots.push({
              id: id++,
              cells,
              clueOrigin: source.origin,
              clueIndex: source.clueIndex,
              placement: source.placement,
              direction: "vertical",
              length: len,
            });
          }
        }
        runStart = -1;
      }
    }
  }

  return slots;
}

/** Build crossing map between slots */
function buildCrossings(slots: Slot[]): Crossing[] {
  const crossings: Crossing[] = [];

  // Map each coord to the slots that pass through it
  const coordToSlots = new Map<string, { slotId: number; pos: number }[]>();
  for (const slot of slots) {
    for (let pos = 0; pos < slot.cells.length; pos++) {
      const key = coordKey(slot.cells[pos]);
      if (!coordToSlots.has(key)) coordToSlots.set(key, []);
      coordToSlots.get(key)!.push({ slotId: slot.id, pos });
    }
  }

  // For each coord with 2+ slots, create crossings
  for (const entries of coordToSlots.values()) {
    if (entries.length < 2) continue;
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        crossings.push({
          slotA: entries[i].slotId,
          slotB: entries[j].slotId,
          posA: entries[i].pos,
          posB: entries[j].pos,
        });
      }
    }
  }

  return crossings;
}

/**
 * Place custom words into slots using crossing-aware backtracking.
 *
 * The naive approach (drop each word into a random matching-length slot, then
 * reject the whole layout if any two custom words collide at a crossing) throws
 * away the vast majority of layouts when several custom words share a length and
 * intersect. Here we instead backtrack: a candidate slot is only accepted if the
 * word is compatible with every already-placed custom word at their crossings.
 *
 * Returns a Map<slotId, word> placing ALL custom words, or null if no compatible
 * assignment exists for this layout.
 */
function placeCustomWords(
  slots: Slot[],
  crossings: Crossing[],
  customWords: string[],
  wordList: WordList,
  clueDb: Map<string, string[]>,
): Map<number, string> | null {
  // Per-slot crossing adjacency
  const slotCrossings = new Map<number, Crossing[]>();
  for (const s of slots) slotCrossings.set(s.id, []);
  for (const c of crossings) {
    slotCrossings.get(c.slotA)?.push(c);
    slotCrossings.get(c.slotB)?.push(c);
  }

  // Slots grouped by length for quick candidate lookup
  const slotsByLen = new Map<number, Slot[]>();
  for (const s of slots) {
    if (!slotsByLen.has(s.length)) slotsByLen.set(s.length, []);
    slotsByLen.get(s.length)!.push(s);
  }

  // Does a length have ANY word with a real clue? (fast no-constraint check)
  const hasClueWordsByLength = new Map<number, boolean>();
  function lengthHasClueWords(len: number): boolean {
    let cached = hasClueWordsByLength.get(len);
    if (cached === undefined) {
      cached = wordList
        .getByLength(len)
        .some((e) => (clueDb.get(e.word)?.length ?? 0) > 0);
      hasClueWordsByLength.set(len, cached);
    }
    return cached;
  }

  const assignment = new Map<number, string>();
  const usedSlots = new Set<number>();

  /** Letters currently forced onto `slotId` by already-placed custom words. */
  function lockedLettersFor(slotId: number): { pos: number; letter: string }[] {
    const out: { pos: number; letter: string }[] = [];
    for (const c of slotCrossings.get(slotId)!) {
      const isA = c.slotA === slotId;
      const otherId = isA ? c.slotB : c.slotA;
      const other = assignment.get(otherId);
      if (!other) continue;
      const myPos = isA ? c.posA : c.posB;
      const otherPos = isA ? c.posB : c.posA;
      out.push({ pos: myPos, letter: other[otherPos] });
    }
    return out;
  }

  /** Is there at least one real-clue word that fits `slot` given locked letters? */
  function slotFillable(slotId: number): boolean {
    const slot = slots[slotId];
    const cons = lockedLettersFor(slotId);
    if (cons.length === 0) return lengthHasClueWords(slot.length);
    let cands = wordList.getByConstraint(slot.length, cons[0].pos, cons[0].letter);
    for (let i = 1; i < cons.length && cands.length > 0; i++) {
      cands = cands.filter((w) => w[cons[i].pos] === cons[i].letter);
    }
    return cands.some((w) => (clueDb.get(w)?.length ?? 0) > 0);
  }

  function compatible(slotId: number, word: string): boolean {
    for (const c of slotCrossings.get(slotId)!) {
      const isA = c.slotA === slotId;
      const otherId = isA ? c.slotB : c.slotA;
      const other = assignment.get(otherId);
      if (!other) continue; // crossing slot not yet a custom word — fine
      const myPos = isA ? c.posA : c.posB;
      const otherPos = isA ? c.posB : c.posA;
      if (word[myPos] !== other[otherPos]) return false;
    }
    return true;
  }

  function solve(idx: number): boolean {
    if (idx >= customWords.length) return true;
    const word = customWords[idx];
    const candidates = (slotsByLen.get(word.length) ?? []).filter(
      (s) => !usedSlots.has(s.id),
    );
    // Order candidates by fewest crossings first (with random tie-break jitter):
    // placing a custom word where it forces the fewest perpendicular fill slots
    // keeps the surrounding grid far more solvable. Rare-letter words like LYNX
    // benefit most from landing in low-pressure slots.
    for (const s of candidates) {
      (s as Slot & { _sortKey?: number })._sortKey =
        slotCrossings.get(s.id)!.length + Math.random();
    }
    candidates.sort(
      (a, b) =>
        (a as Slot & { _sortKey: number })._sortKey -
        (b as Slot & { _sortKey: number })._sortKey,
    );
    for (const slot of candidates) {
      if (!compatible(slot.id, word)) continue;
      assignment.set(slot.id, word);
      usedSlots.add(slot.id);

      // Forward check: every non-custom slot this word crosses must still have
      // at least one real-clue fill word given all locked custom letters.
      // This rejects dead crossings (e.g. "_X__H") before the CSP solver runs.
      let viable = true;
      for (const c of slotCrossings.get(slot.id)!) {
        const otherId = c.slotA === slot.id ? c.slotB : c.slotA;
        if (usedSlots.has(otherId)) continue; // crossing is another custom word
        if (!slotFillable(otherId)) {
          viable = false;
          break;
        }
      }

      if (viable && solve(idx + 1)) return true;
      assignment.delete(slot.id);
      usedSlots.delete(slot.id);
    }
    return false;
  }

  return solve(0) ? assignment : null;
}

/**
 * Arc-consistency (AC-3) feasibility pre-check.
 *
 * Backtracking search wastes a lot of time "thrashing" on layouts that pass a
 * single-crossing forward check but are jointly unsolvable — it explores a large
 * tree before giving up. AC-3 propagates letter constraints across all crossings
 * to a fixpoint; if any slot's domain empties, the layout is *proven*
 * unsolvable in polynomial time and we can skip it immediately instead of
 * burning the solver's time budget.
 *
 * Returns null if the layout is provably unsolvable, otherwise the pruned
 * per-slot domains (values with no support removed). These reduced domains are
 * fed into the CSP solver so it searches a much smaller space — turning many
 * would-be timeouts into instant fills. Removing an unsupported value is sound:
 * it cannot participate in any complete solution.
 */
function arcConsistentPrecheck(
  slots: Slot[],
  crossings: Crossing[],
  preAssigned: Map<number, string>,
  domainByLength: (len: number) => string[],
  fullSupport: (len: number, pos: number) => Set<string>,
): Map<number, string[]> | null {
  const slotCrossings = new Map<number, Crossing[]>();
  for (const s of slots) slotCrossings.set(s.id, []);
  for (const c of crossings) {
    slotCrossings.get(c.slotA)!.push(c);
    slotCrossings.get(c.slotB)!.push(c);
  }

  // Working domains: custom slots are singletons; others stay lazily at their
  // full clued word list until first pruned (tracked in `reduced`). This avoids
  // materialising/copying thousands of words for slots that never shrink.
  const dom = new Map<number, string[]>();
  const reduced = new Set<number>();
  for (const s of slots) {
    const pa = preAssigned.get(s.id);
    if (pa) {
      dom.set(s.id, [pa]);
      reduced.add(s.id);
    } else {
      if (domainByLength(s.length).length === 0) return null;
      dom.set(s.id, domainByLength(s.length));
    }
  }

  // Support letters that a neighbour offers at a crossing position. For a slot
  // still at full domain, this is the precomputed dictionary letter set (no
  // per-word scan); for a pruned slot, scan its (now small) domain.
  function supportOf(slotId: number, len: number, pos: number): Set<string> {
    if (!reduced.has(slotId)) return fullSupport(len, pos);
    const set = new Set<string>();
    for (const w of dom.get(slotId)!) set.add(w[pos]);
    return set;
  }

  const slotLen = new Map<number, number>();
  for (const s of slots) slotLen.set(s.id, s.length);

  const queue: number[] = slots.map((s) => s.id);
  const inQueue = new Set<number>(queue);

  while (queue.length > 0) {
    const a = queue.shift()!;
    inQueue.delete(a);

    for (const c of slotCrossings.get(a)!) {
      const isA = c.slotA === a;
      const other = isA ? c.slotB : c.slotA;
      const myPos = isA ? c.posA : c.posB;
      const otherPos = isA ? c.posB : c.posA;

      const support = supportOf(other, slotLen.get(other)!, otherPos);

      const aDom = dom.get(a)!;
      const after = aDom.filter((w) => support.has(w[myPos]));
      if (after.length < aDom.length) {
        if (after.length === 0) return null;
        dom.set(a, after);
        reduced.add(a);
        // a's domain shrank: re-examine its other neighbours
        for (const c2 of slotCrossings.get(a)!) {
          const nb = c2.slotA === a ? c2.slotB : c2.slotA;
          if (nb !== other && !inQueue.has(nb)) {
            queue.push(nb);
            inQueue.add(nb);
          }
        }
      }
    }
  }

  return dom;
}

/**
 * CSP Solver with MRV heuristic and constraint propagation.
 */
function solveFill(
  slots: Slot[],
  crossings: Crossing[],
  wordList: WordList,
  clueDb: Map<string, string[]>,
  maxBacktracks: number,
  timeLimitMs: number = 5000,
  preAssigned: Map<number, string> = new Map(),
  acDomains: Map<number, string[]> | null = null,
  preferWords?: Set<string>,
): Map<number, string> | null {
  const n = slots.length;
  if (n === 0) return new Map();
  const deadline = Date.now() + timeLimitMs;

  // Build adjacency: for each slot, which crossings involve it?
  const slotCrossings = new Map<number, Crossing[]>();
  for (const slot of slots) {
    slotCrossings.set(slot.id, []);
  }
  for (const c of crossings) {
    slotCrossings.get(c.slotA)!.push(c);
    slotCrossings.get(c.slotB)!.push(c);
  }

  // Domain: for each slot, only words that have real clues. When AC-3 has
  // already pruned the domains (arc consistency), start from those — the search
  // space is far smaller. Otherwise compute once per length and reuse (slots of
  // the same length share an identical initial domain).
  const domainByLength = new Map<number, string[]>();
  const domains = new Map<number, string[]>();
  // For fast membership tests when intersecting getByConstraint results.
  const acSets = acDomains ? new Map<number, Set<string>>() : null;
  for (const slot of slots) {
    if (acDomains) {
      const d = acDomains.get(slot.id)!;
      domains.set(slot.id, d);
      acSets!.set(slot.id, new Set(d));
      continue;
    }
    let words = domainByLength.get(slot.length);
    if (!words) {
      words = wordList.getByLength(slot.length)
        .map((e) => e.word)
        .filter((w) => clueDb.has(w) && clueDb.get(w)!.length > 0);
      domainByLength.set(slot.length, words);
    }
    domains.set(slot.id, words);
  }

  // Assignment — start with pre-assigned (custom) words locked in
  const assignment = new Map<number, string>();
  const usedWords = new Set<string>();
  const lockedSlots = new Set<number>();
  for (const [slotId, word] of preAssigned) {
    assignment.set(slotId, word);
    usedWords.add(word);
    lockedSlots.add(slotId);
  }
  let backtracks = 0;

  /** Prune domain of a slot based on current assignments at crossings.
   *  Uses the WordList index for fast filtering when possible. */
  function pruneDomain(slotId: number): string[] {
    const slot = slots[slotId];
    const myCrossings = slotCrossings.get(slotId)!;

    // Collect all letter constraints from assigned crossings
    const constraints: { pos: number; letter: string }[] = [];
    for (const crossing of myCrossings) {
      const isA = crossing.slotA === slotId;
      const otherSlotId = isA ? crossing.slotB : crossing.slotA;
      const myPos = isA ? crossing.posA : crossing.posB;
      const otherPos = isA ? crossing.posB : crossing.posA;

      const otherWord = assignment.get(otherSlotId);
      if (otherWord) {
        constraints.push({ pos: myPos, letter: otherWord[otherPos] });
      }
    }

    let candidates: string[];

    if (constraints.length === 0) {
      // No constraints: all words of this length
      candidates = domains.get(slotId)!;
    } else {
      // Start with the most constraining position (use index lookup)
      // Pick the constraint likely to have fewest matches
      candidates = wordList.getByConstraint(
        slot.length,
        constraints[0].pos,
        constraints[0].letter,
      );
      // Filter by remaining constraints
      for (let ci = 1; ci < constraints.length; ci++) {
        const { pos, letter } = constraints[ci];
        candidates = candidates.filter((w) => w[pos] === letter);
      }
      // Restrict to the AC-3-pruned domain (sound: pruned values can't solve).
      if (acSets) {
        const set = acSets.get(slotId)!;
        candidates = candidates.filter((w) => set.has(w));
      }
    }

    // Only keep words that have real clues
    candidates = candidates.filter((w) => clueDb.has(w) && clueDb.get(w)!.length > 0);

    // Filter out already-used words
    if (usedWords.size > 0) {
      candidates = candidates.filter((w) => !usedWords.has(w));
    }

    return candidates;
  }

  /** Select the unassigned slot with minimum remaining values (MRV) */
  function selectMRV(): number | null {
    let bestId: number | null = null;
    let bestCount = Infinity;

    for (const slot of slots) {
      if (assignment.has(slot.id)) continue; // skip assigned AND locked
      const count = pruneDomain(slot.id).length;
      if (count === 0) return null; // Early fail
      if (count < bestCount) {
        bestCount = count;
        bestId = slot.id;
      }
    }

    return bestId;
  }

  /** Recursive backtracking search */
  function solve(): boolean {
    if (assignment.size === n) return true;
    if (backtracks > maxBacktracks || Date.now() > deadline) return false;

    const slotId = selectMRV();
    if (slotId === null) return false;

    // Copy before shuffling: for an unconstrained slot pruneDomain returns the
    // shared (cached) domain array, which must not be mutated in place.
    const candidates = pruneDomain(slotId).slice();
    if (candidates.length === 0) return false;

    // Order candidates for variety. `bias` (0 = uniform shuffle, higher = stronger
    // pull toward familiar words) is a DIFFICULTY KNOB, not a maximizer: easy
    // grids want a strong bias (recognizable vocab), hard grids a gentle/zero one
    // so some less-familiar words mix in — difficulty also comes from clue choice.
    // Weighted shuffle uses Efraimidis–Spirakis so rare words stay reachable on
    // backtrack (keeps grids solvable). A high bias slows generation.
    const bias = Number(process.env.FAMILIARITY_BIAS ?? 0);
    if (bias > 0) {
      const keyed = candidates.map((w) => ({
        w,
        k: Math.pow(Math.random(), 1 / (wordList.getScore(w) * bias + 1)),
      }));
      keyed.sort((a, b) => b.k - a.k);
      for (let i = 0; i < candidates.length; i++) candidates[i] = keyed[i].w;
    } else {
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
    }

    // Float words that have a clue at the grid's target difficulty to the front
    // (stable over the shuffle), so the fill picks them first and pickClue rarely
    // has to fall back to the wrong level. Rest stay reachable on backtrack.
    if (preferWords && preferWords.size > 0) {
      const pref: string[] = [];
      const rest: string[] = [];
      for (const w of candidates) (preferWords.has(w) ? pref : rest).push(w);
      if (pref.length > 0 && rest.length > 0) {
        for (let i = 0; i < pref.length; i++) candidates[i] = pref[i];
        for (let i = 0; i < rest.length; i++) candidates[pref.length + i] = rest[i];
      }
    }

    // Try more candidates when custom words are involved
    const limit = Math.min(candidates.length, preAssigned.size > 0 ? 80 : 40);

    for (let ci = 0; ci < limit; ci++) {
      const word = candidates[ci];
      assignment.set(slotId, word);
      usedWords.add(word);

      // Forward check: verify all unassigned crossing neighbors still have candidates
      let viable = true;
      for (const crossing of slotCrossings.get(slotId)!) {
        const otherId = crossing.slotA === slotId ? crossing.slotB : crossing.slotA;
        if (assignment.has(otherId)) continue;
        const otherCands = pruneDomain(otherId);
        if (otherCands.length === 0) {
          viable = false;
          break;
        }
      }

      if (viable && solve()) return true;

      backtracks++;
      if (backtracks > maxBacktracks || Date.now() > deadline) {
        assignment.delete(slotId);
        usedWords.delete(word);
        return false;
      }

      assignment.delete(slotId);
      usedWords.delete(word);
    }

    return false;
  }

  const success = solve();
  return success ? assignment : null;
}

// ---------------------------------------------------------------------------
// Phase 4: Assembly
// ---------------------------------------------------------------------------

function pickClue(
  word: string,
  clueDb: Map<string, string[]>,
  clueDifficulty?: Map<string, number>,
  mode: DifficultyMode = "balanced",
): string {
  const clues = clueDb.get(word.toUpperCase());
  if (!clues || clues.length === 0) return "?";

  // Filter out clues containing the word itself
  const filtered = clues.filter(
    (c) => !c.toUpperCase().includes(word.toUpperCase()),
  );
  const pool = filtered.length > 0 ? filtered : clues;

  // Prefer short clues (fit the potence clue frame)
  const short = pool.filter((c) => c.length <= 40);
  let pick = short.length > 0 ? short : pool;

  // Difficulty targeting: keep the clues closest to a target level.
  // facile/moyen/difficile use a fixed target; "balanced" draws a per-clue
  // target from a lean-easy 50/35/15 facile/moyen/difficile mix. Key must match
  // clueDiffKey() in load-french-clues.ts.
  if (clueDifficulty) {
    let target: number;
    if (mode === "facile") target = 1;
    else if (mode === "difficile") target = 3;
    else if (mode === "moyen") target = 2;
    // Over-weighted toward facile to offset words that lack an easy clue and
    // fall back to moyen; realizes ~50/35/15 facile/moyen/difficile in grids.
    else { const r = Math.random(); target = r < 0.66 ? 1 : r < 0.85 ? 2 : 3; }
    const dist = (c: string) =>
      Math.abs((clueDifficulty.get(word.toUpperCase() + "\u0001" + c) ?? 2) - target);
    const best = Math.min(...pick.map(dist));
    const atTarget = pick.filter((c) => dist(c) === best);
    if (atTarget.length > 0) pick = atTarget;
  }
  return pick[Math.floor(Math.random() * pick.length)];
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateFlecheVector(
  params: VectorGenParams,
  wordList: WordList,
  clueDb: Map<string, string[]>,
  clueDifficulty?: Map<string, number>,
): VectorGenResult {
  const { width, height } = params;
  const customClues = (params.customClues ?? []).filter(
    (c) => c.answer.length >= 2 && c.clue.length > 0,
  );

  // Add custom words to clueDb and wordList so they're valid during solving
  for (const custom of customClues) {
    const answer = custom.answer.toUpperCase().replace(/[^A-Z]/g, "");
    if (answer.length < 2) continue;
    wordList.addWord(answer, 100);
    if (!clueDb.has(answer)) {
      clueDb.set(answer, [custom.clue]);
    }
  }

  // For a fixed-difficulty grid, precompute which words actually HAVE a clue at
  // the target level, so the fill prefers them and pickClue rarely falls back to
  // the wrong level. Purer difficulty at the cost of some generation speed.
  // Balanced grids (mixed target) skip this.
  const gridTarget =
    params.difficulty === "facile" ? 1 :
    params.difficulty === "moyen" ? 2 :
    params.difficulty === "difficile" ? 3 : 0;
  let preferWords: Set<string> | undefined;
  if (gridTarget && clueDifficulty && clueDifficulty.size > 0) {
    preferWords = new Set<string>();
    for (const [w, clues] of clueDb) {
      for (const c of clues) {
        if (clueDifficulty.get(w.toUpperCase() + "\u0001" + c) === gridTarget) {
          preferWords.add(w);
          break;
        }
      }
    }
  }

  const dictStats = buildDictStats(wordList);

  const hasCustom = customClues.length > 0;
  const customCount = customClues.length;
  const TOTAL_TIME_MS = hasCustom ? 110000 : 25000; // 110s for custom (API maxDuration=120)
  const totalDeadline = Date.now() + TOTAL_TIME_MS;
  // Time is the real limiter (via totalDeadline); keep the attempt cap high so
  // it never cuts a run short. Each failed attempt is cheap thanks to the AC-3
  // feasibility gate, so we churn through many layouts per second.
  const MAX_LAYOUT_ATTEMPTS = 500000;
  // With many custom words, hard grids are found by trying MANY layouts rather
  // than optimising any one heavily: fast layout gen + short solve timeout means
  // solvable layouts (which fill in <700ms) are caught while dead ones are
  // abandoned quickly. The AC-3 gate rejects provably-unsolvable layouts first.
  const LAYOUT_OPTIMIZE_ITERS = customCount >= 4 ? 600 : hasCustom ? 3000 : 3000;
  const MAX_BACKTRACKS = customCount >= 4 ? 300000 : hasCustom ? 200000 : 50000;
  const SOLVE_TIME_MS = customCount >= 4 ? 900 : hasCustom ? 6000 : 5000;

  // Required slot lengths for custom words
  const requiredLengths = customClues
    .map((c) => c.answer.toUpperCase().replace(/[^A-Z]/g, "").length)
    .filter((len) => len >= 2);

  // Shared cache of clued words per length, for the AC-3 pre-check.
  const _domCache = new Map<number, string[]>();
  const domainByLength = (len: number): string[] => {
    let words = _domCache.get(len);
    if (!words) {
      words = wordList
        .getByLength(len)
        .map((e) => e.word)
        .filter((w) => (clueDb.get(w)?.length ?? 0) > 0);
      _domCache.set(len, words);
    }
    return words;
  };

  // Precomputed set of letters that clued words of a given length offer at a
  // given position — the "full-domain support" used to keep AC-3 cheap.
  const _supportCache = new Map<number, Set<string>[]>();
  const fullSupport = (len: number, pos: number): Set<string> => {
    let byPos = _supportCache.get(len);
    if (!byPos) {
      byPos = Array.from({ length: len }, () => new Set<string>());
      for (const w of domainByLength(len)) {
        for (let i = 0; i < len; i++) byPos[i].add(w[i]);
      }
      _supportCache.set(len, byPos);
    }
    return byPos[pos];
  };

  for (let attempt = 1; attempt <= MAX_LAYOUT_ATTEMPTS; attempt++) {
    if (Date.now() > totalDeadline) break;

    // Phase 1 + 2: Generate and optimize layout
    const interiorArea = (width - 1) * (height - 1);
    const isSmallGrid = interiorArea <= 50; // 5x7 (24), 7x9 (48) etc.
    const density = isSmallGrid
      ? 0.06 + Math.random() * 0.06 // 6-12% for small grids (fewer interior blues)
      : 0.11 + Math.random() * 0.04; // 11-15% → targets ~18-24 interior blues for 11x17
    const layout = generateRandomLayout(width, height, density);
    const { layout: optimizedLayout, score } = optimizeLayout(
      layout,
      width,
      height,
      dictStats,
      LAYOUT_OPTIMIZE_ITERS,
      requiredLengths,
    );

    // Reject layouts with hard violations
    if (score < -1000) continue;

    // Convert to grid
    const grid = layoutToGrid(optimizedLayout, width, height);

    // Validate structural constraints
    const validation = validateGrid(grid);
    if (!validation.valid) continue;

    // Phase 3: Extract slots and solve
    const slots = extractSlots(grid);
    const crossings = buildCrossings(slots);

    // Pre-seed custom words if any (crossing-aware backtracking placement)
    const customAssignment = new Map<number, string>();
    if (customClues.length > 0) {
      // Sort custom words by length descending (place longest first, fewer slot options)
      const sorted = [...customClues]
        .map((c) => c.answer.toUpperCase().replace(/[^A-Z]/g, ""))
        .filter((a) => a.length >= 2)
        .sort((a, b) => b.length - a.length);

      const placed = placeCustomWords(slots, crossings, sorted, wordList, clueDb);
      // No compatible placement of all custom words in this layout: try another
      if (!placed) continue;
      for (const [slotId, word] of placed) customAssignment.set(slotId, word);
    }

    // Cheap AC-3 feasibility gate: skip provably-unsolvable layouts before
    // spending the solver's time budget thrashing on them. On success it also
    // returns pruned domains that shrink the solver's search space.
    const acDomains = arcConsistentPrecheck(slots, crossings, customAssignment, domainByLength, fullSupport);
    if (!acDomains) continue;

    // Solve with pre-seeded custom words locked in, seeded with the pruned domains
    const assignment = solveFill(slots, crossings, wordList, clueDb, MAX_BACKTRACKS, SOLVE_TIME_MS, customAssignment, acDomains, preferWords);

    if (!assignment) continue;

    // Phase 4: Write letters into grid and build word list
    const words: VectorGenResult["words"] = [];

    for (const slot of slots) {
      const word = assignment.get(slot.id);
      if (!word) continue;

      // Write letters into white cells
      for (let i = 0; i < word.length; i++) {
        const coord = slot.cells[i];
        const cell = grid.cells[coord.y][coord.x];
        if (cell.kind === "white") {
          cell.letter = word[i];
        }
      }

      // Find clue text
      const isCustom = customAssignment.has(slot.id);
      const clueText = isCustom
        ? customClues.find(
            (c) => c.answer.toUpperCase().replace(/[^A-Z]/g, "") === word,
          )?.clue ?? pickClue(word, clueDb, clueDifficulty, params.difficulty)
        : pickClue(word, clueDb, clueDifficulty, params.difficulty);

      // Write clue text into the blue cell
      const blueCell = grid.cells[slot.clueOrigin.y][slot.clueOrigin.x];
      if (blueCell.kind === "blue") {
        blueCell.clues[slot.clueIndex].answer = word;
        blueCell.clues[slot.clueIndex].text = clueText;
      }

      words.push({ slot, word, clueText, isCustom });
    }

    // Validate: every word's letters must match the grid cells
    let valid = true;
    for (const w of words) {
      for (let i = 0; i < w.word.length; i++) {
        const coord = w.slot.cells[i];
        const cell = grid.cells[coord.y][coord.x];
        if (cell.kind !== "white" || cell.letter !== w.word[i]) {
          valid = false;
          break;
        }
      }
      if (!valid) break;
    }
    if (!valid) continue; // crossing conflict, try another layout

    // Reject grids with empty clue cells ("black squares"). Every blue cell must
    // end up with at least one clue that received a word during solving — a blue
    // cell whose clues all have empty answers renders as an empty box in the
    // middle of the grid. This can happen when a blue box holds a placeholder
    // clue (layoutToGrid) or an offset clue whose run was sourced by a
    // neighbouring blue cell instead. Such layouts are rare, so retrying is far
    // cheaper than shipping a grid with holes.
    let allBluesFilled = true;
    for (let y = 0; y < grid.height && allBluesFilled; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.cells[y][x];
        if (
          cell.kind === "blue" &&
          !cell.clues.some((c) => c.answer.length > 0)
        ) {
          allBluesFilled = false;
          break;
        }
      }
    }
    if (!allBluesFilled) continue; // empty clue box, try another layout

    return {
      success: true,
      grid,
      slots,
      words,
      attempts: attempt,
    };
  }

  // All attempts failed — best effort
  const grid = createSkeletonGrid(width, height);
  return {
    success: false,
    grid,
    slots: [],
    words: [],
    attempts: MAX_LAYOUT_ATTEMPTS,
  };
}
