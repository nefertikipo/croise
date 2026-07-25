import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { bookPages } from "@/db/schema/books";
import { eq } from "drizzle-orm";
import { serializePage } from "@/lib/books/serialize";
import { generateAndSaveGrid } from "@/lib/books/generate-grid";
import { collectUsedWordsAndClues } from "@/lib/books/used-clues";
import { authorizeBookEdit, touchBookStatement } from "@/lib/books/authorize";
import { normalizeAnswer } from "@/lib/crossword/normalize";
import { checkCapacity } from "@/lib/crossword/check-capacity";
import { placedWords } from "@/db/schema/placed-words";
import type { BookPageData } from "@/types/book";

export const maxDuration = 120;

/**
 * Each grid can burn up to ~25s of solver budget (more with custom words) and
 * the first request also pays the corpus cold load, so a batch can overrun the
 * function's 120s maxDuration. Cap the batch size and stop generating past
 * this wall-clock budget, returning the partial result instead of timing out.
 */
const MAX_GRIDS_PER_REQUEST = 5;
const WALL_CLOCK_BUDGET_MS = 90_000;

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

interface BatchFailure {
  requested: number;
  created: number;
  reason: string;
}

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

    const authz = await authorizeBookEdit(request, code);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
    const book = authz.book;

    const existing = await db
      .select({ position: bookPages.position })
      .from(bookPages)
      .where(eq(bookPages.bookId, book.id));

    let nextPosition =
      existing.length > 0 ? Math.max(...existing.map((p) => p.position)) + 1 : 0;

    const { words: usedWords, clues: usedClues } =
      await collectUsedWordsAndClues(book.id);
    const config = {
      ...(gridParams.gridColor ? { gridColor: gridParams.gridColor } : {}),
      ...(gridParams.hiddenWord ? { hiddenWord: gridParams.hiddenWord } : {}),
      ...(gridParams.difficulty ? { difficulty: gridParams.difficulty } : {}),
    };

    const startedAt = Date.now();
    const requested = gridParams.count;
    const target = Math.min(requested, MAX_GRIDS_PER_REQUEST);
    const createdPageIds: string[] = [];
    let failed: BatchFailure | null = null;

    for (let n = 0; n < target; n++) {
      if (n > 0 && Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) {
        failed = {
          requested,
          created: createdPageIds.length,
          reason:
            "Temps de génération dépassé : les grilles déjà créées ont été conservées. Relancez pour ajouter les suivantes.",
        };
        break;
      }

      const grid = await generateAndSaveGrid({
        width: gridParams.width,
        height: gridParams.height,
        title: `Grille ${nextPosition + 1}`,
        customClues: gridParams.customClues,
        hiddenWord: gridParams.hiddenWord,
        difficulty: gridParams.difficulty,
        usedClues,
        usedWords,
      });

      if (!grid) {
        if (createdPageIds.length === 0) {
          return NextResponse.json(
            {
              error:
                "Impossible de générer la grille. Essayez avec moins de mots personnalisés, des mots plus courts ou une grille plus grande.",
            },
            { status: 422 },
          );
        }
        failed = {
          requested,
          created: createdPageIds.length,
          reason:
            "La génération a échoué en cours de lot : les grilles déjà créées ont été conservées. Relancez pour ajouter les suivantes.",
        };
        break;
      }

      // Fold this grid's words + clues into the exclusion sets so the next grid
      // in this batch neither repeats a word nor a clue.
      const newWords = await db
        .select({ answer: placedWords.answer, clueText: placedWords.clueText })
        .from(placedWords)
        .where(eq(placedWords.crosswordId, grid.crosswordId));
      for (const w of newWords) {
        usedWords.add(normalizeAnswer(w.answer));
        usedClues.add(w.clueText);
      }

      const pageId = crypto.randomUUID();
      await db.batch([
        db.insert(bookPages).values({
          id: pageId,
          bookId: book.id,
          position: nextPosition,
          kind: "grid",
          crosswordId: grid.crosswordId,
          config,
        }),
        touchBookStatement(book.id),
      ]);

      createdPageIds.push(pageId);
      nextPosition += 1;
    }

    if (!failed && requested > target) {
      failed = {
        requested,
        created: createdPageIds.length,
        reason: `Maximum ${MAX_GRIDS_PER_REQUEST} grilles par requête : relancez pour ajouter les suivantes.`,
      };
    }

    const pages: BookPageData[] = [];
    for (const id of createdPageIds) {
      const p = await serializePage(id);
      if (p) pages.push(p);
    }

    // `failed` is additive — existing UI only reads `pages`.
    return NextResponse.json(failed ? { pages, failed } : { pages });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    console.error("Grid generation error:", error);
    return NextResponse.json({ error: "Failed to add grid" }, { status: 500 });
  }
}
