/**
 * One-off: generate two new fléchés grids for "Elise's 25th" (BOOK-81KFPU) from
 * Jeanne's + Gabby's freshly-added words, and append them as book pages —
 * replicating exactly what POST /api/books/[code]/grids does (generate → persist
 * crossword + placed words → attach a grid page → touch the book), including the
 * live word/clue exclusion so no answer or clue repeats across the book.
 *
 * Two contributed answers can't be placed in an 11×17 (both ≥ the 11-cell short
 * side): "Heated Rivalry" (13) and "Fatal Bazooka" (12). They stay in the
 * notepad only and are reported here.
 *
 *   set -a; source .env.local; set +a
 *   FLECHE_POOL_SIZE=8 caffeinate -dimsu pnpm tsx scripts/gen-elise-jeanne-gabby-grids.mts
 */
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { books, bookPages } from "@/db/schema/books";
import { placedWords } from "@/db/schema/placed-words";
import { generateAndSaveGrid } from "@/lib/books/generate-grid";
import { collectUsedWordsAndClues } from "@/lib/books/used-clues";
import { ensureLoaded } from "@/lib/crossword/load-french-clues";
import { normalizeAnswer } from "@/lib/crossword/normalize";
import { analyzeCapacity } from "@/lib/crossword/check-capacity";

const CODE = "BOOK-81KFPU";
const WIDTH = 11;
const HEIGHT = 17;
const MAX_TRIES = Number(process.env.TRIES) || 6;
const TIME_BUDGET_MS = Number(process.env.TIME_BUDGET_MS) || 120_000;

type Clue = { answer: string; clue: string };

// Two grids, contributor-themed to match the book's page titles. Only words that
// fit an 11×17 reliably (≤ 10 letters). Grid page config mirrors the app's
// {title, gridColor, difficulty}. Colors continue the book's cycling palette.
const GRIDS: { title: string; gridColor: string; difficulty: "facile"; clues: Clue[] }[] = [
  {
    title: "Jeanne",
    gridColor: "#e8b23a",
    difficulty: "facile",
    clues: [
      { answer: "Carnivore", clue: "Une phase alimentaire mystique de Mr Greg" },
      { answer: "Batterie", clue: "Morte gelée lors du fameux ski trip de 2021" },
      { answer: "Ampoules", clue: "Elise en rando les nommerait comme son nemesis" },
      { answer: "Lyon", clue: "Ville étape, ville de bugnes" },
      { answer: "NFT", clue: "Un mémoire LSE sur les quoi ??" },
      { answer: "Babouches", clue: "Elles ne brillent qu’à Paris" },
      { answer: "Rivalry", clue: "Heated ___, hot hot & gay" },
    ],
  },
  {
    title: "Gabby",
    gridColor: "#1f9e94",
    difficulty: "facile",
    clues: [
      { answer: "Experience", clue: "Ton choix à la place d’une engagement ring" },
      { answer: "Levrette", clue: "Alors raclette ou _____ ?" },
      { answer: "Francais", clue: "L’accent que tu prends en anglais avec des inconnus" },
      { answer: "Bayonne", clue: "Rouge et blanc" },
      { answer: "Banane", clue: "Le fruit où tu as tout appris" },
      { answer: "Kaira", clue: "Il y a une fausse ___ parmi nous…" },
      { answer: "Pouce", clue: "Ton geste iconique qui dit que tu t’en fous" },
      { answer: "Bazooka", clue: "Fatal ___, chanteur préféré direct de la Savoie" },
    ],
  },
];

async function main() {
  const [book] = await db.select().from(books).where(eq(books.code, CODE));
  if (!book) throw new Error(`Book ${CODE} not found`);

  // Pre-flight: capacity check per grid, matching the route's guard.
  for (const g of GRIDS) {
    const cap = analyzeCapacity(WIDTH, HEIGHT, g.clues);
    console.log(
      `Grid "${g.title}": ${g.clues.length} words, fill ${(cap.fillRatio * 100).toFixed(0)}% ` +
        `(max ${cap.recommendedMax})${cap.message ? ` — BLOCKED: ${cap.message}` : ""}`,
    );
    if (cap.message) throw new Error(`Capacity check failed for "${g.title}"`);
  }

  console.log("Warming French corpus…");
  await ensureLoaded();

  const { words: usedWords, clues: usedClues } = await collectUsedWordsAndClues(book.id);
  console.log(`Book already uses ${usedWords.size} locked words / ${usedClues.size} clues.\n`);

  const pages = await db
    .select({ position: bookPages.position })
    .from(bookPages)
    .where(eq(bookPages.bookId, book.id));
  let nextPosition = pages.length > 0 ? Math.max(...pages.map((p) => p.position)) + 1 : 0;

  for (const g of GRIDS) {
    console.log(`\n=== Generating "${g.title}" (${g.clues.length} words) ===`);
    let saved: { crosswordId: string; code: string } | null = null;
    for (let attempt = 1; attempt <= MAX_TRIES && !saved; attempt++) {
      console.log(`  attempt ${attempt}/${MAX_TRIES}…`);
      saved = await generateAndSaveGrid({
        width: WIDTH,
        height: HEIGHT,
        title: g.title,
        customClues: g.clues,
        usedClues,
        usedWords,
        difficulty: g.difficulty,
        timeBudgetMs: TIME_BUDGET_MS,
        maxWaitMs: TIME_BUDGET_MS + 10_000,
      });
    }
    if (!saved) {
      console.error(`  ✗ FAILED to generate "${g.title}" after ${MAX_TRIES} tries. Stopping.`);
      process.exit(1);
    }

    // Fold this grid's words + clues into the exclusion sets (next grid won't repeat).
    const newWords = await db
      .select({ answer: placedWords.answer, clueText: placedWords.clueText })
      .from(placedWords)
      .where(eq(placedWords.crosswordId, saved.crosswordId));
    for (const w of newWords) {
      usedWords.add(normalizeAnswer(w.answer));
      usedClues.add(w.clueText);
    }
    const placedCustom = g.clues.filter((c) =>
      newWords.some((w) => normalizeAnswer(w.answer) === normalizeAnswer(c.answer)),
    );
    console.log(
      `  ✓ ${saved.code} — ${newWords.length} words placed; custom placed: ` +
        `${placedCustom.length}/${g.clues.length} (${placedCustom.map((c) => c.answer).join(", ")})`,
    );

    const pageId = crypto.randomUUID();
    await db.batch([
      db.insert(bookPages).values({
        id: pageId,
        bookId: book.id,
        position: nextPosition,
        kind: "grid",
        crosswordId: saved.crosswordId,
        config: { title: g.title, gridColor: g.gridColor, difficulty: g.difficulty },
      }),
      // Bump updatedAt (inline; the app's touchBookStatement helper pulls in
      // server-only auth code that can't load in a plain script).
      db.update(books).set({ updatedAt: new Date() }).where(eq(books.id, book.id)),
    ]);
    console.log(`  ✓ attached as page position ${nextPosition} (${g.title})`);
    nextPosition += 1;
  }

  console.log("\nDone. Two grids added to the book.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
