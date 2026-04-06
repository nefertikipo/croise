// =============================================================================
// fleche-math.ts — Vector-based mathematical model for mots fléchés
// =============================================================================
// Every clue is defined by two vectors:
//   - Target offset (v): where the word begins relative to the clue box
//   - Directional flow (d): which axis the word travels along
//
// The i-th letter of a word (i=0 is first) is at:
//   P(i) = (x_c + Δx + i·dx, y_c + Δy + i·dy)
// =============================================================================

// ---------------------------------------------------------------------------
// Core vector types
// ---------------------------------------------------------------------------

/** A 2D integer vector */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Grid coordinates (column, row) */
export interface Coord {
  readonly x: number; // column (0 = left)
  readonly y: number; // row (0 = top)
}

// ---------------------------------------------------------------------------
// Standard vector pairs
// ---------------------------------------------------------------------------

/** Target offset + directional flow that define a clue's word placement */
export interface CluePlacement {
  /** Where the word begins relative to the clue box */
  readonly target: Vec2;
  /** Which axis the word travels along */
  readonly flow: Vec2;
}

/** Straight right: ► word starts immediately right, flows right */
export const STRAIGHT_RIGHT: CluePlacement = {
  target: { x: 1, y: 0 },
  flow: { x: 1, y: 0 },
};

/** Straight down: ▼ word starts immediately below, flows down */
export const STRAIGHT_DOWN: CluePlacement = {
  target: { x: 0, y: 1 },
  flow: { x: 0, y: 1 },
};

/** Offset right (bent arrow): word starts one right + one down, flows right */
export const OFFSET_RIGHT: CluePlacement = {
  target: { x: 1, y: 1 },
  flow: { x: 1, y: 0 },
};

/** Offset down (bent arrow): word starts one right + one down, flows down */
export const OFFSET_DOWN: CluePlacement = {
  target: { x: 1, y: 1 },
  flow: { x: 0, y: 1 },
};

// ---------------------------------------------------------------------------
// Cell types
// ---------------------------------------------------------------------------

export type CellKind = "blue" | "white";

/** A clue definition living inside a blue box */
export interface Clue {
  /** Placement vectors for this clue */
  readonly placement: CluePlacement;
  /** The word answer (filled during solving, empty string before) */
  answer: string;
  /** The clue text (filled during solving, empty string before) */
  text: string;
}

/** A blue (clue) box: holds 1-2 clues */
export interface BlueCell {
  readonly kind: "blue";
  readonly coord: Coord;
  /** 1 or 2 clues per blue box */
  readonly clues: Clue[];
}

/** A white (letter) box: holds exactly one letter */
export interface WhiteCell {
  readonly kind: "white";
  readonly coord: Coord;
  /** The letter (empty string until filled) */
  letter: string;
}

export type Cell = BlueCell | WhiteCell;

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export interface Grid {
  readonly width: number;
  readonly height: number;
  /** cells[y][x] — row-major, y is row, x is column */
  readonly cells: Cell[][];
}

// ---------------------------------------------------------------------------
// Letter position calculation
// ---------------------------------------------------------------------------

/**
 * Compute the coordinate of the i-th letter (0-indexed) of a word
 * defined by a clue at origin (x_c, y_c) with the given placement.
 *
 * P(i) = (x_c + Δx + i·dx, y_c + Δy + i·dy)
 */
export function letterPosition(origin: Coord, placement: CluePlacement, i: number): Coord {
  return {
    x: origin.x + placement.target.x + i * placement.flow.x,
    y: origin.y + placement.target.y + i * placement.flow.y,
  };
}

/**
 * Compute all letter coordinates for a word of given length.
 */
export function wordPositions(origin: Coord, placement: CluePlacement, length: number): Coord[] {
  const positions: Coord[] = [];
  for (let i = 0; i < length; i++) {
    positions.push(letterPosition(origin, placement, i));
  }
  return positions;
}

/**
 * Maximum word length from a clue origin before going out of bounds.
 */
export function maxWordLength(origin: Coord, placement: CluePlacement, width: number, height: number): number {
  let i = 0;
  while (true) {
    const p = letterPosition(origin, placement, i);
    if (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) break;
    i++;
  }
  return i;
}

