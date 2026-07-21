// ESM resolve hook for tsx-spawned worker threads. tsx does not apply tsconfig
// `paths` (the `@/` alias) nor extensionless resolution reliably inside workers
// spawned with an explicit execArgv, so this hook resolves both `@/…` alias and
// extensionless relative specifiers to concrete files. tsx still transpiles.
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve as pathResolve } from "node:path";
import { existsSync } from "node:fs";
const SRC = pathResolve(process.cwd(), "src");
const EXTS = [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", "/index.ts", "/index.tsx"];
export async function resolve(specifier, context, next) {
  let base = null;
  if (specifier.startsWith("@/")) {
    base = pathResolve(SRC, specifier.slice(2));
  } else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
    base = fileURLToPath(new URL(specifier, context.parentURL));
  }
  if (base) {
    if (existsSync(base) && /\.[a-z]+$/.test(base)) return next(pathToFileURL(base).href, context);
    for (const ext of EXTS) {
      if (existsSync(base + ext)) return next(pathToFileURL(base + ext).href, context);
    }
  }
  return next(specifier, context);
}
