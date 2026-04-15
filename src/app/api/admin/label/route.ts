import { NextResponse } from "next/server";
import { db } from "@/db";
import { words, clues } from "@/db/schema/clue-entries";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";

const CALIBRATION_IDS = [90046,31457,194506,221059,354367,39272,195364,286536,351978,81970,102892,206392,252773,190627,192798,187265,116811,193629,58496,275470,389742,53191,320573,346620,326808,264355,324166,246320,250460,88547,170652,45101,185970,135024,47936,117821,46754,96585,100648,108942,248668,216657,379863,336897,179414,243717,94348,263493,376389,257265,37381,245926,376232,118666,324165,274620,308028,89777,141653,73672,296701,53109,63459,359260,31386,149261,178479,332736,188280,200540,72920,161117,88048,228467,93805,350740,381424,142031,287063,272023,105937,348904,34209,292379,167106,230842,239303,53018,87070,202907,358448,189155,374537,315473,89514,57475,236194,123138,81184,276773];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const calibration = url.searchParams.get("calibration") === "true";

    let pair;

    if (calibration) {
      // Only pull from the 100 calibration test pairs
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
        .where(and(isNull(clues.difficulty), inArray(clues.id, CALIBRATION_IDS)))
        .orderBy(sql`RANDOM()`)
        .limit(1);
    } else {
      // Random unlabeled pair
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

    // Stats scoped to calibration set or global
    const [stats] = calibration
      ? await db
          .select({
            total: sql<number>`COUNT(*)`,
            labeled: sql<number>`COUNT(${clues.difficulty})`,
            facile: sql<number>`COUNT(*) FILTER (WHERE ${clues.difficulty} = 1)`,
            moyen: sql<number>`COUNT(*) FILTER (WHERE ${clues.difficulty} = 2)`,
            difficile: sql<number>`COUNT(*) FILTER (WHERE ${clues.difficulty} = 3)`,
          })
          .from(clues)
          .where(inArray(clues.id, CALIBRATION_IDS))
      : await db
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
    return NextResponse.json({ error: "Failed to fetch pair", detail: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clueId, difficulty, action } = body;

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

    await db.update(clues).set(updates).where(eq(clues.id, clueId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Label POST error:", error);
    return NextResponse.json({ error: "Failed to save label" }, { status: 500 });
  }
}
