import { NextResponse } from "next/server";
import { db } from "@/db";
import { words, clues } from "@/db/schema/clue-entries";
import { eq, and, isNull, sql } from "drizzle-orm";

/**
 * GET: fetch a random unlabeled clue-answer pair
 */
export async function GET() {
  try {
    // Check if there's a calibration test set to prioritize
    const url = new URL(request.url);
    const calibration = url.searchParams.get("calibration") === "true";

    let pair;

    if (calibration) {
      // Load test pair IDs from file (set by batch-score.ts --test)
      let testIds: number[] = [];
      try {
        const { readFileSync } = await import("fs");
        const testPairs = JSON.parse(readFileSync("data/test-pairs.json", "utf-8"));
        testIds = testPairs.map((p: { id: number }) => p.id);
      } catch {}

      if (testIds.length > 0) {
        [pair] = await db
          .select({
            clueId: clues.id,
            word: words.word,
            clue: clues.clue,
            source: clues.source,
            difficulty: clues.difficulty,
          })
          .from(clues)
          .innerJoin(words, eq(clues.wordId, words.id))
          .where(
            and(
              isNull(clues.difficulty),
              sql`${clues.id} = ANY(${testIds})`,
            ),
          )
          .orderBy(sql`RANDOM()`)
          .limit(1);
      }
    }

    // Fallback: random unlabeled pair
    if (!pair) {
      [pair] = await db
        .select({
          clueId: clues.id,
          word: words.word,
          clue: clues.clue,
          source: clues.source,
          difficulty: clues.difficulty,
        })
        .from(clues)
        .innerJoin(words, eq(clues.wordId, words.id))
        .where(isNull(clues.difficulty))
        .orderBy(sql`RANDOM()`)
        .limit(1);
    }

    if (!pair) {
      return NextResponse.json({ done: true });
    }

    // Also get stats
    const [stats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        labeled: sql<number>`COUNT(${clues.difficulty})`,
        facile: sql<number>`COUNT(*) FILTER (WHERE ${clues.difficulty} = 1)`,
        moyen: sql<number>`COUNT(*) FILTER (WHERE ${clues.difficulty} = 2)`,
        difficile: sql<number>`COUNT(*) FILTER (WHERE ${clues.difficulty} = 3)`,
      })
      .from(clues);

    return NextResponse.json({
      pair: {
        id: pair.clueId,
        word: pair.word,
        clue: pair.clue,
        source: pair.source,
      },
      stats: {
        total: Number(stats.total),
        labeled: Number(stats.labeled),
        facile: Number(stats.facile),
        moyen: Number(stats.moyen),
        difficile: Number(stats.difficile),
      },
    });
  } catch (error) {
    console.error("Label GET error:", error);
    return NextResponse.json({ error: "Failed to fetch pair" }, { status: 500 });
  }
}

/**
 * POST: save a difficulty label for a clue, or delete it
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clueId, difficulty, action, reason } = body;

    if (!clueId) {
      return NextResponse.json({ error: "Missing clueId" }, { status: 400 });
    }

    if (action === "delete") {
      await db.delete(clues).where(eq(clues.id, clueId));
      return NextResponse.json({ success: true, deleted: true });
    }

    if (action === "love") {
      await db
        .update(clues)
        .set({ verified: true, vibe: "favori" })
        .where(eq(clues.id, clueId));
      return NextResponse.json({ success: true, loved: true });
    }

    if (![1, 2, 3].includes(difficulty)) {
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { difficulty, verified: true };
    if (body.newClue && typeof body.newClue === "string" && body.newClue.trim()) {
      updates.clue = body.newClue.trim();
    }
    if (body.loved) {
      updates.vibe = "favori";
    }

    await db
      .update(clues)
      .set(updates)
      .where(eq(clues.id, clueId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Label POST error:", error);
    return NextResponse.json({ error: "Failed to save label" }, { status: 500 });
  }
}
