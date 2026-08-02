/**
 * Pre-bundle the fléché worker into a standalone CommonJS file.
 *
 * Why this exists: the API route spins up a worker-thread pool
 * (`fleche-pool.ts`) that races the generator across cores. Loading the worker
 * via `new Worker(new URL("./fleche-worker.ts", import.meta.url))` makes the
 * Next/webpack build emit a worker chunk that `require()`s sibling chunks by an
 * absolute `/_next/xxxx.js` path — a path that does NOT exist in the deployed
 * Vercel function filesystem. In production the worker therefore dies on load
 * with `Cannot find module '/_next/2536.js'`, the pool is marked permanently
 * unavailable, and every generation silently falls back to the single-threaded
 * engine (which times out on dense / custom-word grids).
 *
 * Fix: bundle the worker + all of its `@/`-aliased source into one self-
 * contained CJS file with no `/_next/*` dependencies. The pool loads THIS file
 * at runtime instead of the bundler's broken chunk. Third-party packages (only
 * `@neondatabase/serverless` in the worker graph) stay external and resolve
 * from the function's traced `node_modules` at runtime — exactly as the route's
 * own import of them already does.
 *
 * The output is traced into the API function via `outputFileTracingIncludes`
 * (see next.config.ts) and picked up by `fleche-pool.ts` at runtime.
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

await build({
  entryPoints: [resolve(root, "src/lib/crossword/fleche-worker.ts")],
  outfile: resolve(root, "worker-dist/fleche-worker.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  // Resolve the "@/..." import alias to src/ (mirrors tsconfig paths).
  alias: { "@": resolve(root, "src") },
  // Bundle only our own source. Real npm deps (@neondatabase/serverless and its
  // transitive/optional native bits) stay external and load from the function's
  // node_modules at runtime — avoids bundling native/ws optional binaries.
  packages: "external",
  logLevel: "info",
});

console.log("[build-fleche-worker] wrote worker-dist/fleche-worker.cjs");