// ---------------------------------------------------------------------------
// Constraint validation
// ---------------------------------------------------------------------------

/**
 * Check if a coordinate is within grid bounds.
 */
export function inBounds(coord: Coord, width: number, height: number): boolean {
  return coord.x >= 0 && coord.x < width && coord.y >= 0 && coord.y < height;
}

/**
 * Manhattan distance between two coordinates.
 */
export function manhattan(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Potence-specific offsets: fire into the border cells adjacent to (0,0).
 * - POTENCE_RIGHT: target (0,1) = row 1 starting at col 0 (includes the col-0 white cell)
 * - POTENCE_DOWN: target (1,0) = col 1 starting at row 0 (includes the row-0 white cell)
 */
export const POTENCE_RIGHT: CluePlacement = {
  target: { x: 0, y: 1 },
  flow: { x: 1, y: 0 },
};

export const POTENCE_DOWN: CluePlacement = {
  target: { x: 1, y: 0 },
  flow: { x: 0, y: 1 },
};

/**
 * Constraint 1: Potence — (0,0) is always blue.
 * Fires into the adjacent border cells:
 *   - POTENCE_RIGHT: horizontal word in row 1, starting at (0,1) — includes col-0 white cell
 *   - POTENCE_DOWN: vertical word in col 1, starting at (1,0) — includes row-0 white cell
 */
export function createPotenceCell(): BlueCell {
  return {
    kind: "blue",
    coord: { x: 0, y: 0 },
    clues: [
      { placement: POTENCE_RIGHT, answer: "", text: "" },
      { placement: POTENCE_DOWN, answer: "", text: "" },
    ],
  };
}

/**
 * Top comb offset: fires into the NEXT column starting at ROW 0.
 * Target (1,0) means the word starts at the white cell in row 0 of the next column,
 * then flows down. This ensures the row-0 white cells are part of a vertical word.
 */
export const TOP_COMB_OFFSET: CluePlacement = {
  target: { x: 1, y: 0 },
  flow: { x: 0, y: 1 },
};

/**
 * Left comb offset: fires into the NEXT row starting at COL 0.
 * Target (0,1) means the word starts at the white cell in col 0 of the next row,
 * then flows right. This ensures the col-0 white cells are part of a horizontal word.
 */
export const LEFT_COMB_OFFSET: CluePlacement = {
  target: { x: 0, y: 1 },
  flow: { x: 1, y: 0 },
};

/**
 * Constraint 2: Top comb — blue boxes at even x in row 0 (excluding potence).
 * Each holds two clues, both flowing down:
 *   - Clue 1: STRAIGHT_DOWN target (0,1) into this column starting at row 1
 *   - Clue 2: TOP_COMB_OFFSET target (1,0) into next column starting at row 0
 *     (includes the row-0 white cell as the first letter)
 * Exception: last even column (x=width-1 if even) holds only one clue.
 */
export function createTopCombCells(width: number): BlueCell[] {
  const cells: BlueCell[] = [];
  for (let x = 2; x < width; x += 2) {
    const isLastColumn = x === width - 1;
    const clues: Clue[] = [
      { placement: STRAIGHT_DOWN, answer: "", text: "" },
    ];
    if (!isLastColumn) {
      clues.push({ placement: TOP_COMB_OFFSET, answer: "", text: "" });
    }
    cells.push({ kind: "blue", coord: { x, y: 0 }, clues });
  }
  return cells;
}

/**
 * Constraint 3: Left comb — blue boxes at even y in column 0 (excluding potence).
 * Each holds two clues, both flowing right:
 *   - Clue 1: STRAIGHT_RIGHT target (1,0) into this row starting at col 1
 *   - Clue 2: LEFT_COMB_OFFSET target (0,1) into next row starting at col 0
 *     (includes the col-0 white cell as the first letter)
 * Exception: last even row (y=height-1 if even) holds only one clue.
 */
export function createLeftCombCells(height: number): BlueCell[] {
  const cells: BlueCell[] = [];
  for (let y = 2; y < height; y += 2) {
    const isLastRow = y === height - 1;
    const clues: Clue[] = [
      { placement: STRAIGHT_RIGHT, answer: "", text: "" },
    ];
    if (!isLastRow) {
      clues.push({ placement: LEFT_COMB_OFFSET, answer: "", text: "" });
    }
    cells.push({ kind: "blue", coord: { x: 0, y }, clues });
  }
  return cells;
}

/**
 * Constraint 4: Interior non-adjacency.
 * Two interior blue boxes (x>0 AND y>0) cannot share a flat edge.
 * Returns true if placing a blue box at `coord` violates no adjacency constraint
 * given the existing set of interior blue box coordinates.
 */
export function isInteriorPlacementValid(
  coord: Coord,
  interiorBlueCoords: ReadonlySet<string>,
): boolean {
  if (coord.x <= 0 || coord.y <= 0) return true; // potence/comb cells are exempt
  const neighbors: Coord[] = [
    { x: coord.x - 1, y: coord.y },
    { x: coord.x + 1, y: coord.y },
    { x: coord.x, y: coord.y - 1 },
    { x: coord.x, y: coord.y + 1 },
  ];
  for (const n of neighbors) {
    if (n.x > 0 && n.y > 0 && interiorBlueCoords.has(coordKey(n))) {
      return false;
    }
  }
  return true;
}

/**
 * Constraint 5: Custom word seed placement constraints.
 * Returns true if a custom word can legally start at the given coordinate.
 */
export function isValidSeedPosition(
  start: Coord,
  flow: Vec2,
): boolean {
  const isHorizontal = flow.x === 1 && flow.y === 0;
  const isVertical = flow.x === 0 && flow.y === 1;

  if (isHorizontal) {
    // Cannot run across top border
    if (start.y === 0) return false;
    // Can only start on left edge if on an odd row
    if (start.x === 0 && start.y % 2 === 0) return false;
  }

  if (isVertical) {
    // Cannot run down left border
    if (start.x === 0) return false;
    // Can only start on top edge if on an odd column
    if (start.y === 0 && start.x % 2 === 0) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Serialize a coordinate to a string key for Set/Map usage */
export function coordKey(coord: Coord): string {
  return `${coord.x},${coord.y}`;
}

/** Deserialize a coordinate key */
export function parseCoordKey(key: string): Coord {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

// ---------------------------------------------------------------------------
// Grid initialization — build the potence + combs skeleton
// ---------------------------------------------------------------------------

/**
 * Create an empty grid with potence and comb cells pre-placed.
 * All other cells start as white with empty letters.
 */
export function createSkeletonGrid(width: number, height: number): Grid {
  // Start with all white cells
  const cells: Cell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ kind: "white", coord: { x, y }, letter: "" });
    }
    cells.push(row);
  }

  // Place potence at (0,0)
  const potence = createPotenceCell();
  cells[0][0] = potence;

  // Place top comb: even x in row 0 (x=2,4,6,8,10)
  const topComb = createTopCombCells(width);
  for (const cell of topComb) {
    cells[0][cell.coord.x] = cell;
  }

  // Place left comb: even y in col 0 (y=2,4,6,8,10,12,14,16)
  const leftComb = createLeftCombCells(height);
  for (const cell of leftComb) {
    cells[cell.coord.y][0] = cell;
  }

  return { width, height, cells };
}

