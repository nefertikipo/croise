// =============================================================================
// american/grid-templates.ts — curated library of valid symmetric block patterns
// =============================================================================
// Per the research (docs/american-crossword-design.md): professional constructors
// fill from a LIBRARY of pre-validated symmetric grid templates rather than
// generating black-square patterns fresh. This isolates the fill problem and
// guarantees a structurally valid grid. Fresh generation can come later.
//
// A template is authored as text rows: '#' = black block, '.' = white cell.
// Every template must satisfy the five hard American rules, enforced by
// `validateTemplate` and asserted at module load:
//   1. Minimum word length 3 (no horizontal/vertical white run shorter than 3)
//   2. No fully-void row or column
//   3. Full orthogonal connectivity of white cells
//   4. Every white cell checked (implied by rule 1 on both axes)
//   5. 180-degree rotational symmetry of the block pattern
// =============================================================================

export interface GridTemplate {
  id: string;
  width: number;
  height: number;
  /** `true` = black block, `false` = white letter cell. Row-major [y][x]. */
  blocks: boolean[][];
  /**
   * If set, this is a "theme" template built around a symmetric PAIR of across
   * slots of this exact length — the slots that hold long personalized/theme
   * words. Undefined for plain (short-word) templates.
   */
  themeLength?: number;
}

interface RawTemplate {
  id: string;
  rows: string[];
  themeLength?: number;
}

/** Parse authored text rows into a block matrix. */
function parseRows(rows: string[]): boolean[][] {
  return rows.map((r) => [...r.replace(/\s/g, "")].map((c) => c === "#"));
}

/**
 * Validate a block matrix against the five hard rules. Returns a list of human
 * readable errors (empty = valid).
 */
export function validateTemplate(blocks: boolean[][]): string[] {
  const errors: string[] = [];
  const h = blocks.length;
  const w = blocks[0]?.length ?? 0;
  if (h === 0 || w === 0) return ["empty grid"];
  if (blocks.some((r) => r.length !== w)) return ["ragged rows"];

  const isWhite = (x: number, y: number) => !blocks[y][x];

  // Rule 5: 180-degree rotational symmetry.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (blocks[y][x] !== blocks[h - 1 - y][w - 1 - x]) {
        errors.push(`not symmetric at (${x},${y})`);
        break;
      }
    }
  }

  // Rule 1: no horizontal or vertical white run shorter than 3 (this also
  // guarantees rule 4 — every white cell is in both an across and a down word).
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x <= w; x++) {
      if (x < w && isWhite(x, y)) run++;
      else {
        if (run === 1 || run === 2) errors.push(`across run of ${run} at row ${y}`);
        run = 0;
      }
    }
  }
  for (let x = 0; x < w; x++) {
    let run = 0;
    for (let y = 0; y <= h; y++) {
      if (y < h && isWhite(x, y)) run++;
      else {
        if (run === 1 || run === 2) errors.push(`down run of ${run} at col ${x}`);
        run = 0;
      }
    }
  }

  // Rule 2: no fully-void row or column.
  for (let y = 0; y < h; y++) {
    if (blocks[y].every((b) => b)) errors.push(`fully-black row ${y}`);
  }
  for (let x = 0; x < w; x++) {
    if (blocks.every((r) => r[x])) errors.push(`fully-black col ${x}`);
  }

  // Rule 3: full orthogonal connectivity of white cells (flood fill).
  let firstWhite: [number, number] | null = null;
  let whiteCount = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isWhite(x, y)) {
        whiteCount++;
        if (!firstWhite) firstWhite = [x, y];
      }
    }
  }
  if (firstWhite) {
    const seen = new Set<string>();
    const stack = [firstWhite];
    seen.add(`${firstWhite[0]},${firstWhite[1]}`);
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (!isWhite(nx, ny)) continue;
        const k = `${nx},${ny}`;
        if (seen.has(k)) continue;
        seen.add(k);
        stack.push([nx, ny]);
      }
    }
    if (seen.size !== whiteCount) {
      errors.push(`disconnected: ${seen.size}/${whiteCount} white cells reachable`);
    }
  }

  return errors;
}

