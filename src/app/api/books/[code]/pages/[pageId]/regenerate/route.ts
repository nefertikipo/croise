import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { bookPages } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { and, eq } from "drizzle-orm";
import { serializePage } from "@/lib/books/serialize";
import { generateAndSaveGrid } from "@/lib/books/generate-grid";
import { collectUsedWordsAndClues } from "@/lib/books/used-clues";
import { authorizeBookEdit, touchBookStatement } from "@/lib/books/authorize";
import { checkCapacity } from "@/lib/crossword/check-capacity";
import { hardCustomWordsHint } from "@/lib/crossword/generation-hint";
import type { GridPageConfig } from "@/types/book";
import type { BatchItem } from "drizzle-orm/batch";

export const maxDuration = 120;

const requestSchema = z.object({
  width: z.number().min(8).max(20).default(11),
  height: z.number().min(8).max(20).default(17),
  hiddenWord: z.string().optional(),
  gridColor: z.string().optional(),
  customClues: z
    .array(z.object({ answer: z.string(), clue: z.string() }))
    .default([]),
  difficulty: z.enum(["facile", "moyen", "difficile", "balanced"]).optional(),
});

/** Regenerate a grid page's puzzle in place, keeping its position in the spine. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string; pageId: string }> },
) {
  try {
    const { code, pageId } = await params;
    const input = requestSchema.parse(await request.json());

    const capacityError = checkCapacity(input.width, input.height, input.customClues);
    if (capacityError) {
      return NextResponse.json({ error: capacityError }, { status: 400 });
    }

    const authz = await authorizeBookEdit(request, code);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
    const book = authz.book;

    // Scope to the book from the URL so a page id from another book 404s.
    const [page] = await db
      .select({
        id: bookPages.id,
        kind: bookPages.kind,
        position: bookPages.position,
        crosswordId: bookPages.crosswordId,
        config: bookPages.config,
      })
      .from(bookPages)
      .where(and(eq(bookPages.id, pageId), eq(bookPages.bookId, book.id)))
      .limit(1);

    if (!page || page.kind !== "grid") {
      return NextResponse.json({ error: "Grid page not found" }, { status: 404 });
    }

    // Exclude words/clues from every *other* grid in the book. Passing this
    // page's own crosswordId frees its current words so the regenerated grid can
    // reuse them; they re-lock as soon as the new grid is saved.
    const { words: usedWords, clues: usedClues } = await collectUsedWordsAndClues(
      book.id,
      page.crosswordId ?? undefined,
    );

    // The regenerated grid must honor the page's mot caché: the request's value
    // wins when provided (including "" to clear it), else keep the stored one.
    const prevConfig = (page.config as GridPageConfig) ?? {};
    const hiddenWord =
      input.hiddenWord !== undefined ? input.hiddenWord : prevConfig.hiddenWord;

    const grid = await generateAndSaveGrid({
      width: input.width,
      height: input.height,
      title: `Grille ${page.position + 1}`,
      customClues: input.customClues,
      hiddenWord,
      difficulty: input.difficulty,
      usedClues,
      usedWords,
    });

    if (!grid) {
      // Same per-word hints as /fleche when a custom word is provably hard.
      // Response shape unchanged ({ error }).
      const hint = hardCustomWordsHint(input.customClues);
      return NextResponse.json(
        {
          error: hint
            ? `Impossible de régénérer la grille. ${hint}`
            : "Failed to regenerate grid after max attempts",
        },
        { status: 500 },
      );
    }

    const nextConfig: GridPageConfig = {
      ...prevConfig,
      ...(input.gridColor !== undefined ? { gridColor: input.gridColor } : {}),
      ...(input.hiddenWord !== undefined ? { hiddenWord: input.hiddenWord } : {}),
      ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
    };

    // Repoint the page and drop the replaced crossword in one atomic batch
    // (repoint first so the old crossword is unreferenced when deleted).
    const oldCrosswordId = page.crosswordId;
    const statements: BatchItem<"pg">[] = [
      db
        .update(bookPages)
        .set({ crosswordId: grid.crosswordId, config: nextConfig })
        .where(and(eq(bookPages.id, pageId), eq(bookPages.bookId, book.id))),
      touchBookStatement(book.id),
    ];
    if (oldCrosswordId) {
      statements.push(db.delete(crosswords).where(eq(crosswords.id, oldCrosswordId)));
    }
    await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

    const serialized = await serializePage(pageId);
    return NextResponse.json(serialized);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    console.error("Grid regenerate error:", error);
    return NextResponse.json({ error: "Failed to regenerate grid" }, { status: 500 });
  }
}