// ---------------------------------------------------------------------------
// Grid queries
// ---------------------------------------------------------------------------

/** Get the cell at a coordinate, or undefined if out of bounds */
export function getCell(grid: Grid, coord: Coord): Cell | undefined {
  if (!inBounds(coord, grid.width, grid.height)) return undefined;
  return grid.cells[coord.y][coord.x];
}

/** Check if a cell is blue */
export function isBlue(grid: Grid, coord: Coord): boolean {
  const cell = getCell(grid, coord);
  return cell !== undefined && cell.kind === "blue";
}

/** Check if a cell is white */
export function isWhite(grid: Grid, coord: Coord): boolean {
  const cell = getCell(grid, coord);
  return cell !== undefined && cell.kind === "white";
}

/** Get all blue cell coordinates in the grid */
export function allBlueCells(grid: Grid): BlueCell[] {
  const result: BlueCell[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      if (cell.kind === "blue") result.push(cell);
    }
  }
  return result;
}

/** Get all interior blue cell coordinates (x>0 AND y>0) */
export function interiorBlueCells(grid: Grid): BlueCell[] {
  return allBlueCells(grid).filter((c) => c.coord.x > 0 && c.coord.y > 0);
}

/** Build a Set of interior blue coord keys for fast adjacency lookups */
export function interiorBlueSet(grid: Grid): Set<string> {
  const set = new Set<string>();
  for (const cell of interiorBlueCells(grid)) {
    set.add(coordKey(cell.coord));
  }
  return set;
}

