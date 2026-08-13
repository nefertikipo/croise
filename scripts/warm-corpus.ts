/** Warm the fléche corpus cache from Neon so the worker pool reads a local file. */
import "dotenv/config";
import { ensureLoaded, getFrenchClueDb } from "@/lib/crossword/load-french-clues";

async function main() {
  await ensureLoaded();
  console.log("corpus clues:", getFrenchClueDb().size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
