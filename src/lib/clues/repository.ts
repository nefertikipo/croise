import { db } from "@/db";
import { clueEntries } from "@/db/schema/clue-entries";
import { eq, and, inArray, sql } from "drizzle-orm";
import type { Language, Difficulty } from "@/types";

/**
 * Find clues for multiple answers in batch.
 */
export async function findCluesForAnswers(
  answers: string[],
  language: Language,
  difficulty?: Difficulty
): Promise<Map<string, { clue: string; id: number }>> {
  const result = new Map<string, { clue: string; id: number }>();
  if (answers.length === 0) return result;

  const upperAnswers = answers.map((a) => a.toUpperCase());

  const allClues = await db
    .select({
      id: clueEntries.id,
      answer: clueEntries.answer,
      clue: clueEntries.clue,
    })
    .from(clueEntries)
    .where(
      and(
        inArray(clueEntries.answer, upperAnswers),
        eq(clueEntries.language, language)
      )
    );

  for (const clue of allClues) {
    if (!result.has(clue.answer)) {
      result.set(clue.answer, { clue: clue.clue, id: clue.id });
    }
  }

  return result;
}

/**
 * Get word frequencies for building the word list (for generation).
 */
export async function getWordFrequencies(
  language: Language
): Promise<{ answer: string; count: number }[]> {
  const frequencies = await db
    .select({
      answer: clueEntries.answer,
      count: sql<number>`count(*)::int`,
    })
    .from(clueEntries)
    .where(eq(clueEntries.language, language))
    .groupBy(clueEntries.answer);

  return frequencies;
}