// -----------------------------------------------------------------------------
// The library. Authored as text; validated at load. '#' = block, '.' = white.
// -----------------------------------------------------------------------------

const RAW: RawTemplate[] = [
  {
    // 7x7 — smallest useful grid. Words of length 3 and 7. Good fast smoke test.
    id: "mini-7",
    rows: [
      "...#...",
      "...#...",
      ".......",
      "##...##",
      ".......",
      "...#...",
      "...#...",
    ],
  },
  {
    // 9x9 — max word 6. (Generated + validated; see scripts/_gen-am-templates.ts.)
    id: "small-9",
    rows: [
      "...###...",
      "...#.....",
      "...#.....",
      "......###",
      "#...#...#",
      "###......",
      ".....#...",
      ".....#...",
      "...###...",
    ],
  },
  {
    // 11x11 — max word 5, ~26% blocks. Ideal default: fills easily, real size.
    id: "medium-11",
    rows: [
      "#...###...#",
      ".....#.....",
      ".....#.....",
      "...#...#...",
      "##....#...#",
      "###.....###",
      "#...#....##",
      "...#...#...",
      ".....#.....",
      ".....#.....",
      "#...###...#",
    ],
  },
  {
    // 13x13 — max word 6.
    id: "large-13",
    rows: [
      "#....###....#",
      "......#......",
      "......#......",
      "....#...##...",
      "##.....##....",
      "####...#....#",
      "###...#...###",
      "#....#...####",
      "....##.....##",
      "...##...#....",
      "......#......",
      "......#......",
      "#....###....#",
    ],
  },
  {
    // 15x15 — max word 6, standard American daily size.
    id: "daily-15",
    rows: [
      "...##....#...##",
      "...#.....#.....",
      "...#.....#.....",
      "##...####......",
      "###...##....###",
      "#.....##......#",
      "...#.....###...",
      "...###...###...",
      "...###.....#...",
      "#......##.....#",
      "###....##...###",
      "......####...##",
      ".....#.....#...",
      ".....#.....#...",
      "##...#....##...",
    ],
  },
  {
    // 21x21 — the classic Sunday size. Max word 7, ~30% blocks for easy fill.
    id: "sunday-21",
    rows: [
      "###...###...####...##",
      ".......#.....##......",
      ".......#.....#.......",
      "...###...#......##...",
      "#...###...###...##...",
      "....###...#...###....",
      ".....##...#...##....#",
      "...#....##...##...###",
      "####.....#....#....##",
      ".......#....#...#....",
      "....#.....#.....#....",
      "....#...#....#.......",
      "##....#....#.....####",
      "###...##...##....#...",
      "#....##...#...##.....",
      "....###...#...###....",
      "...##...###...###...#",
      "...##......#...###...",
      ".......#.....#.......",
      "......##.....#.......",
      "##...####...###...###",
    ],
  },
];

