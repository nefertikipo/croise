import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books, bookPages } from "@/db/schema/books";
import { eq } from "drizzle-orm";
import { serializePage } from "@/lib/books/serialize";
import { generateAndSaveGrid } from "@/lib/books/generate-grid";
import { collectUsedClues } from "@/lib/books/used-clues";
import { checkCapacity } from "@/lib/crossword/check-capacity";
import { placedWords } from "@/db/schema/placed-words";
import type { BookPageData } from "@/types/book";

export const maxDuration = 120;

const requestSchema = z.object({
  width: z.number().min(8).max(20).default(11),
  height: z.number().min(8).max(20).default(17),
  count: z.number().min(1).max(10).default(1),
  hiddenWord: z.string().optional(),
  gridColor: z.string().optional(),
  customClues: z
    .array(z.object({ answer: z.string(), clue: z.string() }))
    .default([]),
  difficulty: z.enum(["facile", "moyen", "difficile", "balanced"]).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const gridParams = requestSchema.parse(await request.json());

    const capacityError = checkCapacity(
      gridParams.width,
      gridParams.height,
      gridParams.customClues,
    );
    if (capacityError) {
      return NextResponse.json({ error: capacityError }, { status: 400 });
    }

    const [book] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.code, code))
      .limit(1);

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const existing = await db
      .select({ position: bookPages.position })
      .from(bookPages)
      .where(eq(bookPages.bookId, book.id));

    let nextPosition =
      existing.length > 0 ? Math.max(...existing.map((p) => p.position)) + 1 : 0;

    const usedClues = await collectUsedClues(book.id);
    const config = {
      ...(gridParams.gridColor ? { gridColor: gridParams.gridColor } : {}),
      ...(gridParams.hiddenWord ? { hiddenWord: gridParams.hiddenWord } : {}),
      ...(gridParams.difficulty ? { difficulty: gridParams.difficulty } : {}),
    };

    const createdPageIds: string[] = [];

    for (let n = 0; n < gridParams.count; n++) {
      const grid = await generateAndSaveGrid({
        width: gridParams.width,
        height: gridParams.height,
        title: `Grille ${nextPosition + 1}`,
        customClues: gridParams.customClues,
        difficulty: gridParams.difficulty,
        usedClues,
      });

      if (!grid) {
        if (createdPageIds.length === 0) {
          return NextResponse.json(
            { error: "Failed to generate grid after max attempts" },
            { status: 500 },
          );
        }
        break;
      }

      // Fold this grid's clues into usedClues so batched grids don't repeat.
      const newWords = await db
        .select({ clueText: placedWords.clueText })
        .from(placedWords)
        .where(eq(placedWords.crosswordId, grid.crosswordId));
      for (const w of newWords) usedClues.add(w.clueText);

      const [page] = await db
        .insert(bookPages)
        .values({
          bookId: book.id,
          position: nextPosition,
          kind: "grid",
          crosswordId: grid.crosswordId,
          config,
        })
        .returning({ id: bookPages.id });

      createdPageIds.push(page.id);
      nextPosition += 1;
    }

    const pages: BookPageData[] = [];
    for (const id of createdPageIds) {
      const p = await serializePage(id);
      if (p) pages.push(p);
    }

    return NextResponse.json({ pages });
  } catch (error) {
    console.error("Grid generation error:", error);
    return NextResponse.json({ error: "Failed to add grid" }, { status: 500 });
  }
}
