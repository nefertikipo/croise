import { NextResponse } from "next/server";
import { db } from "@/db";
import { words, clues } from "@/db/schema/clue-entries";
import { eq, and } from "drizzle-orm";

/**
 * POST: submit a user-written clue for a word
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { word: rawWord, clue: clueText, author } = body;

    if (!rawWord || !clueText) {
      return NextResponse.json({ error: "Mot et indice requis" }, { status: 400 });
    }

    const word = rawWord
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "");

    if (word.length < 2 || word.length > 15) {
      return NextResponse.json({ error: "Le mot doit faire entre 2 et 15 lettres" }, { status: 400 });
    }

    // Upsert the word
    let [existing] = await db
      .select({ id: words.id })
      .from(words)
      .where(and(eq(words.word, word), eq(words.language, "fr")))
      .limit(1);

    if (!existing) {
      const [inserted] = await db
        .insert(words)
        .values({
          word,
          length: word.length,
          language: "fr",
          qualityScore: 90,
          frequency: 1,
        })
        .onConflictDoNothing()
        .returning({ id: words.id });

      if (inserted) {
        existing = inserted;
      } else {
        [existing] = await db
          .select({ id: words.id })
          .from(words)
          .where(and(eq(words.word, word), eq(words.language, "fr")))
          .limit(1);
      }
    }

    if (!existing) {
      return NextResponse.json({ error: "Erreur creation mot" }, { status: 500 });
    }

    // Insert the clue (unverified, needs review)
    const difficulty = [1, 2, 3].includes(body.difficulty) ? body.difficulty : null;
    await db.insert(clues).values({
      wordId: existing.id,
      clue: clueText.trim(),
      language: "fr",
      difficulty,
      source: author ? `user:${author}` : "user",
      origin: "user",
      verified: false,
    });

    return NextResponse.json({ success: true, word });
  } catch (error) {
    console.error("Contribute error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
