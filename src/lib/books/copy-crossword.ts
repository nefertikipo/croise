import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { eq } from "drizzle-orm";
import { generateCrosswordCode, retryOnUniqueViolation } from "@/lib/code";

/**
 * Deep-copy a crossword row + its placed words, returning the new crossword id.
 *
 * Books must never reference a standalone grid directly: attaching (or seeding
 * a new book from) an existing grid takes a COPY, so deleting the book page —
 * which deletes its crossword — can never destroy a grid the user still uses
 * or shares elsewhere.
 *
 * The crossword + placed-words inserts run in one atomic `db.batch` (the
 * neon-http driver has no interactive transactions), with an explicit
 * pre-generated UUID so the second statement can reference the first. Retries
 * with a fresh share code on the (astronomically rare) code collision.
 * Returns null when the source crossword no longer exists.
 */
export async function copyCrossword(sourceId: string): Promise<string | null> {
  const [src] = await db
    .select()
    .from(crosswords)
    .where(eq(crosswords.id, sourceId))
    .limit(1);
  if (!src) return null;

  const srcWords = await db
    .select()
    .from(placedWords)
    .where(eq(placedWords.crosswordId, sourceId));

  const copyId = crypto.randomUUID();

  await retryOnUniqueViolation(async () => {
    const insertCopy = db.insert(crosswords).values({
      id: copyId,
      code: generateCrosswordCode(),
      ownerId: src.ownerId,
      title: src.title,
      language: src.language,
      width: src.width,
      height: src.height,
      gridPattern: src.gridPattern,
      gridSolution: src.gridSolution,
      hiddenWord: src.hiddenWord,
      status: "ready",
      difficulty: src.difficulty,
      theme: src.theme,
      vibe: src.vibe,
    });

    if (srcWords.length === 0) {
      await insertCopy;
      return;
    }

    await db.batch([
      insertCopy,
      db.insert(placedWords).values(
        srcWords.map((w) => ({
          crosswordId: copyId,
          answer: w.answer,
          direction: w.direction,
          number: w.number,
          startRow: w.startRow,
          startCol: w.startCol,
          length: w.length,
          clueText: w.clueText,
          isCustom: w.isCustom,
          breaks: w.breaks,
          difficulty: w.difficulty,
        })),
      ),
    ]);
  });

  return copyId;
}
