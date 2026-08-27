import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { bookPages } from "@/db/schema/books";
import { eq } from "drizzle-orm";
import { serializePage, loadBook } from "@/lib/books/serialize";
import { generateAndSaveGrid } from "@/lib/books/generate-grid";
import { collectUsedWordsAndClues } from "@/lib/books/used-clues";
import { authorizeBookEdit, touchBookStatement } from "@/lib/books/authorize";
import { interiorPageCountForCapacity } from "@/lib/book-pdf/generate-book";
import { SADDLE_MAX_INTERIOR_PAGES } from "@/lib/books/constants";
import { normalizeAnswer } from "@/lib/crossword/normalize";
import { checkCapacity } from "@/lib/crossword/check-capacity";
import { reservedRectForPreset } from "@/lib/crossword/photo-presets";
import { placedWords } from "@/db/schema/placed-words";
import type { BookPageData, GridPhoto } from "@/types/book";

// 300s (Vercel Pro max), matching /fleche and the regenerate route. The function
// gets boosted memory/vCPUs via vercel.json so each grid can race the worker pool.
export const maxDuration = 300;

/**
 * Each grid races the worker pool for up to PER_GRID_BUDGET_MS (more than a plain
 * grid needs, but the ceiling for a hard custom-word one), and the first request
 * also pays the corpus cold load — so a batch can overrun maxDuration. Cap the
 * batch size and stop STARTING new grids past the wall-clock budget, returning
 * the partial result instead of timing out. The budget leaves headroom below
 * maxDuration for one in-flight grid to finish (200s + 90s < 300s).
 */
const MAX_GRIDS_PER_REQUEST = 5;
const WALL_CLOCK_BUDGET_MS = 200_000;
const PER_GRID_BUDGET_MS = 90_000;

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
  photo: z
    .object({
      preset: z.string(),
      photoRef: z.string().optional(),
      imageUrl: z.string().optional(),
      crop: z
        .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
        .optional(),
    })
    .nullable()
    .optional(),
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

    // Photo block: resolve the preset to a reserved cell rectangle the generator
    // must fill around. Only a resolvable photo is kept on the page config.
    const photo: GridPhoto | undefined = gridParams.photo ?? undefined;
    const reservedRect = photo
      ? (reservedRectForPreset(photo.preset, gridParams.width, gridParams.height) ?? undefined)
      : undefined;
    const reservedCells = reservedRect ? reservedRect.w * reservedRect.h : 0;

    const capacityError = checkCapacity(
      gridParams.width,
      gridParams.height,
      gridParams.customClues,
      reservedCells,
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
      ...(reservedRect && photo ? { photo } : {}),
    };

    // HARD page ceiling: never grow a book past the saddle-stitch printable
    // window. Measured now and re-measured after every grid, because a grid
    // adds not just its own page but index + solutions entries too.
    const loadedForCapacity = await loadBook(code);
    let interiorPages = loadedForCapacity
      ? interiorPageCountForCapacity(loadedForCapacity)
      : 1;
    if (interiorPages >= SADDLE_MAX_INTERIOR_PAGES) {
      return NextResponse.json(
        {
          error: `Votre carnet atteint la limite de ${SADDLE_MAX_INTERIOR_PAGES} pages imprimables. Supprimez des pages pour ajouter une grille.`,
        },
        { status: 409 },
      );
    }

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
        reservedRect,
        usedClues,
        usedWords,
        // Keep each grid's budget small enough that a batch still fits maxDuration.
        timeBudgetMs: PER_GRID_BUDGET_MS,
        maxWaitMs: PER_GRID_BUDGET_MS + 5_000,
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

      // Re-measure and stop before starting a grid that would breach the
      // ceiling. Because padded counts are multiples of 4 and one grid adds at
      // most a handful of pages, a book at < MAX before this add lands ≤ MAX
      // after it — so we never overshoot the printable window.
      const afterGrid = await loadBook(code);
      if (afterGrid) interiorPages = interiorPageCountForCapacity(afterGrid);
      if (interiorPages >= SADDLE_MAX_INTERIOR_PAGES) {
        if (n < target - 1) {
          failed = {
            requested,
            created: createdPageIds.length,
            reason: `Limite de ${SADDLE_MAX_INTERIOR_PAGES} pages imprimables atteinte : les grilles créées ont été conservées.`,
          };
        }
        break;
      }
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

    // `failed` and `interiorPages` are additive — existing UI reads `pages`.
    return NextResponse.json({ pages, interiorPages, ...(failed ? { failed } : {}) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    console.error("Grid generation error:", error);
    return NextResponse.json({ error: "Failed to add grid" }, { status: 500 });
  }
}
