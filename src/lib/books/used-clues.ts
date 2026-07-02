import { db } from "@/db";
import { bookPages } from "@/db/schema/books";
import { placedWords } from "@/db/schema/placed-words";
import { eq } from "drizzle-orm";

/**
 * Collect all clue texts already used by grid pages in a book, so newly
 * generated grids don't repeat clues. Optionally exclude one crossword (used
 * when regenerating a grid in place).
 */
export async function collectUsedClues(
  bookId: string,
  excludeCrosswordId?: string,
): Promise<Set<string>> {
  const pages = await db
    .select({ crosswordId: bookPages.crosswordId })
    .from(bookPages)
    .where(eq(bookPages.bookId, bookId));

  const used = new Set<string>();
  for (const page of pages) {
    if (!page.crosswordId || page.crosswordId === excludeCrosswordId) continue;
    const words = await db
      .select({ clueText: placedWords.clueText })
      .from(placedWords)
      .where(eq(placedWords.crosswordId, page.crosswordId));
    for (const w of words) used.add(w.clueText);
  }
  return used;
}
