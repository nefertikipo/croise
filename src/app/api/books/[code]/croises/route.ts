import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { bookPages } from "@/db/schema/books";
import { americanCrosswords } from "@/db/schema/american-crosswords";
import { eq } from "drizzle-orm";
import { serializePage, loadBook } from "@/lib/books/serialize";
import { authorizeBookEdit, touchBookStatement } from "@/lib/books/authorize";
import { interiorPageCountForCapacity } from "@/lib/book-pdf/generate-book";
import { SADDLE_MAX_INTERIOR_PAGES } from "@/lib/books/constants";
import { generateAmericanCode, retryOnUniqueViolation } from "@/lib/code";
import {
  ensureLoaded,
  getFrenchWordList,
  getFrenchClueDb,
  getFrenchClueDifficulty,
} from "@/lib/crossword/load-french-clues";
import { generateAmerican } from "@/lib/crossword/american/generate";
import type { BookPageData } from "@/types/book";

export const maxDuration = 120;

const MAX_PER_REQUEST = 5;

const requestSchema = z.object({
  count: z.number().min(1).max(10).default(1),
  size: z.number().min(7).max(21).optional(),
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
    const p = requestSchema.parse(await request.json());

    const authz = await authorizeBookEdit(request, code);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
    const book = authz.book;

    // Hard printable-window ceiling (same gate the fléchés route uses).
    const loadedForCapacity = await loadBook(code);
    let interiorPages = loadedForCapacity
      ? interiorPageCountForCapacity(loadedForCapacity)
      : 1;
    if (interiorPages >= SADDLE_MAX_INTERIOR_PAGES) {
      return NextResponse.json(
        {
          error: `Votre livre atteint la limite de ${SADDLE_MAX_INTERIOR_PAGES} pages imprimables. Supprimez des pages pour ajouter une grille.`,
        },
        { status: 409 },
      );
    }

    await ensureLoaded();
    const wordList = getFrenchWordList();
    const clueDb = getFrenchClueDb();
    const clueDiff = getFrenchClueDifficulty();

    const existing = await db
      .select({ position: bookPages.position })
      .from(bookPages)
      .where(eq(bookPages.bookId, book.id));
    let nextPosition =
      existing.length > 0 ? Math.max(...existing.map((r) => r.position)) + 1 : 0;

    const target = Math.min(p.count, MAX_PER_REQUEST);
    const createdPageIds: string[] = [];

    for (let n = 0; n < target; n++) {
      const result = generateAmerican(
        {
          size: p.size ?? 11,
          difficulty: p.difficulty,
          customClues: p.customClues,
          timeBudgetMs: 10000,
        },
        wordList,
        clueDb,
        clueDiff,
      );
      if (!result.success || !result.puzzle) {
        if (createdPageIds.length === 0) {
          return NextResponse.json(
            { error: "Impossible de générer la grille. Réessayez." },
            { status: 422 },
          );
        }
        break;
      }

      const puzzle = result.puzzle;
      const title = `Mots croisés ${nextPosition + 1}`;
      const saved = await retryOnUniqueViolation(async () => {
        const c = generateAmericanCode();
        const [row] = await db
          .insert(americanCrosswords)
          .values({
            code: c,
            ownerId: book.ownerId ?? null,
            title,
            width: puzzle.width,
            height: puzzle.height,
            difficulty: p.difficulty ?? "balanced",
            puzzle,
          })
          .returning({ id: americanCrosswords.id });
        return row;
      });

      const pageId = crypto.randomUUID();
      await db.batch([
        db.insert(bookPages).values({
          id: pageId,
          bookId: book.id,
          position: nextPosition,
          kind: "croises",
          americanCrosswordId: saved.id,
          config: {
            title,
            ...(p.gridColor ? { gridColor: p.gridColor } : {}),
            ...(p.difficulty ? { difficulty: p.difficulty } : {}),
          },
        }),
        touchBookStatement(book.id),
      ]);
      createdPageIds.push(pageId);
      nextPosition += 1;

      const after = await loadBook(code);
      if (after) interiorPages = interiorPageCountForCapacity(after);
      if (interiorPages >= SADDLE_MAX_INTERIOR_PAGES) break;
    }

    const pages: BookPageData[] = [];
    for (const id of createdPageIds) {
      const page = await serializePage(id);
      if (page) pages.push(page);
    }

    return NextResponse.json({ pages, interiorPages });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    console.error("Croisés book grid error:", error);
    return NextResponse.json({ error: "Failed to add crossword" }, { status: 500 });
  }
}
