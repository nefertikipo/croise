/**
 * Headless check: does the generator actually produce grids that can spell out
 * the requested hidden word? Runs a few cases against the real French corpus
 * (loaded from the DB) and reports coverage + timing.
 *
 *   pnpm tsx scripts/test-hidden-word.ts
 */
import "dotenv/config";

async function main() {
  const { generateFlecheVector } = await import("@/lib/crossword/fleche-vector-gen");
  const { getFrenchWordList, getFrenchClueDb, ensureLoaded } = await import(
    "@/lib/crossword/load-french-clues"
  );
  const { findHiddenWordCells } = await import("@/lib/crossword/hidden-word");

  await ensureLoaded();

  const cases = [
    { word: "ANNIVERSAIRE", w: 11, h: 17 },
    { word: "JOYEUX", w: 11, h: 15 },
    { word: "ZOE", w: 9, h: 13 }, // rare letter Z
    { word: "MAMIE", w: 8, h: 11 },
  ];

  for (const c of cases) {
    const wordList = getFrenchWordList();
    const clueDb = getFrenchClueDb();
    const t0 = Date.now();
    const res = generateFlecheVector(
      { width: c.w, height: c.h, hiddenWord: c.word },
      wordList,
      clueDb,
    );
    const ms = Date.now() - t0;

    // Confirm via the *client-side* highlighter (the real consumer): build the
    // same {type:"letter"} cell grid the frontend receives.
    let placeable = false;
    if (res.success) {
      const cells = res.grid.cells.map((row) =>
        row.map((cell) =>
          cell.kind === "white" && cell.letter
            ? { type: "letter" as const, letter: cell.letter }
            : { type: "clue" as const },
        ),
      );
      placeable = findHiddenWordCells({ width: c.w, height: c.h, cells }, c.word).size > 0;
    }

    console.log(
      `${c.word.padEnd(14)} ${c.w}x${c.h}  success=${res.success}  ` +
        `satisfied=${res.hiddenWordSatisfied}  placeable=${placeable}  ` +
        `attempts=${res.attempts}  ${ms}ms`,
    );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
