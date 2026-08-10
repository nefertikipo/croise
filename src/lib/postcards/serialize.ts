import { db } from "@/db";
import { postcards } from "@/db/schema/postcards";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { eq } from "drizzle-orm";
import { reconstructCells } from "@/lib/crossword/reconstruct-cells";
import type { PostcardData, PostcardGrid } from "@/types/postcard";

/** Load the front grid (crossword + placed words) for a card, ready to render. */
async function loadGrid(crosswordId: string): Promise<PostcardGrid | null> {
  const [grid] = await db
    .select()
    .from(crosswords)
    .where(eq(crosswords.id, crosswordId))
    .limit(1);
  if (!grid) return null;

  const words = await db
    .select()
    .from(placedWords)
    .where(eq(placedWords.crosswordId, crosswordId));

  return {
    code: grid.code,
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

/** Full postcard payload for GET /api/postcards/[code]. Null if not found. */
export async function loadPostcard(code: string): Promise<PostcardData | null> {
  const [card] = await db.select().from(postcards).where(eq(postcards.code, code)).limit(1);
  if (!card) return null;

  const grid = card.crosswordId ? await loadGrid(card.crosswordId) : null;
  if (card.crosswordId && !grid) {
    console.error(
      `[postcards] card ${card.code} references missing crossword ${card.crosswordId}`,
    );
  }

  return {
    id: card.id,
    code: card.code,
    title: card.title,
    recipientName: card.recipientName,
    message: card.message,
    messageFont: card.messageFont,
    gridColor: card.gridColor,
    status: card.status,
    grid,
  };
}
