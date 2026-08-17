/**
 * One-off: regenerate the "Général 2" grid page of "Elise's 25th" (BOOK-81KFPU)
 * at difficulty=facile, so the whole book is uniformly easy. Difficulty is baked
 * in at generation (the render uses the stored clue text), so a config flip alone
 * would not actually ease the clues — the grid must be regenerated.
 *
 * Its 6 custom words + exact clues are pulled live and preserved; only the fill
 * and its (auto-picked) clues change. Mirrors the app's in-place regenerate
 * route: free this grid's own words, generate, repoint the page, drop the old
 * crossword — atomically. The route's conservative capacity guard is skipped
 * because MOUSTIQUAIRE (12) already lives in this grid and the engine places it.
 *
 *   set -a; source .env.local; set +a
 *   FLECHE_POOL_SIZE=6 caffeinate -dimsu pnpm tsx scripts/regen-elise-general2-facile.ts
 */
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { books, bookPages } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { generateAndSaveGrid } from "@/lib/books/generate-grid";
import { collectUsedWordsAndClues } from "@/lib/books/used-clues";
import { ensureLoaded } from "@/lib/crossword/load-french-clues";
import { normalizeAnswer } from "@/lib/crossword/normalize";
import type { BatchItem } from "drizzle-orm/batch";

const CODE = "BOOK-81KFPU";
const GRID_CODE = "XWRD-KHEJYM"; // Général 2
const MAX_TRIES = Number(process.env.TRIES) || 8;
const TIME_BUDGET_MS = Number(process.env.TIME_BUDGET_MS) || 120_000;

async function main() {
  const [book] = await db.select().from(books).where(eq(books.code, CODE));
  if (!book) throw new Error(`Book ${CODE} not found`);
  const [oldCw] = await db.select().from(crosswords).where(eq(crosswords.code, GRID_CODE));
  if (!oldCw) throw new Error(`Crossword ${GRID_CODE} not found`);
  const [page] = await db
    .select()
    .from(bookPages)
    .where(and(eq(bookPages.bookId, book.id), eq(bookPages.crosswordId, oldCw.id)));
  if (!page) throw new Error("Page for Général 2 not found");

  // Preserve the custom words + their exact clues, pulled live.
  const customRows = await db
    .select({ answer: placedWords.answer, clue: placedWords.clueText })
    .from(placedWords)
    .where(and(eq(placedWords.crosswordId, oldCw.id), eq(placedWords.isCustom, true)));
  const customClues = customRows.map((r) => ({ answer: r.answer, clue: r.clue }));
  console.log(`Preserving ${customClues.length} custom words:`);
  for (const c of customClues) console.log(`   ${c.answer} :: ${c.clue}`);

  console.log("\nWarming French corpus…");
  await ensureLoaded();

  // Free THIS grid's own words/clues; everything else in the book stays locked.
  const { words: usedWords, clues: usedClues } = await collectUsedWordsAndClues(
    book.id,
    oldCw.id,
  );
  console.log(`Locked from other grids: ${usedWords.size} words / ${usedClues.size} clues.\n`);

  let saved: { crosswordId: string; code: string } | null = null;
  for (let attempt = 1; attempt <= MAX_TRIES && !saved; attempt++) {
    console.log(`attempt ${attempt}/${MAX_TRIES} (facile)…`);
    saved = await generateAndSaveGrid({
      width: oldCw.width,
      height: oldCw.height,
      title: "Général 2",
      customClues,
      difficulty: "facile",
      usedClues,
      usedWords,
      timeBudgetMs: TIME_BUDGET_MS,
      maxWaitMs: TIME_BUDGET_MS + 10_000,
    });
  }
  if (!saved) throw new Error(`Failed to regenerate after ${MAX_TRIES} tries.`);

  const newWords = await db
    .select({ answer: placedWords.answer })
    .from(placedWords)
    .where(eq(placedWords.crosswordId, saved.crosswordId));
  const placedCustom = customClues.filter((c) =>
    newWords.some((w) => normalizeAnswer(w.answer) === normalizeAnswer(c.answer)),
  );
  console.log(
    `\n✓ ${saved.code} — ${newWords.length} words; custom placed ${placedCustom.length}/${customClues.length} ` +
      `(${placedCustom.map((c) => c.answer).join(", ")})`,
  );
  if (placedCustom.length !== customClues.length) {
    // Don't swap a grid that dropped a personalized word — clean up and bail.
    await db.delete(crosswords).where(eq(crosswords.id, saved.crosswordId));
    throw new Error("Regenerated grid is missing a custom word; aborted (no change made).");
  }

  const prevConfig = (page.config as Record<string, unknown>) ?? {};
  const nextConfig = { ...prevConfig, difficulty: "facile" };

  const statements: BatchItem<"pg">[] = [
    db
      .update(bookPages)
      .set({ crosswordId: saved.crosswordId, config: nextConfig })
      .where(eq(bookPages.id, page.id)),
    db.update(books).set({ updatedAt: new Date() }).where(eq(books.id, book.id)),
    db.delete(crosswords).where(eq(crosswords.id, oldCw.id)),
  ];
  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  console.log(`✓ Page #${page.position} "Général 2" repointed to ${saved.code}, now difficulty=facile.`);
  console.log(`  Old crossword ${GRID_CODE} deleted.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