// Theme templates: each has a symmetric pair of long across slots of the given
// `themeLength`, with short fill (max non-theme run ~4-5). Generated + validated
// via scripts/_gen-theme.ts. These hold long personalized words (a 12-letter
// name, ANNIVERSAIRE, etc.) that the plain short-word templates can't fit.
const RAW_THEME: RawTemplate[] = [
  { id: "theme-6", themeLength: 6, rows: [
    "##...##...#", "##...##....", "......#....", "...##......", "...##...###",
    "##...#...##", "###...##...", "......##...", "....#......", "....##...##",
    "#...##...##",
  ]},
  { id: "theme-7", themeLength: 7, rows: [
    "#...##...##", ".....#.....", ".....#.....", ".......#...", "##....##...",
    "####...####", "...##....##", "...#.......", ".....#.....", ".....#.....",
    "##...##...#",
  ]},
  { id: "theme-8", themeLength: 8, rows: [
    "###...##...", "##....##...", "#.....#....", "...##.....#", "........###",
    ".....#.....", "###........", "#.....##...", "....#.....#", "...##....##",
    "...##...###",
  ]},
  { id: "theme-9", themeLength: 9, rows: [
    "...####.....#", "...###......#", ".....#......#", "##...#....###", "###...##....#",
    ".........#...", "...##...##...", "...#.........", "#....##...###", "###....#...##",
    "#......#.....", "#......###...", "#.....####...",
  ]},
  { id: "theme-10", themeLength: 10, rows: [
    "...###...#...", "...###...#...", "....##...#...", "###...#.....#", "..........###",
    "...#...##...#", "...##...##...", "#...##...#...", "###..........", "#.....#...###",
    "...#...##....", "...#...###...", "...#...###...",
  ]},
  { id: "theme-11", themeLength: 11, rows: [
    "###...###...#", "###...###....", "##....#......", "....##...#...", "...###...####",
    "...........##", "##....#....##", "##...........", "####...###...", "...#...##....",
    "......#....##", "....###...###", "#...###...###",
  ]},
  { id: "theme-12", themeLength: 12, rows: [
    "###...##...##", "#.....##....#", "......##....#", "...###...#...", "...##...##...",
    "#............", "###...#...###", "............#", "...##...##...", "...#...###...",
    "#....##......", "#....##.....#", "##...##...###",
  ]},
  { id: "theme-13", themeLength: 13, rows: [
    "...##...###...#", "...##...###....", "...#....##.....", ".....###...#...", "###...##....###",
    "#.............#", "...##...##.....", "...###...###...", ".....##...##...", "#.............#",
    "###....##...###", "...#...###.....", ".....##....#...", "....###...##...", "#...###...##...",
  ]},
  { id: "theme-14", themeLength: 14, rows: [
    "#...###...##...", "....##.....#...", ".....#.....#...", "..............#", "##....###...###",
    "####...###.....", "...##...####...", "...###...###...", "...####...##...", ".....###...####",
    "###...###....##", "#..............", "...#.....#.....", "...#.....##....", "...##...###...#",
  ]},
  { id: "theme-15", themeLength: 15, rows: [
    "#...###...##...", "....##....#....", "...............", "...#....##....#", "###...###...###",
    "#.....##...####", "....###...##...", "...###...###...", "...##...###....", "####...##.....#",
    "###...###...###", "#....##....#...", "...............", "....#....##....", "...##...###...#",
  ]},
];

function build(raw: RawTemplate): GridTemplate {
  const blocks = parseRows(raw.rows);
  const errors = validateTemplate(blocks);
  if (errors.length > 0) {
    throw new Error(`Invalid grid template "${raw.id}": ${errors.join("; ")}`);
  }
  return {
    id: raw.id,
    width: blocks[0].length,
    height: blocks.length,
    blocks,
    themeLength: raw.themeLength,
  };
}

/** Plain (short-word) templates offered directly in the size picker. */
export const TEMPLATES: GridTemplate[] = RAW.map(build);

/** Theme templates (long-slot pairs), keyed by their theme-word length. */
export const THEME_TEMPLATES: GridTemplate[] = RAW_THEME.map(build);

export function getTemplate(id: string): GridTemplate | undefined {
  return [...TEMPLATES, ...THEME_TEMPLATES].find((t) => t.id === id);
}

/** The theme template whose long slots are exactly `length` cells, if any. */
export function themeTemplateFor(length: number): GridTemplate | undefined {
  return THEME_TEMPLATES.find((t) => t.themeLength === length);
}

/** Longest theme-word length any theme template can hold. */
export const MAX_THEME_LENGTH = Math.max(
  0,
  ...THEME_TEMPLATES.map((t) => t.themeLength ?? 0),
);

/** Templates sorted small→large, for picking by difficulty/size. */
export const TEMPLATES_BY_SIZE = [...TEMPLATES].sort(
  (a, b) => a.width * a.height - b.width * b.height,
);
