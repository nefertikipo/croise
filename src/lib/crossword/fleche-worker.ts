/**
 * Worker-thread entry for the parallel fléche generator pool.
 *
 * Loads the French corpus ONCE at startup (warm, long-lived) then services jobs.
 * Each job runs the normal single-threaded generator, but with a cooperative
 * abort hook backed by a SharedArrayBuffer: the moment a sibling worker wins the
 * race, the pool flips the flag and this run stops at its next attempt boundary.
 *
 * Custom-word jobs mutate the word list / clue DB (custom answers get injected),
 * so those get a freshly rebuilt, isolated state per job; plain jobs reuse the
 * shared corpus.
 */
import { parentPort } from "node:worker_threads";
import {
  ensureLoaded,
  getFrenchWordList,
  getFrenchClueDb,
  getFrenchClueDifficulty,
} from "@/lib/crossword/load-french-clues";
import { generateFlecheVector, type VectorGenParams } from "@/lib/crossword/fleche-vector-gen";
import { WordList } from "@/lib/crossword/word-list";

if (!parentPort) throw new Error("fleche-worker must run as a worker thread");
const port = parentPort;

interface JobMessage {
  type: "job";
  jobId: number;
  params: VectorGenParams;
  excludeAnswers?: string[];
  excludeClues?: string[];
  abort: SharedArrayBuffer;
}

async function main() {
  await ensureLoaded();
  const baseWl = getFrenchWordList();
  const baseDb = getFrenchClueDb();
  const clueDifficulty = getFrenchClueDifficulty();

  // Snapshot for cheap per-job isolation (rebuild ~190ms, clone ~35ms).
  const baseEntries: [string, number][] = [];
  for (const w of baseDb.keys()) baseEntries.push([w, baseWl.getScore(w)]);

  port.on("message", (msg: JobMessage) => {
    if (msg.type !== "job") return;
    const flag = new Int32Array(msg.abort);
    const shouldAbort = () => Atomics.load(flag, 0) !== 0;

    const hasCustom = !!msg.params.customClues && msg.params.customClues.length > 0;
    const exclA = new Set((msg.excludeAnswers ?? []).map((a) => a.toUpperCase()));
    const exclC = new Set(msg.excludeClues ?? []);
    const hasExcludes = exclA.size > 0 || exclC.size > 0;

    // clueDb: filter out excluded answers/clues (matches the route's single-
    // threaded path), and clone when custom words will be injected so the
    // mutation stays isolated to this run. Plain jobs reuse the shared map.
    let db = baseDb;
    if (hasExcludes) {
      db = new Map();
      for (const [word, clues] of baseDb) {
        if (exclA.has(word)) continue;
        const filtered = exclC.size > 0 ? clues.filter((c) => !exclC.has(c)) : clues;
        if (filtered.length > 0) db.set(word, filtered);
      }
    } else if (hasCustom) {
      db = new Map(baseDb);
    }

    // wordList: rebuild fresh only for custom jobs (generateFlecheVector injects
    // the custom answers at score 100). Excludes are handled via clueDb, matching
    // the single-threaded route which passes the unfiltered word list.
    let wl = baseWl;
    if (hasCustom) {
      wl = new WordList();
      for (const [w, s] of baseEntries) wl.addWord(w, s);
    }

    const result = generateFlecheVector(msg.params, wl, db, clueDifficulty, shouldAbort);
    // Only ship the (large) grid payload on a win; losers/aborts report failure.
    port.postMessage(
      result.success
        ? { type: "done", jobId: msg.jobId, success: true, result }
        : { type: "done", jobId: msg.jobId, success: false },
    );
  });

  port.postMessage({ type: "ready" });
}

main().catch((e) => {
  port.postMessage({ type: "error", message: e instanceof Error ? e.message : String(e) });
});
