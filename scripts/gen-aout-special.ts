/**
 * One-off: generate the "Les Fléchés — spécial août" grid from a fixed set of
 * 18 custom words + clues, race the worker pool until ALL 18 are placed, then
 * serialize the exact solved grid to .context/aout-special.json.
 *
 * The DB write happens in a SECOND step (scripts/save-aout-special.ts) so we can
 * hand the filler words to a human for clue review before anything is persisted.
 *
 *   FLECHE_POOL_SIZE=8 caffeinate -dimsu pnpm tsx scripts/gen-aout-special.ts
 *   WIDTH=15 HEIGHT=21 pnpm tsx scripts/gen-aout-special.ts   # override size
 */
import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { FlechePool } from "@/lib/crossword/fleche-pool";
import {
  ensureLoaded,
  getFrenchWordList,
  getFrenchClueDb,
  getFrenchClueDifficulty,
} from "@/lib/crossword/load-french-clues";
import { generateFlecheVector } from "@/lib/crossword/fleche-vector-gen";
import { analyzeCapacity } from "@/lib/crossword/check-capacity";
import { normalizeAnswer } from "@/lib/crossword/normalize";
import type { VectorGenResult } from "@/lib/crossword/fleche-vector-gen";

// All 18 custom words with the user's clues, verbatim, split into two classic
// 11×17 grids (long words balanced across both so each generates reliably).
const CLUES: Record<string, string> = {
  CANICULES: "Elles nous ont fait suer",
  SEINE: "Bain parisien",
  ROCK: "En Seine en août",
  ASSOMPTION: "Elle tombe le 15",
  VLOGS: "Série d'août netesque",
  NOLAN: "Il a filmé l'Odyssée",
  LION: "C'est un signe !",
  BISON: "Futé sur les autoroutes",
  MOISSON: "Elle coupe les blés d'août",
  BRONZAGE: "Souvenir de vacances",
  CIGALE: "Elle a chanté tout l'été",
  PERSEIDES: "Elles filent dans le ciel d'août",
  SABLE: "Matière première châtelaine",
  PARASOL: "Toit de plage",
  TOURNESOL: "Il a le soleil dans le viseur",
  FIGUE: "Ni tout à fait raisin",
  PETANQUE: "On y pointe avant de tirer",
  BOUEE: "Elle empêche de couler",
};

// All 18 words across three classic 11×17 grids, long words snake-drafted so
// each grid carries at most two 9+ letter words (the reliability-limiting factor).
const GRID_WORDS: Record<string, string[]> = {
  // Single classic 11×17 grid — the user's chosen 9 words.
  K: ["CANICULES", "ROCK", "NOLAN", "BISON", "BRONZAGE", "CIGALE", "SABLE", "FIGUE", "PETANQUE"],
};

const GRIDS: Record<string, { answer: string; clue: string }[]> = Object.fromEntries(
  Object.entries(GRID_WORDS).map(([k, ws]) => [
    k,
    ws.map((answer) => ({ answer, clue: CLUES[answer] })),
  ]),
);

const GRID = (process.env.GRID || "A").toUpperCase();
const CUSTOM_CLUES = GRIDS[GRID];
if (!CUSTOM_CLUES) {
  console.error(`Unknown GRID=${GRID}. Use GRID=A or GRID=B.`);
  process.exit(1);
}

const WIDTH = Number(process.env.WIDTH) || 11;
const HEIGHT = Number(process.env.HEIGHT) || 17;
const MAX_ROUNDS = Number(process.env.ROUNDS) || 60;
const TIME_BUDGET_MS = Number(process.env.TIME_BUDGET_MS) || 45000;
const OUT = resolve(process.cwd(), ".context", `aout-special-${GRID}.json`);

