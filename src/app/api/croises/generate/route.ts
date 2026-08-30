import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureLoaded,
  getFrenchWordList,
  getFrenchClueDb,
  getFrenchClueDifficulty,
} from "@/lib/crossword/load-french-clues";
import { generateAmerican } from "@/lib/crossword/american/generate";
import { TEMPLATES } from "@/lib/crossword/american/grid-templates";
import { db } from "@/db";
import { americanCrosswords } from "@/db/schema/american-crosswords";
import { generateAmericanCode, retryOnUniqueViolation } from "@/lib/code";
import { auth } from "@/lib/auth";

// Generation is fast (ms), but corpus load on a cold instance pulls ~460K rows
// from Neon — give it room.
export const maxDuration = 120;

const requestSchema = z.object({
  templateId: z.string().optional(),
  size: z.number().min(7).max(21).optional(),
  customClues: z
    .array(z.object({ answer: z.string(), clue: z.string() }))
    .default([]),
  difficulty: z.enum(["facile", "moyen", "difficile", "balanced"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const params = requestSchema.parse(body);

    await ensureLoaded();
    const wordList = getFrenchWordList();
    const clueDb = getFrenchClueDb();
    const clueDiff = getFrenchClueDifficulty();

    const result = generateAmerican(
      {
        templateId: params.templateId,
        size: params.size,
        customClues: params.customClues,
        difficulty: params.difficulty,
        // Room for the 21x21 Sunday, which can need a restart or two. Small grids
        // still return in ms — the solve loop exits as soon as it succeeds.
        timeBudgetMs: 20000,
      },
      wordList,
      clueDb,
      clueDiff,
    );

    if (!result.success || !result.puzzle) {
      return NextResponse.json(
        { error: "Impossible de générer la grille. Réessayez." },
        { status: 500 },
      );
    }

    // Persist for sharing. Generation still succeeds if the save fails.
    let code: string | undefined;
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      const ownerId = session?.user.id ?? null;
      const puzzle = result.puzzle;
      const saved = await retryOnUniqueViolation(async () => {
        const c = generateAmericanCode();
        const [row] = await db
          .insert(americanCrosswords)
          .values({
            code: c,
            ownerId,
            width: puzzle.width,
            height: puzzle.height,
            difficulty: params.difficulty ?? "balanced",
            puzzle,
          })
          .returning({ code: americanCrosswords.code });
        return row;
      });
      code = saved.code;
    } catch (saveErr) {
      console.error("Failed to save mots croisés:", saveErr);
    }

    return NextResponse.json({
      code,
      puzzle: result.puzzle,
      unplacedCustom: result.unplacedCustom,
    });
  } catch (error) {
    console.error("Mots croisés generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate crossword" },
      { status: 500 },
    );
  }
}

/** List available templates (for the picker UI). */
export async function GET() {
  return NextResponse.json({
    templates: TEMPLATES.map((t) => ({
      id: t.id,
      width: t.width,
      height: t.height,
    })),
  });
}
