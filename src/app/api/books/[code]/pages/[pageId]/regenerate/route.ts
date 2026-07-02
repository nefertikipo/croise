import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books, bookPages } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { eq } from "drizzle-orm";
import { serializePage } from "@/lib/books/serialize";
import { generateAndSaveGrid } from "@/lib/books/generate-grid";
import { collectUsedClues } from "@/lib/books/used-clues";
import type { GridPageConfig } from "@/types/book";

export const maxDuration = 120;

const requestSchema = z.object({
  width: z.number().min(8).max(20).default(11),
  height: z.number().min(8).max(20).default(17),
  hiddenWord: z.string().optional(),
  gridColor: z.string().optional(),
  customClues: z
    .array(z.object({ answer: z.string(), clue: z.string() }))
    .default([]),
});

/** Regenerate a grid page's puzzle in place, keeping its position in the spine. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string; pageId: string }> },
) {
  try {
    const { code, pageId } = await params;
    const input = requestSchema.parse(await request.json());

    const [book] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.code, code))
      .limit(1);
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const [page] = await db
      .select({
        id: bookPages.id,
        kind: bookPages.kind,
        position: bookPages.position,
        crosswordId: bookPages.crosswordId,
        config: bookPages.config,
      })
      .from(bookPages)
      .where(eq(bookPages.id, pageId))
      .limit(1);

    if (!page || page.kind !== "grid") {
      return NextResponse.json({ error: "Grid page not found" }, { status: 404 });
    }

    const usedClues = await collectUsedClues(book.id, page.crosswordId ?? undefined);
    const grid = await generateAndSaveGrid({
      width: input.width,
      height: input.height,
      title: `Grille ${page.position + 1}`,
      customClues: input.customClues,
      usedClues,
    });

    if (!grid) {
      return NextResponse.json(
        { error: "Failed to regenerate grid after max attempts" },
        { status: 500 },
      );
    }

    const prevConfig = (page.config as GridPageConfig) ?? {};
    const nextConfig: GridPageConfig = {
      ...prevConfig,
      ...(input.gridColor !== undefined ? { gridColor: input.gridColor } : {}),
      ...(input.hiddenWord !== undefined ? { hiddenWord: input.hiddenWord } : {}),
    };

    const oldCrosswordId = page.crosswordId;
    await db
      .update(bookPages)
      .set({ crosswordId: grid.crosswordId, config: nextConfig })
      .where(eq(bookPages.id, pageId));

    if (oldCrosswordId) {
      await db.delete(crosswords).where(eq(crosswords.id, oldCrosswordId));
    }

    const serialized = await serializePage(pageId);
    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Grid regenerate error:", error);
    return NextResponse.json({ error: "Failed to regenerate grid" }, { status: 500 });
  }
}
