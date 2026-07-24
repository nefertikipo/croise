/**
 * Warm worker-thread pool that races the fléche generator across cores.
 *
 * Each generate() sends the SAME grid request to every worker; because the
 * generator's layout search is Math.random-driven, the workers explore different
 * layouts and the first to solve wins. A SharedArrayBuffer abort flag then stops
 * the losers at their next attempt boundary (no thread teardown — they stay warm).
 *
 * Net effect: ~N× the layouts explored per wall-second, at unchanged per-attempt
 * solve quality — which is the lever the solve-timeout probe showed actually
 * raises reliable capacity (not cutting per-layout solve time).
 */
import { Worker } from "node:worker_threads";
import { cpus } from "node:os";
import { pathToFileURL } from "node:url";
import { resolve as pathResolve } from "node:path";
import { existsSync } from "node:fs";
import type { VectorGenParams, VectorGenResult } from "@/lib/crossword/fleche-vector-gen";

// Under the tsx CLI (benchmark scripts), worker threads need tsx registered plus
// an alias hook so `@/` resolves inside the worker graph. Inside Next.js
// (NEXT_RUNTIME set, dev or prod) the bundler resolves `@/` and tsx is a
// devDependency that wouldn't exist in prod — so this is applied ONLY for the
// standalone tsx CLI, never inside the app runtime.
function tsxExecArgv(): string[] | undefined {
  if (process.env.NEXT_RUNTIME) return undefined;
  const bootstrap = pathResolve(process.cwd(), "scripts", "worker-bootstrap.mjs");
  if (!existsSync(bootstrap)) return undefined;
  return ["--import", "tsx", "--import", pathToFileURL(bootstrap).href];
}

interface DoneMessage {
  type: "done";
  jobId: number;
  success: boolean;
  result?: VectorGenResult;
}

interface ActiveJob {
  pending: number;
  settled: boolean;
  onDone: (m: DoneMessage) => void;
}

export class FlechePool {
  private workers: Worker[] = [];
  private readyPromise: Promise<void>;
  private jobSeq = 0;
  private active = new Map<number, ActiveJob>();

  constructor(size = Math.max(1, cpus().length - 1)) {
    const readies: Promise<void>[] = [];
    const execArgv = tsxExecArgv();
    for (let i = 0; i < size; i++) {
      const worker = new Worker(new URL("./fleche-worker.ts", import.meta.url), execArgv ? { execArgv } : undefined);
      // Per-worker readiness that RESOLVES on "ready" and REJECTS if the worker
      // dies on load — so a broken environment fails ready() fast instead of
      // waiting out the init timeout before falling back.
      let settle: (() => void) | null = null;
      let fail: ((e: Error) => void) | null = null;
      readies.push(new Promise<void>((res, rej) => { settle = res; fail = rej; }));
      const clearInit = () => { settle = null; fail = null; };
      worker.on("message", (m: { type: string; jobId?: number; success?: boolean; result?: VectorGenResult; message?: string }) => {
        if (m.type === "ready") { settle?.(); clearInit(); return; }
        if (m.type === "error") { fail?.(new Error(m.message ?? "worker init error")); clearInit(); return; }
        if (m.type === "done" && m.jobId !== undefined) {
          this.active.get(m.jobId)?.onDone({ type: "done", jobId: m.jobId, success: !!m.success, result: m.result });
        }
      });
      worker.on("error", (e) => {
        if (fail) { fail(e); clearInit(); } // died before ready
        else console.error("[fleche-pool] worker error:", e.message); // died mid-life
      });
      this.workers.push(worker);
    }
    this.readyPromise = Promise.all(readies).then(() => undefined);
  }

  get size(): number {
    return this.workers.length;
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Race all workers on one grid. Resolves at first success (or null if all
   * fail). `maxWaitMs` is a safety net: if workers die and never respond, it
   * resolves null rather than hanging the request forever.
   */
  generate(
    params: VectorGenParams,
    opts?: { excludeAnswers?: string[]; excludeClues?: string[]; maxWaitMs?: number },
  ): Promise<{ result: VectorGenResult | null; ms: number }> {
    const jobId = ++this.jobSeq;
    const abort = new SharedArrayBuffer(4);
    const flag = new Int32Array(abort);
    const start = Date.now();

    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (result: VectorGenResult | null) => {
        if (timer) clearTimeout(timer);
        Atomics.store(flag, 0, 1); // stop any stragglers
        resolve({ result, ms: Date.now() - start });
      };
      const job: ActiveJob = {
        pending: this.workers.length,
        settled: false,
        onDone: (m) => {
          job.pending--;
          if (!job.settled && m.success) {
            job.settled = true;
            finish(m.result ?? null);
          } else if (!job.settled && job.pending === 0) {
            job.settled = true;
            finish(null);
          }
          if (job.pending === 0) this.active.delete(jobId);
        },
      };
      this.active.set(jobId, job);
      const maxWaitMs = opts?.maxWaitMs;
      if (maxWaitMs && maxWaitMs > 0) {
        timer = setTimeout(() => {
          if (!job.settled) {
            job.settled = true;
            this.active.delete(jobId);
            finish(null);
          }
        }, maxWaitMs);
      }
      for (const w of this.workers) {
        w.postMessage({
          type: "job",
          jobId,
          params,
          excludeAnswers: opts?.excludeAnswers,
          excludeClues: opts?.excludeClues,
          abort,
        });
      }
    });
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.terminate()));
  }
}
