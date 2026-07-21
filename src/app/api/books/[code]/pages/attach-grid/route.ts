import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books, bookPages } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { eq } from "drizzle-orm";
import { serializePage } from "@/lib/books/serialize";
import { collectUsedWordsAndClues } from "@/lib/books/used-clues";
import { generateAndSaveGrid, MIN_LOCKED_WORD_LENGTH } from "@/lib/books/generate-grid";
import { generateCrosswordCode } from "@/lib/code";
import { normalizeAnswer } from "@/lib/crossword/normalize";
import type { GridPageConfig } from "@/types/book";

export const maxDuration = 120;

const requestSchema = z.object({
  /** Code of an existing standalone crossword to add to this book. */
  crosswordCode: z.string().min(1),
  /**
   * Resolve a word/clue conflict by regenerating the grid to fit the book
   * (respecting its excluded words/clues) while keeping the grid's custom words.
   */
  regenerateToFit: z.boolean().default(false),
  /** Attach as-is despite a conflict (the user chose "add anyway"). */
  force: z.boolean().default(false),
  config: z
    .object({
      gridColor: z.string().optional(),
      hiddenWord: z.string().optional(),
      difficulty: z.enum(["facile", "moyen", "difficile", "balanced"]).optional(),
    })
    .optional(),
});

/**
 * Add an existing standalone grid to an existing book. A standalone grid was
 * generated without knowledge of this book, so it may reuse words or clues the
 * book already has. We detect that overlap and — unless told to regenerate or
 * force — return it to the caller so the UI can propose a fix instead of
 * silently attaching a duplicate.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const input = requestSchema.parse(await request.json());

    const [book] = await db
      .select({ id: books.id, language: books.language })
      .from(books)
      .where(eq(books.code, code))
      .limit(1);
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const [grid] = await db
      .select()
      .from(crosswords)
      .where(eq(crosswords.code, input.crosswordCode))
      .limit(1);
    if (!grid) {
      return NextResponse.json({ error: "Grid not found" }, { status: 404 });
    }
    if (grid.language !== book.language) {
      return NextResponse.json(
        { error: "Cette grille n'est pas dans la même langue que le livre." },
        { status: 400 },
      );
    }

    const gridWords = await db
      .select({
        answer: placedWords.answer,
        clueText: placedWords.clueText,
        isCustom: placedWords.isCustom,
      })
      .from(placedWords)
      .where(eq(placedWords.crosswordId, grid.id));
    if (gridWords.length === 0) {
      return NextResponse.json({ error: "Grid has no words" }, { status: 400 });
    }

    // Detect overlap with what's already in the book. Words use the same length
    // threshold the exclusion logic enforces, so we don't flag short filler that
    // is allowed to repeat.
    const { words: bookWords, clues: bookClues } = await collectUsedWordsAndClues(book.id);
    const conflictWords = [
      ...new Set(
        gridWords
          .map((w) => normalizeAnswer(w.answer))
          .filter((w) => w.length >= MIN_LOCKED_WORD_LENGTH && bookWords.has(w)),
      ),
    ];
    const conflictClues = [
      ...new Set(gridWords.map((w) => w.clueText).filter((c) => bookClues.has(c))),
    ];
    const hasConflict = conflictWords.length > 0 || conflictClues.length > 0;

    // Unresolved conflict: report it and let the UI choose how to proceed.
    if (hasConflict && !input.regenerateToFit && !input.force) {
      return NextResponse.json({
        conflict: { words: conflictWords, clues: conflictClues },
      });
    }

    const existing = await db
      .select({ position: bookPages.position })
      .from(bookPages)
      .where(eq(bookPages.bookId, book.id));
    const position =
      existing.length > 0 ? Math.max(...existing.map((p) => p.position)) + 1 : 0;

    const baseConfig: GridPageConfig = {
      ...(grid.hiddenWord ? { hiddenWord: grid.hiddenWord } : {}),
      ...(input.config?.gridColor !== undefined ? { gridColor: input.config.gridColor } : {}),
      ...(input.config?.hiddenWord !== undefined ? { hiddenWord: input.config.hiddenWord } : {}),
      ...(input.config?.difficulty !== undefined ? { difficulty: input.config.difficulty } : {}),
    };

    let crosswordId: string;

    if (input.regenerateToFit) {
      // Regenerate a fresh grid that fits the book, keeping the standalone
      // grid's custom words. The clue de-dup + word exclusion is applied inside
      // generateAndSaveGrid via usedWords/usedClues.
      const customClues = gridWords
        .filter((w) => w.isCustom)
        .map((w) => ({ answer: w.answer, clue: w.clueText }));
      const regenerated = await generateAndSaveGrid({
        width: grid.width,
        height: grid.height,
        title: `Grille ${position + 1}`,
        customClues,
        difficulty: input.config?.difficulty,
        usedClues: bookClues,
        usedWords: bookWords,
      });
      if (!regenerated) {
        return NextResponse.json(
          { error: "Impossible de régénérer la grille pour ce livre." },
          { status: 500 },
        );
      }
      crosswordId = regenerated.crosswordId;
    } else {
      // Attach a COPY so the original standalone grid stays independent (deleting
      // the book page must not delete a grid the user may still use elsewhere).
      crosswordId = await copyCrossword(grid.id);
    }

    const [page] = await db
      .insert(bookPages)
      .values({
        bookId: book.id,
        position,
        kind: "grid",
        crosswordId,
        config: baseConfig,
      })
      .returning({ id: bookPages.id });

    const serialized = await serializePage(page.id);
    if (!serialized) {
      return NextResponse.json({ error: "Failed to load attached grid" }, { status: 500 });
    }
    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Attach grid error:", error);
    return NextResponse.json({ error: "Failed to attach grid" }, { status: 500 });
  }
}

/** Deep-copy a crossword row + its placed words, returning the new crossword id. */
async function copyCrossword(sourceId: string): Promise<string> {
  const [src] = await db.select().from(crosswords).where(eq(crosswords.id, sourceId)).limit(1);
  const [copy] = await db
    .insert(crosswords)
    .values({
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
    })
    .returning({ id: crosswords.id });

  const srcWords = await db.select().from(placedWords).where(eq(placedWords.crosswordId, sourceId));
  if (srcWords.length > 0) {
    await db.insert(placedWords).values(
      srcWords.map((w) => ({
        crosswordId: copy.id,
        answer: w.answer,
        direction: w.direction,
        number: w.number,
        startRow: w.startRow,
        startCol: w.startCol,
        length: w.length,
        clueText: w.clueText,
        isCustom: w.isCustom,
        breaks: w.breaks,
      })),
    );
  }
  return copy.id;
}
