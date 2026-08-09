/**
 * SPIKE (Phase 0) — photo-in-grid feasibility.
 *
 * Measures whether the fléchés generator can reliably fill an 11×17 book grid
 * that has a rectangular PHOTO BLOCK reserved in it, WHILE also seating the
 * maker's custom words. This is the real book scenario, so custom words are a
 * first-class variable — a grid that fills empty but can't seat the words is
 * useless for a personalized book.
 *
 * For each preset position (corner / edge / centre) and block size, over RUNS
 * trials at a fixed custom-word count, it reports:
 *   - success%  (a success already implies ALL custom words were placed)
 *   - median / p95 wall-clock ms
 *   - correctness: no placed word crosses the block, reserved cells stay empty
 * and then climbs the custom-word count to find the reliable ceiling WITH the
 * block, to compare against the no-block baseline (~9 for 11×17).
 *
 *   pnpm tsx --env-file=.env.local scripts/spike-photo-block.ts
 *
 * Single-threaded (what production runs per worker). Fresh isolated word list
 * per run so injected custom words never bleed between trials.
 */
import {
  ensureLoaded,
  getFrenchWordList,
  getFrenchClueDb,
  getFrenchClueDifficulty,
} from "@/lib/crossword/load-french-clues";
import { generateFlecheVector, type VectorGenResult } from "@/lib/crossword/fleche-vector-gen";
import { WordList } from "@/lib/crossword/word-list";

const W = 11;
const H = 17;
const RUNS = 8;
// Single-threaded. A failing config grinds the full budget, so keep it modest —
// a corner that can't solve in 30s single-threaded isn't a reliable preset.
const TIME_BUDGET_MS = 30000;
const BW = 4;
const BH = 4;

type Rect = { x: number; y: number; w: number; h: number };

/**
 * INSET-CORNER MATRIX. Phase-0 corners failed FLUSH against the combs (x=1 /
 * y=1). Retest each corner inset off the combs by 1-2 cells (and, for the far
 * corners, inset off the grid edges too) to see whether a seedable ring of cells
 * recovers them. `center` is the known-good control.
 */
// FINAL shipping geometry: comb-adjacent sides inset 3 (proven threshold), far
// edges inset 1. Confirm every position I intend to offer, incl. top-left (the
// only one touching BOTH combs — needs x>=3 AND y>=3).
const COMB = 3;
const EDGE = 1;
const PRESETS: { name: string; rect: Rect }[] = [
  { name: "center", rect: { x: Math.round((W - BW) / 2), y: Math.round((H - BH) / 2), w: BW, h: BH } },
  { name: "top-left", rect: { x: COMB, y: COMB, w: BW, h: BH } },
  { name: "top-right", rect: { x: W - BW - EDGE, y: COMB, w: BW, h: BH } },
  { name: "bottom-left", rect: { x: COMB, y: H - BH - EDGE, w: BW, h: BH } },
  { name: "bottom-right", rect: { x: W - BW - EDGE, y: H - BH - EDGE, w: BW, h: BH } },
];

// Realistic French given names (gift recipients), by length — same profile the
// capacity guidance uses, so numbers are comparable.
const NAMES: Record<number, string[]> = {
  4: ["EMMA", "HUGO", "LOLA", "NOAH", "ADAM", "INES", "ELSA", "NINA", "ROSE", "JADE", "THEO", "MILA", "PAUL", "LINA"],
  5: ["LOUIS", "JULES", "CHLOE", "MANON", "LUCAS", "SACHA", "MARIE", "ALICE", "ELENA", "SIMON", "DAVID", "CELIA", "NOLAN"],
  6: ["MARGOT", "JULIEN", "ROMANE", "ELOISE", "AGATHE", "SOPHIE", "LOUISE", "MARTIN", "OLIVIA", "AMELIE", "SANDRA"],
};
const LENGTH_MIX = [5, 4, 6, 5, 4, 6, 5, 4, 5, 6];

function pickNames(count: number, seed: number): { answer: string; clue: string }[] {
  const chosen: { answer: string; clue: string }[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    const len = LENGTH_MIX[(i + seed) % LENGTH_MIX.length];
    const bucket = NAMES[len];
    let idx = (seed * 2654435761 + i * 40503 + len * 97) % bucket.length;
    let guard = 0;
    while (used.has(bucket[idx]) && guard < bucket.length) {
      idx = (idx + 1) % bucket.length;
      guard++;
    }
    const answer = bucket[idx];
    if (used.has(answer)) continue;
    used.add(answer);
    chosen.push({ answer, clue: "Prénom" });
  }
  return chosen;
}

const pctl = (sorted: number[], p: number) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0;

let baseEntries: [string, number][] = [];
let baseDb: Map<string, string[]>;
let clueDifficulty: Map<string, number>;

/** Correctness: no placed word cell inside the block, reserved cells stay empty. */
function crossesBlock(res: VectorGenResult, reservedRect: Rect): boolean {
  const inBlock = (x: number, y: number) =>
    x >= reservedRect.x && x < reservedRect.x + reservedRect.w &&
    y >= reservedRect.y && y < reservedRect.y + reservedRect.h;
  for (const w of res.words) {
    for (const c of w.slot.cells) if (inBlock(c.x, c.y)) return true;
  }
  for (let y = reservedRect.y; y < reservedRect.y + reservedRect.h; y++) {
    for (let x = reservedRect.x; x < reservedRect.x + reservedRect.w; x++) {
      const cell = res.grid.cells[y][x];
      if (cell.kind === "white" && cell.letter) return true;
    }
  }
  return false;
}

async function measure(label: string, count: number, reservedRect?: Rect) {
  const times: number[] = [];
  let ok = 0;
  let violations = 0;
  for (let run = 0; run < RUNS; run++) {
    const custom = pickNames(count, run + 1);
    const wl = new WordList();
    for (const [w, s] of baseEntries) wl.addWord(w, s);
    const db = new Map(baseDb);
    const t = Date.now();
    const result = generateFlecheVector(
      { width: W, height: H, customClues: custom, difficulty: "balanced", reservedRect, timeBudgetMs: TIME_BUDGET_MS },
      wl,
      db,
      clueDifficulty,
    );
    const ms = Date.now() - t;
    times.push(ms);
    if (result.success) {
      ok++;
      if (reservedRect && crossesBlock(result, reservedRect)) violations++;
    }
  }
  times.sort((a, b) => a - b);
  const rate = ok / RUNS;
  const flag = violations > 0 ? `  ⚠ ${violations} CROSS-VIOLATIONS` : "";
  console.log(
    `  ${label.padEnd(22)} words=${count}  fill=${(rate * 100).toFixed(0).padStart(3)}%  ` +
      `med=${pctl(times, 50).toString().padStart(5)}ms  p95=${pctl(times, 95).toString().padStart(5)}ms${flag}`,
  );
  return rate;
}

async function main() {
  await ensureLoaded();
  const baseWl = getFrenchWordList();
  baseDb = getFrenchClueDb();
  clueDifficulty = getFrenchClueDifficulty();
  baseEntries = [];
  for (const w of baseDb.keys()) baseEntries.push([w, baseWl.getScore(w)]);

  console.log(`\nINSET-CORNER experiment — ${W}×${H}, ${BW}×${BH} block, ${RUNS} runs/cell, single-threaded, budget ${TIME_BUDGET_MS}ms, 4 custom words\n`);

  for (const p of PRESETS) {
    await measure(p.name, 4, p.rect);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
