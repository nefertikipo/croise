import { db } from "@/db";
import { bookPages } from "@/db/schema/books";
import { placedWords } from "@/db/schema/placed-words";
import { eq } from "drizzle-orm";
import { normalizeAnswer } from "@/lib/crossword/normalize";

/**
 * Collect the answers and clue texts already used by grid pages in a book, so a
 * newly generated grid neither repeats a word nor a clue. Optionally exclude one
 * crossword (used when regenerating a grid in place, so that grid's own words and
 * clues are freed and can be reused by its replacement).
 *
 * Because the excluded set is derived live from the currently-placed words,
 * deleting a grid page automatically returns its words to the pool.
 *
 * - `words`: normalized answers (A–Z, uppercase), matching `clueDb`/`WordList`
 *   keys so callers can filter them out of generation.
 * - `clues`: raw clue texts, matching how they were stored.
 */
export async function collectUsedWordsAndClues(
  bookId: string,
  excludeCrosswordId?: string,
): Promise<{ words: Set<string>; clues: Set<string> }> {
  const pages = await db
    .select({ crosswordId: bookPages.crosswordId })
    .from(bookPages)
    .where(eq(bookPages.bookId, bookId));

  const words = new Set<string>();
  const clues = new Set<string>();
  for (const page of pages) {
    if (!page.crosswordId || page.crosswordId === excludeCrosswordId) continue;
    const placed = await db
      .select({ answer: placedWords.answer, clueText: placedWords.clueText })
      .from(placedWords)
      .where(eq(placedWords.crosswordId, page.crosswordId));
    for (const w of placed) {
      words.add(normalizeAnswer(w.answer));
      clues.add(w.clueText);
    }
  }
  return { words, clues };
}