// ---------------------------------------------------------------------------
// Validation — check all constraints on a completed or partial grid
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  violations: string[];
}

/**
 * Validate all mathematical constraints on the grid.
 * Returns detailed violation messages for debugging.
 */
export function validateGrid(grid: Grid): ValidationResult {
  const violations: string[] = [];

  // Constraint 1: Potence
  if (!isBlue(grid, { x: 0, y: 0 })) {
    violations.push("Potence: (0,0) must be blue");
  }

  // Constraint 2: Top comb
  for (let x = 2; x < grid.width; x += 2) {
    if (!isBlue(grid, { x, y: 0 })) {
      violations.push(`Top comb: (${x},0) must be blue`);
    }
  }
  // Odd columns in row 0 must be white
  for (let x = 1; x < grid.width; x += 2) {
    if (!isWhite(grid, { x, y: 0 })) {
      violations.push(`Top comb: (${x},0) must be white`);
    }
  }

  // Constraint 3: Left comb
  for (let y = 2; y < grid.height; y += 2) {
    if (!isBlue(grid, { x: 0, y })) {
      violations.push(`Left comb: (0,${y}) must be blue`);
    }
  }
  // Odd rows in col 0 must be white
  for (let y = 1; y < grid.height; y += 2) {
    if (!isWhite(grid, { x: 0, y })) {
      violations.push(`Left comb: (0,${y}) must be white`);
    }
  }

  // Constraint 4: Interior non-adjacency
  // No two interior blue cells (x>0 AND y>0) may share an edge.
  const intBlues = interiorBlueCells(grid);
  const intBlueKeys = interiorBlueSet(grid);
  for (const cell of intBlues) {
    const neighbors: Coord[] = [
      { x: cell.coord.x + 1, y: cell.coord.y },
      { x: cell.coord.x, y: cell.coord.y + 1 },
    ];
    for (const n of neighbors) {
      if (n.x > 0 && n.y > 0 && intBlueKeys.has(coordKey(n))) {
        violations.push(
          `Interior adjacency: (${cell.coord.x},${cell.coord.y}) and (${n.x},${n.y}) share an edge`,
        );
      }
    }
  }

  // Constraint 5: Comb-touching limits
  // At most 1 interior blue may touch the left comb (position (1, even y)).
  // No interior blue may touch the top comb (position (even x, 1)).
  let leftCombTouching = 0;
  let topCombTouching = 0;
  for (const cell of intBlues) {
    if (cell.coord.x === 1 && cell.coord.y % 2 === 0) leftCombTouching++;
    if (cell.coord.y === 1 && cell.coord.x % 2 === 0) topCombTouching++;
  }
  if (leftCombTouching > 1) {
    violations.push(`Comb-touching: ${leftCombTouching} interior blues touch left comb (max 1)`);
  }
  if (topCombTouching > 0) {
    violations.push(`Comb-touching: ${topCombTouching} interior blues touch top comb (max 0)`);
  }

  // Constraint 6: No orphan blue cells — every interior blue must define at least one word
  for (const cell of intBlues) {
    if (cell.clues.length === 0) {
      violations.push(`Orphan blue: (${cell.coord.x},${cell.coord.y}) has no clues`);
    }
  }

  // No empty cells: every cell must be blue or white-with-letter (for completed grids)
  // Skipped for partial grids — caller can check separately

  return {
    valid: violations.length === 0,
    violations,
  };
}
