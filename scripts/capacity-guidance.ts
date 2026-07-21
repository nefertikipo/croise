/**
 * Per-size custom-word capacity with a REALISTIC word profile — French gift-
 * recipient names (common letters), which is what users actually type. Produces
 * the "you can add up to N words" table that drives the UI indication.
 *
 * Single-threaded by default (what production runs today). MODE=pool races the
 * worker pool to show the ceiling if we parallelize. Fresh isolated state per run.
 *
 * Run under caffeinate so laptop sleep can't corrupt wall-clock timings:
 *   caffeinate -dimsu pnpm tsx scripts/capacity-guidance.ts
 *   MODE=pool caffeinate -dimsu pnpm tsx scripts/capacity-guidance.ts
 */
import {
  ensureLoaded,
  getFrenchWordList,
  getFrenchClueDb,
  getFrenchClueDifficulty,
} from "@/lib/crossword/load-french-clues";
import { generateFlecheVector } from "@/lib/crossword/fleche-vector-gen";
import { analyzeCapacity } from "@/lib/crossword/check-capacity";
import { WordList } from "@/lib/crossword/word-list";
import { FlechePool } from "@/lib/crossword/fleche-pool";

const SIZES = [
  { w: 5, h: 7, label: "5×7" },
  { w: 8, h: 11, label: "8×11" },
  { w: 9, h: 13, label: "9×13" },
  { w: 11, h: 15, label: "11×15" },
  { w: 11, h: 17, label: "11×17" },
];
const RUNS = 8;
const COUNT_LADDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MODE = process.env.MODE === "pool" ? "pool" : "single";

// Realistic French given names (gift recipients), common-letter, by length.
const NAMES: Record<number, string[]> = {
  3: ["LEA", "EVE", "IDA", "LOU", "TIM", "SAM", "NIL", "ELI", "ANA", "IVO"],
  4: ["EMMA", "HUGO", "LOLA", "NOAH", "ADAM", "INES", "ANNA", "ELSA", "NINA", "ROSE", "LUCA", "JADE", "THEO", "MILA", "PAUL", "LINA"],
  5: ["LOUIS", "JULES", "CHLOE", "MANON", "LUCAS", "ROMEO", "SACHA", "ANAIS", "MARIE", "ALICE", "ELENA", "SIMON", "DAVID", "LILOU", "NORAH", "CELIA", "NOLAN", "MAELI"],
  6: ["MARGOT", "JULIEN", "ROMANE", "ELOISE", "AGATHE", "SOPHIE", "NICOLE", "DENISE", "ODETTE", "LOUISE", "GAELLE", "MARTIN", "OLIVIA", "AMELIE", "RENAUD", "SANDRA"],
  7: ["RAPHAEL", "VALERIE", "CORINNE", "MARTINE", "MATHIEU", "ANTOINE", "AURELIE", "LEONARD", "SEVERIN", "FLORINE", "CLEMENT", "MAURICE"],
  8: ["MATHILDE", "CAROLINE", "JULIETTE", "AMANDINE", "STEPHANE", "BERTRAND", "EMMANUEL", "VERONICA", "FRANCINE", "GERALDINE"],
  9: ["CHARLOTTE", "ALEXANDRE", "CHRISTINE", "GENEVIEVE", "CATHERINE", "GABRIELLE", "JOSEPHINE", "SEBASTIEN"],
};
const LENGTH_MIX = [5, 4, 6, 5, 4, 7, 6, 5, 4, 8, 5, 6, 4, 7, 5, 6];

