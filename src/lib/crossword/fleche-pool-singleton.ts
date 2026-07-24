/**
 * Process-wide singleton for the fléche worker pool, used by the API route.
 *
 * On Vercel Fluid Compute (and any long-lived Node server) instances are reused
 * across requests, so the pool is created once, warmed once, and then races
 * every subsequent generation across cores. If the pool can't initialize in the
 * deployed environment (worker bundling unsupported, workers die on load, init
 * times out), it is marked permanently unavailable and the route falls back to
 * the single-threaded generator — so this can never regress generation.
 *
 * Kill switch: FLECHE_DISABLE_POOL=1 forces single-threaded.
 * Sizing:      FLECHE_POOL_SIZE overrides the worker count (default caps low to
 *              bound memory, since each worker holds its own corpus copy).
 */
import { cpus } from "node:os";
import { FlechePool } from "@/lib/crossword/fleche-pool";

let poolPromise: Promise<FlechePool | null> | null = null;
let unavailable = false;

const INIT_TIMEOUT_MS = 30000;
const WARMUP_TIMEOUT_MS = 20000;

function enabled(): boolean {
  return process.env.FLECHE_DISABLE_POOL !== "1";
}

function defaultSize(): number {
  const env = Number(process.env.FLECHE_POOL_SIZE);
  if (Number.isFinite(env) && env >= 1) return Math.floor(env);
  // Cap low by default: each worker keeps a full corpus copy in memory.
  return Math.min(4, Math.max(1, cpus().length - 1));
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(label)), ms)),
  ]);
}

async function initPool(): Promise<FlechePool | null> {
  let pool: FlechePool | null = null;
  try {
    pool = new FlechePool(defaultSize());
    await withTimeout(pool.ready(), INIT_TIMEOUT_MS, "pool init timeout");
    // Health check: a trivial grid must actually solve. Catches workers that
    // spawned but died on module load (they'd otherwise hang real requests).
    const warm = await withTimeout(
      pool.generate({ width: 5, height: 7, difficulty: "balanced" }, { maxWaitMs: WARMUP_TIMEOUT_MS }),
      WARMUP_TIMEOUT_MS + 2000,
      "pool warmup timeout",
    );
    if (!warm.result?.success) throw new Error("pool warmup did not solve");
    console.log(`[fleche-pool] ready with ${pool.size} workers`);
    return pool;
  } catch (e) {
    console.error("[fleche-pool] unavailable, using single-threaded fallback:", e instanceof Error ? e.message : e);
    unavailable = true;
    if (pool) void pool.close().catch(() => {});
    return null;
  }
}

/** The warm pool, or null if disabled/unavailable (caller must fall back). */
export function getFlechePool(): Promise<FlechePool | null> {
  if (!enabled() || unavailable) return Promise.resolve(null);
  if (!poolPromise) poolPromise = initPool();
  return poolPromise;
}
