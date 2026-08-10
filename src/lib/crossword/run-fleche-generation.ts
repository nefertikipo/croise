import {
  generateFlecheVector,
  type VectorGenParams,
  type VectorGenResult,
} from "@/lib/crossword/fleche-vector-gen";
import { getFlechePool } from "@/lib/crossword/fleche-pool-singleton";
import {
  ensureLoaded,
  getFrenchWordList,
  getFrenchClueDb,
  getFrenchClueDifficulty,
} from "@/lib/crossword/load-french-clues";
import { filterClueDb } from "@/lib/crossword/filter-clue-db";

export interface RunFlecheOptions {
  /** Answers to keep out of the fill (caller decides the length gate). */
  excludeAnswers?: string[];
  /** Clue texts to keep out of the fill (folded compare — see filterClueDb). */
  excludeClues?: string[];
  /**
   * Safety-net cap for how long to wait on the pool before giving up (ms). Must
   * sit under the route's maxDuration. Ignored on the single-threaded fallback,
   * which is bounded by the generator's own `timeBudgetMs`.
   */
  maxWaitMs?: number;
}

/**
 * Generate a fléchés grid the same way everywhere: race the warm worker pool
 * across cores when it's available (higher success on dense custom-word grids —
 * this is where the two-tier CPU budget actually pays off), and fall back to the
 * single-threaded generator only when the pool ERRORS. A pool that ran and found
 * no solution is a real failure, so we return it rather than burning another
 * budget single-threaded.
 *
 * Shared by `/fleche` and the book grid create/regenerate paths so a book grid
 * gets the exact same multi-core treatment as a standalone one.
 */
export async function runFlecheGeneration(
  params: VectorGenParams,
  opts: RunFlecheOptions = {},
): Promise<VectorGenResult | null> {
  const pool = await getFlechePool();
  if (pool) {
    try {
      const { result } = await pool.generate(params, {
        excludeAnswers: opts.excludeAnswers,
        excludeClues: opts.excludeClues,
        maxWaitMs: opts.maxWaitMs,
      });
      return result;
    } catch (poolErr) {
      console.error("[fleche] pool error, single-threaded fallback:", poolErr);
    }
  }

  await ensureLoaded();
  const wordList = getFrenchWordList();
  const clueDb = filterClueDb(
    getFrenchClueDb(),
    opts.excludeAnswers,
    opts.excludeClues,
  );
  return generateFlecheVector(params, wordList, clueDb, getFrenchClueDifficulty());
}
