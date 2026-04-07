import { NextResponse } from "next/server";
import { db } from "@/db";
import { words, clues } from "@/db/schema/clue-entries";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select({
        word: words.word,
        clue: clues.clue,
        difficulty: clues.difficulty,
        source: clues.source,
        createdAt: clues.id, // id as proxy for order (serial)
      })
      .from(clues)
      .innerJoin(words, eq(clues.wordId, words.id))
      .where(eq(clues.origin, "user"))
      .orderBy(desc(clues.id))
      .limit(50);

    return NextResponse.json(
      rows.map((r) => ({
        word: r.word,
        clue: r.clue,
        difficulty: r.difficulty,
        author: r.source?.startsWith("user:") ? r.source.slice(5) : null,
      })),
    );
  } catch (error) {
    console.error("Contributions fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
