import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { postcards } from "@/db/schema/postcards";
import { crosswords } from "@/db/schema/crosswords";
import { eq } from "drizzle-orm";
import { generateAndSaveGrid } from "@/lib/books/generate-grid";
import { authorizePostcardEdit } from "@/lib/postcards/authorize";
import { loadPostcard } from "@/lib/postcards/serialize";
import { POSTCARD_GRID_WIDTH, POSTCARD_GRID_HEIGHT } from "@/lib/postcard-pdf/geometry";

// A personalized small grid still races the worker pool; give it headroom.
export const maxDuration = 300;

const requestSchema = z.object({
  // The personalized words + clues that seed the card's grid.
  customClues: z
    .array(z.object({ answer: z.string().min(1).max(20), clue: z.string().max(120) }))
    .max(6)
    .default([]),
  difficulty: z.enum(["facile", "moyen", "difficile", "balanced"]).optional(),
});

/** Generate (or regenerate) the front grid of a card and attach it. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const authResult = await authorizePostcardEdit(req, code);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    const result = await generateAndSaveGrid({
      width: POSTCARD_GRID_WIDTH,
      height: POSTCARD_GRID_HEIGHT,
      title: authResult.card.title ?? "Carte",
      customClues: parsed.data.customClues,
      usedClues: new Set(),
      usedWords: new Set(),
      difficulty: parsed.data.difficulty,
    });

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Impossible de générer la grille. Essayez avec moins de mots personnalisés ou des mots plus courts.",
        },
        { status: 500 },
      );
    }

    const previousCrosswordId = authResult.card.crosswordId;
    await db
      .update(postcards)
      .set({ crosswordId: result.crosswordId, status: "ready", updatedAt: new Date() })
      .where(eq(postcards.id, authResult.card.id));

    // Drop the superseded grid (its placed words cascade) so cards don't leak
    // orphan crosswords on every regenerate.
    if (previousCrosswordId && previousCrosswordId !== result.crosswordId) {
      await db.delete(crosswords).where(eq(crosswords.id, previousCrosswordId));
    }

    const card = await loadPostcard(code);
    return NextResponse.json(card);
  } catch (error) {
    console.error("Postcard grid generation error:", error);
    return NextResponse.json({ error: "Failed to generate postcard grid" }, { status: 500 });
  }
}
