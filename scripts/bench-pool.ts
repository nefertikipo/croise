/**
 * Benchmark: single-threaded generator vs. the warm worker-pool racer, on the
 * hard non-corpus edge cells (realistic invented / rare-letter custom words).
 *
 * Measures whether racing N workers on one grid raises reliable custom-word
 * capacity (partial→reliable, dead→workable) and cuts time-to-success. Same
 * fixed custom-word sets (seeded) feed both paths for a controlled comparison.
 *
 * Run: pnpm tsx scripts/bench-pool.ts
 */
import {
  ensureLoaded,
  getFrenchWordList,
  getFrenchClueDb,
  getFrenchClueDifficulty,
} from "@/lib/crossword/load-french-clues";
import { generateFlecheVector } from "@/lib/crossword/fleche-vector-gen";
import { WordList } from "@/lib/crossword/word-list";
import { FlechePool } from "@/lib/crossword/fleche-pool";

const CELLS = [
  { w: 8, h: 11, count: 5, label: "8×11 @5" }, // single ~63%
  { w: 8, h: 11, count: 6, label: "8×11 @6" }, // single 0%
  { w: 9, h: 13, count: 6, label: "9×13 @6" }, // single ~38%
  { w: 11, h: 17, count: 6, label: "11×17 @6" }, // single ~67%
];
const RUNS = 6;
// BENCH_ONLY="9×13 @6,11×17 @6" restricts the run to matching cells (re-runs).
const ONLY = process.env.BENCH_ONLY;
const SELECTED = ONLY
  ? CELLS.filter((c) => ONLY.split(",").some((s) => c.label.includes(s.trim())))
  : CELLS;

const INVENTED: Record<number, string[]> = {
  3: ["KAY", "WYN", "JYX", "ZOK", "YVA", "KWE", "WUZ", "JOK", "XYL", "VYK"],
  4: ["KYLO", "WYNN", "JAXX", "ZYKO", "YARK", "KWES", "WOLK", "JYZE", "VYKA", "KUZY"],
  5: ["KEVYN", "WENDY", "JAYKO", "ZORYA", "YAKUZ", "KWAME", "WYLDE", "JAXON", "KYZEN", "WOTAN"],
  6: ["KYLIAN", "WESLEY", "JAYDEN", "ZYKOVA", "YANNIK", "KWANZA", "WYVERN", "JEZKYL", "KOVYAK", "WYNTER"],
  7: ["KENZYWA", "WYLDKAT", "JAXWYNN", "ZYKORAH", "YAKWOLF", "KWYNTON", "WOJTYLA", "JYKOVEN", "KYLWORN", "WAZYKOV"],
};
const LENGTH_MIX = [4, 5, 5, 6, 4, 7, 5, 6, 4, 6, 5, 7];

function pickInvented(count: number, maxDim: number, seed: number) {
  const chosen: { answer: string; clue: string }[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    let len = Math.min(LENGTH_MIX[(i + seed) % LENGTH_MIX.length], maxDim);
    let bucket = INVENTED[len];
    let tries = 0;
    while ((!bucket || bucket.length === 0) && tries < 8) {
      len = Math.max(3, len - 1);
      bucket = INVENTED[len];
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
    chosen.push({ answer, clue: "Mot personnalisé" });
  }
  return chosen;
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
function pctl(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}
function fmt(label: string, times: number[], ok: number, okTimes: number[], runs: number) {
  times.sort((a, b) => a - b);
  return (
    `${label.padEnd(9)} ${((ok / runs) * 100).toFixed(0).padStart(4)}%   ` +
    `${pctl(times, 50).toString().padStart(6)}   ${pctl(times, 95).toString().padStart(6)}   ` +
    `${okTimes.length ? avg(okTimes).toFixed(0).padStart(6) : "     -"}   ${ok}/${runs}`
  );
}

async function main() {
  await ensureLoaded();
  const baseWl = getFrenchWordList();
  const baseDb = getFrenchClueDb();
  const clueDifficulty = getFrenchClueDifficulty();
  const baseEntries: [string, number][] = [];
  for (const w of baseDb.keys()) baseEntries.push([w, baseWl.getScore(w)]);

  const pool = new FlechePool();
  await pool.ready();
  console.log(`\nPool: ${pool.size} workers.  ${RUNS} runs/cell.  non-corpus, balanced.`);
  console.log("cell        method   success   med_ms   p95_ms   win_avg   ok/runs");

  for (const cell of SELECTED) {
    const maxDim = Math.max(cell.w, cell.h);

    // --- single-threaded ---
    {
      const times: number[] = [];
      const okTimes: number[] = [];
      let ok = 0;
      let straightFails = 0;
      let run = 0;
      for (; run < RUNS; run++) {
        const wl = new WordList();
        for (const [w, s] of baseEntries) wl.addWord(w, s);
        const db = new Map(baseDb);
        const custom = pickInvented(cell.count, maxDim, run + 1);
        const t = Date.now();
        const res = generateFlecheVector(
          { width: cell.w, height: cell.h, customClues: custom, difficulty: "balanced" },
          wl,
          db,
          clueDifficulty,
        );
        const ms = Date.now() - t;
        times.push(ms);
        if (res.success) {
          ok++;
          okTimes.push(ms);
          straightFails = 0;
        } else if (++straightFails >= 3 && ok === 0) {
          run++;
          break;
        }
      }
      console.log(`${cell.label.padEnd(11)} single   ${fmt("", times, ok, okTimes, run)}`);
    }

    // --- pool (race) ---
    {
      const times: number[] = [];
      const okTimes: number[] = [];
      let ok = 0;
      let straightFails = 0;
      let run = 0;
      for (; run < RUNS; run++) {
        const custom = pickInvented(cell.count, maxDim, run + 1);
        const { result, ms } = await pool.generate({
          width: cell.w,
          height: cell.h,
          customClues: custom,
          difficulty: "balanced",
        });
        times.push(ms);
        if (result?.success) {
          ok++;
          okTimes.push(ms);
          straightFails = 0;
        } else if (++straightFails >= 3 && ok === 0) {
          run++;
          break;
        }
      }
      console.log(`${" ".repeat(11)} pool     ${fmt("", times, ok, okTimes, run)}`);
    }
  }

  await pool.close();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