async function main() {
  const norm = CUSTOM_CLUES.map((c) => normalizeAnswer(c.answer));
  const cap = analyzeCapacity(WIDTH, HEIGHT, CUSTOM_CLUES);
  console.log(`\nGrid ${WIDTH}×${HEIGHT} (${WIDTH * HEIGHT} cells) — ${CUSTOM_CLUES.length} custom words`);
  console.log(`custom letters: ${norm.reduce((n, w) => n + w.length, 0)}  fill ratio: ${(cap.fillRatio * 100).toFixed(1)}%`);
  console.log(`capacity: ${cap.message ?? (cap.tight ? "TIGHT (slow/flaky, attemptable)" : "ok")}  recommendedMax=${cap.recommendedMax}`);
  if (cap.message) {
    console.error(`\nBLOCKED by capacity guard: ${cap.message}`);
    console.error("Pick a larger grid via WIDTH/HEIGHT env and rerun.\n");
    process.exit(1);
  }

  await ensureLoaded();
  const wl = getFrenchWordList();
  const db = getFrenchClueDb();
  const diff = getFrenchClueDifficulty();

  const poolSize = Number(process.env.FLECHE_POOL_SIZE) || 8;
  const pool = new FlechePool(poolSize);
  await pool.ready();
  console.log(`\nPool ready: ${pool.size} workers. Racing up to ${MAX_ROUNDS} rounds, ${TIME_BUDGET_MS}ms budget each.\n`);

  const params = {
    width: WIDTH,
    height: HEIGHT,
    customClues: CUSTOM_CLUES,
    difficulty: (process.env.DIFF as "facile" | "moyen" | "difficile" | "balanced") || "facile",
    timeBudgetMs: TIME_BUDGET_MS,
  };

  let result: VectorGenResult | null = null;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const t = Date.now();
    let r: { result: VectorGenResult | null };
    try {
      r = await pool.generate(params, { maxWaitMs: TIME_BUDGET_MS + 10000 });
    } catch (e) {
      console.log(`round ${round}: pool error (${(e as Error).message}) — single-threaded fallback`);
      r = { result: generateFlecheVector(params, wl, new Map(db), diff) };
    }
    const secs = ((Date.now() - t) / 1000).toFixed(0);
    const placed = r.result?.words.filter((w) => w.isCustom).length ?? 0;
    console.log(`round ${round}: ${r.result?.success ? "SUCCESS" : "fail"}  (${placed}/${CUSTOM_CLUES.length} custom placed, ${secs}s)`);
    if (r.result?.success) {
      result = r.result;
      break;
    }
  }

  await pool.close();

  if (!result) {
    console.error(`\nNo full solution after ${MAX_ROUNDS} rounds. Try a larger grid (WIDTH/HEIGHT) or more ROUNDS.\n`);
    process.exit(1);
  }

  const { grid, words } = result;
  const customSet = new Set(norm);

  // Build pattern/solution exactly like src/app/api/fleche/generate/route.ts.
  let pattern = "";
  let solution = "";
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      pattern += cell.kind === "blue" ? "#" : ".";
      solution += cell.kind === "white" && cell.letter ? cell.letter : "#";
    }
  }

  const wordRows = words.map((w, i) => ({
    answer: w.word,
    direction: w.slot.direction === "horizontal" ? "right" : "down",
    number: i + 1,
    startRow: w.slot.cells[0].y,
    startCol: w.slot.cells[0].x,
    length: w.slot.length,
    clueText: w.clueText,
    isCustom: w.isCustom,
    difficulty: w.difficulty,
    breaks: null as string | null, // all custom answers are single words here
  }));

  const missing = norm.filter((a) => !words.some((w) => w.isCustom && w.word === a));
  const fillers = wordRows.filter((w) => !w.isCustom);

  mkdirSync(resolve(process.cwd(), ".context"), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        width: grid.width,
        height: grid.height,
        pattern,
        solution,
        hiddenWord: null,
        words: wordRows,
        customAnswers: [...customSet],
      },
      null,
      2,
    ),
  );

  console.log(`\n${"=".repeat(60)}`);
  console.log(`SOLVED ${grid.width}×${grid.height}. Total words: ${wordRows.length}  (custom ${wordRows.length - fillers.length}, fillers ${fillers.length})`);
  if (missing.length) console.log(`!! MISSING custom words: ${missing.join(", ")}`);
  console.log(`Saved solved grid → ${OUT}`);
  console.log(`${"=".repeat(60)}\n`);

  console.log("FILLER WORDS (need clue review) with the corpus-suggested clue:\n");
  for (const f of fillers.sort((a, b) => a.answer.localeCompare(b.answer))) {
    console.log(`${f.answer.padEnd(14)} | ${f.clueText}`);
  }
  console.log(`\n(${fillers.length} filler words.)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
