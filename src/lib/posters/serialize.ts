import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { eq } from "drizzle-orm";
import { reconstructCells } from "@/lib/crossword/reconstruct-cells";
import type { PosterData } from "@/types/poster";

/** Load a crossword as a poster payload by share code. Null if not found. */
export async function loadPoster(code: string): Promise<PosterData | null> {
  const [grid] = await db.select().from(crosswords).where(eq(crosswords.code, code)).limit(1);
  if (!grid) return null;

  const words = await db
    .select()
    .from(placedWords)
    .where(eq(placedWords.crosswordId, grid.id));

  return {
    code: grid.code,
    title: grid.title,
    width: grid.width,
    height: grid.height,
    cells: reconstructCells(grid, words),
    words: words.map((w) => ({
      answer: w.answer,
      clue: w.clueText,
      direction: w.direction,
      isCustom: w.isCustom,
      difficulty: w.difficulty,
    })),
  };
}
