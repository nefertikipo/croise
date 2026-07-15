/**
 * Before/after check for the known-word preference: generates grids with the
 * bias OFF (old behavior) vs ON, and measures the recognizability (known_score)
 * of the words the generator actually places, plus success rate and attempts
 * (a speed proxy). Loads from the DB (async), so it reflects production.
 *
 *   pnpm tsx scripts/compare-known-bias.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  ensureLoaded,
  getFrenchWordList,
  getFrenchClueDb,
} from "@/lib/crossword/load-french-clues";
import { generateFlecheVector } from "@/lib/crossword/fleche-vector-gen";

const RUNS = 12;
const SIZE = { width: 11, height: 17 };

function analyze(
  result: ReturnType<typeof generateFlecheVector>,
  score: (w: string) => number
) {
  const placed = result.words.filter((w) => !w.isCustom);
  const scores = placed.map((w) => score(w.word));
  const mean = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  const obscure = scores.filter((s) => s <= 2).length; // count of unknown fill
  return {
    success: result.success,
    attempts: result.attempts,
    words: placed.length,
    mean,
    obscure,
    obscurePct: (100 * obscure) / (placed.length || 1),
  };
}

async function runSet(bias: string, score: (w: string) => number) {
  process.env.FAMILIARITY_BIAS = bias;
  const wordList = getFrenchWordList();
  const clueDb = getFrenchClueDb();
  const rows = [];
  let totalPlaced = 0; // sum of placed words across all grids
  const seen = new Set<string>(); // distinct words across all grids (variety)
  for (let i = 0; i < RUNS; i++) {
    const r = generateFlecheVector(SIZE, wordList, clueDb);
    rows.push(analyze(r, score));
    for (const w of r.words) if (!w.isCustom) {
      totalPlaced++;
      seen.add(w.word);
    }
  }
  const avg = (f: (r: (typeof rows)[number]) => number) =>
    rows.reduce((a, r) => a + f(r), 0) / rows.length;
  return {
    successRate: (100 * rows.filter((r) => r.success).length) / rows.length,
    meanKnown: avg((r) => r.mean),
    obscurePerGrid: avg((r) => r.obscure),
    obscurePct: avg((r) => r.obscurePct),
    attempts: avg((r) => r.attempts),
    words: avg((r) => r.words),
    // Vocabulary variety: distinct words / total placed across all grids.
    // Higher = more varied (good for a book of many puzzles). A collapse here
    // means the bias is too strong and reuses the same common words everywhere.
    distinctRatio: seen.size / (totalPlaced || 1),
  };
}

async function main() {
  await ensureLoaded();
  const wl = getFrenchWordList();
  const score = (w: string) => wl.getScore(w);

  console.log(`Generating ${RUNS}× ${SIZE.width}x${SIZE.height} per setting...\n`);

  const results: Record<string, Awaited<ReturnType<typeof runSet>>> = {};
  for (const bias of ["0", "1", "2"]) {
    results[bias] = await runSet(bias, score);
  }

  const fmt = (r: Awaited<ReturnType<typeof runSet>>) =>
    `success ${r.successRate.toFixed(0)}%  meanKnown ${r.meanKnown.toFixed(
      2
    )}  obscure/grid ${r.obscurePerGrid.toFixed(1)} (${r.obscurePct.toFixed(
      0
    )}%)  attempts ${r.attempts.toFixed(1)}  words ${r.words.toFixed(
      0
    )}  variety ${(100 * r.distinctRatio).toFixed(0)}%`;

  console.log(`bias 0 (OFF, old):  ${fmt(results["0"])}`);
  console.log(`bias 1 (default):   ${fmt(results["1"])}`);
  console.log(`bias 2 (stronger):  ${fmt(results["2"])}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