function pickNames(count: number, maxDim: number, seed: number) {
  const chosen: { answer: string; clue: string }[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    let len = Math.min(LENGTH_MIX[(i + seed) % LENGTH_MIX.length], maxDim);
    let bucket = NAMES[len];
    let tries = 0;
    while ((!bucket || bucket.length === 0) && tries < 8) {
      len = Math.max(3, len - 1);
      bucket = NAMES[len];
      tries++;
    }
    if (!bucket) continue;
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

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
function pctl(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function main() {
  await ensureLoaded();
  const baseWl = getFrenchWordList();
  const baseDb = getFrenchClueDb();
  const clueDifficulty = getFrenchClueDifficulty();
  const baseEntries: [string, number][] = [];
  for (const w of baseDb.keys()) baseEntries.push([w, baseWl.getScore(w)]);

  let pool: FlechePool | null = null;
  if (MODE === "pool") {
    pool = new FlechePool();
    await pool.ready();
  }

  console.log(`\nMode: ${MODE}${pool ? ` (${pool.size} workers)` : ""}   ${RUNS} runs/cell   realistic names, balanced`);
  console.log("Climbs until success < 100%, records reliable/soft edge per size.\n");

  const summary: { size: string; reliableMax: number; softMax: number; guardMax: number }[] = [];

  for (const size of SIZES) {
    console.log(`${size.label}  (${size.w * size.h} cells)   count  fill%  guard     success   med_ms   p95_ms`);
    const maxDim = Math.max(size.w, size.h);
    const pad = " ".repeat(size.label.length + 4 + String(size.w * size.h).length + 8);
    let reliableMax = 0;
    let softMax = 0;
    let guardMax = 0;

    for (const count of COUNT_LADDER) {
      const sample = pickNames(count, maxDim, 1);
      if (sample.length < count) break;
      const cap = analyzeCapacity(size.w, size.h, sample);
      if (!cap.overCapacity) guardMax = count;
      if (cap.overCapacity) {
        console.log(`${pad}${count.toString().padStart(4)}   ${(cap.fillRatio * 100).toFixed(0).padStart(3)}%  HARD-BLOCK (guard)`);
        break;
      }

      const times: number[] = [];
      let ok = 0;
      let straightFails = 0;
      let run = 0;
      for (; run < RUNS; run++) {
        const custom = pickNames(count, maxDim, run + 1);
        let ms: number;
        let success: boolean;
        if (pool) {
          const r = await pool.generate({ width: size.w, height: size.h, customClues: custom, difficulty: "balanced" });
          ms = r.ms;
          success = !!r.result?.success;
        } else {
          const wl = new WordList();
          for (const [w, s] of baseEntries) wl.addWord(w, s);
          const db = new Map(baseDb);
          const t = Date.now();
          const res = generateFlecheVector({ width: size.w, height: size.h, customClues: custom, difficulty: "balanced" }, wl, db, clueDifficulty);
          ms = Date.now() - t;
          success = res.success;
        }
        times.push(ms);
        if (success) { ok++; straightFails = 0; }
        else if (++straightFails >= 3 && ok === 0) { run++; break; }
      }
      times.sort((a, b) => a - b);
      const rate = ok / run;
      console.log(
        `${pad}${count.toString().padStart(4)}   ${(cap.fillRatio * 100).toFixed(0).padStart(3)}%  ${(cap.tight ? "tight" : "ok").padEnd(9)} ` +
          `${(rate * 100).toFixed(0).padStart(4)}%   ${pctl(times, 50).toString().padStart(6)}   ${pctl(times, 95).toString().padStart(6)}`,
      );
      if (rate === 1) reliableMax = count;
      if (rate >= 0.8) softMax = count;
      // Stop climbing once reliability clearly breaks (found the edge).
      if (rate < 0.8) break;
    }
    summary.push({ size: size.label, reliableMax, softMax, guardMax });
    console.log("");
  }

  console.log("=".repeat(60));
  console.log(`SUMMARY (${MODE}) — recommended custom-word limit per grid`);
  console.log("=".repeat(60));
  console.log("size      reliable(100%)   soft(>=80%)   guard allows");
  for (const s of summary) {
    console.log(`${s.size.padEnd(9)} ${s.reliableMax.toString().padStart(9)}       ${s.softMax.toString().padStart(6)}        ${s.guardMax.toString().padStart(6)}`);
  }

  if (pool) await pool.close();
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
