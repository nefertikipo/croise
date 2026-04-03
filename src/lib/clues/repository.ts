import { db } from "@/db";
import { clueEntries } from "@/db/schema/clue-entries";
import { eq, and, sql } from "drizzle-orm";
import type { Language, Difficulty, Vibe } from "@/types";

/**
 * Find the best clue for a given answer from the clue database.
 */
export async function findClueForAnswer(
  answer: string,
  language: Language,
  difficulty?: Difficulty
): Promise<{ clue: string; id: number } | null> {
  const conditions = [
    eq(clueEntries.answer, answer.toUpperCase()),
    eq(clueEntries.language, language),
  ];

  const results = await db
    .select({
      id: clueEntries.id,
      clue: clueEntries.clue,
      difficulty: clueEntries.difficulty,
      source: clueEntries.source,
    })
    .from(clueEntries)
    .where(and(...conditions))
    .limit(20);

  if (results.length === 0) return null;

  // Prefer clues matching the target difficulty, then by source quality
  const scored = results.map((r) => {
    let score = 0;
    if (difficulty && r.difficulty) {
      score -= Math.abs(r.difficulty - difficulty) * 10;
    }
    // Prefer named sources
    if (r.source === "nyt") score += 5;
    if (r.source === "wapo") score += 4;
    if (r.source === "lat") score += 3;
    return { ...r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return { clue: scored[0].clue, id: scored[0].id };
}

/**
 * Find clues for multiple answers in batch.
 */
export async function findCluesForAnswers(
  answers: string[],
  language: Language,
  difficulty?: Difficulty
): Promise<Map<string, { clue: string; id: number }>> {
  const result = new Map<string, { clue: string; id: number }>();

  // Batch query all clues for the given answers
  const upperAnswers = answers.map((a) => a.toUpperCase());

  const allClues = await db
    .select({
      id: clueEntries.id,
      answer: clueEntries.answer,
      clue: clueEntries.clue,
      difficulty: clueEntries.difficulty,
      source: clueEntries.source,
    })
    .from(clueEntries)
    .where(
      and(
        sql`${clueEntries.answer} = ANY(${upperAnswers})`,
        eq(clueEntries.language, language)
      )
    );

  // Group by answer
  const grouped = new Map<string, typeof allClues>();
  for (const clue of allClues) {
    if (!grouped.has(clue.answer)) grouped.set(clue.answer, []);
    grouped.get(clue.answer)!.push(clue);
  }

  // Pick best clue per answer
  for (const [answer, clues] of grouped) {
    const scored = clues.map((r) => {
      let score = 0;
      if (difficulty && r.difficulty) {
        score -= Math.abs(r.difficulty - difficulty) * 10;
      }
      if (r.source === "nyt") score += 5;
      if (r.source === "wapo") score += 4;
      return { ...r, score };
    });
    scored.sort((a, b) => b.score - a.score);
    result.set(answer, { clue: scored[0].clue, id: scored[0].id });
  }

  return result;
}

/**
 * Get word frequencies for building the word list (for generation).
 */
export async function getWordFrequencies(
  language: Language
): Promise<{ answer: string; count: number }[]> {
  const result = await db
    .select({
      answer: clueEntries.answer,
      count: sql<number>`count(*)::int`,
    })
    .from(clueEntries)
    .where(eq(clueEntries.language, language))
    .groupBy(clueEntries.answer);

  return result;
}
